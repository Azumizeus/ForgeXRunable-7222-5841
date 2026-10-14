import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { authed } from "../middleware/auth";
import { tr } from "../lib/i18n";
import { db } from "../database";
import { collections, exportsTable, generations } from "../database/schema";
import { ownCollection } from "../lib/own";
import { presignGet } from "../lib/s3";
import { requireQuota } from "../lib/billing";
import { isExportActive, runExport } from "../lib/exporter";

const RUNNING = new Set(["queued", "rendering", "uploading"]);

export const exports = {
  start: authed.input(z.object({ collectionId: z.string() })).handler(async ({ input, context }) => {
    const c = await ownCollection(context.user.id, input.collectionId);
    const [g] = await db.select({ id: generations.id, generated: generations.generated }).from(generations).where(eq(generations.collectionId, c.id));
    if (!g) throw new ORPCError("BAD_REQUEST", { message: tr("Générez la collection avant d'exporter.", "Generate the collection before exporting.") });
    const running = await db
      .select({ id: exportsTable.id, status: exportsTable.status })
      .from(exportsTable)
      .where(and(eq(exportsTable.collectionId, c.id), eq(exportsTable.userId, context.user.id)));
    const active = running.find((r) => RUNNING.has(r.status) && isExportActive(r.id));
    if (active) return { id: active.id };
    await requireQuota(context.user.id, "nft_exports", g.generated);
    const id = crypto.randomUUID();
    await db.insert(exportsTable).values({ id, collectionId: c.id, generationId: g.id, userId: context.user.id, total: g.generated, status: "queued" });
    void runExport(id).catch((e) => console.error("[export]", e));
    return { id };
  }),

  list: authed.input(z.object({ collectionId: z.string() })).handler(async ({ input, context }) => {
    await ownCollection(context.user.id, input.collectionId);
    return db
      .select()
      .from(exportsTable)
      .where(and(eq(exportsTable.collectionId, input.collectionId), eq(exportsTable.userId, context.user.id)))
      .orderBy(desc(exportsTable.createdAt))
      .limit(10);
  }),

  status: authed.input(z.object({ id: z.string() })).handler(async ({ input, context }) => {
    const [e] = await db.select().from(exportsTable).where(and(eq(exportsTable.id, input.id), eq(exportsTable.userId, context.user.id)));
    if (!e) throw new ORPCError("NOT_FOUND", { message: tr("Export introuvable", "Export not found") });
    if (RUNNING.has(e.status) && !isExportActive(e.id) && Date.now() - e.createdAt.getTime() > 15_000) {
      const patch = { status: "error", error: tr("Export interrompu (redémarrage serveur). Relancez-le : rien n'a été décompté.", "Export interrupted (server restart). Run it again: nothing was charged.") };
      await db.update(exportsTable).set(patch).where(eq(exportsTable.id, e.id));
      return { ...e, ...patch };
    }
    return e;
  }),

  download: authed.input(z.object({ id: z.string() })).handler(async ({ input, context }) => {
    const [e] = await db.select().from(exportsTable).where(and(eq(exportsTable.id, input.id), eq(exportsTable.userId, context.user.id)));
    if (!e || e.status !== "done" || !e.fileKey) throw new ORPCError("NOT_FOUND", { message: tr("Export non disponible", "Export not available") });
    const [c] = await db.select({ symbol: collections.symbol, name: collections.name }).from(collections).where(eq(collections.id, e.collectionId));
    const slug = (c?.symbol || c?.name || "collection").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    return { url: await presignGet(e.fileKey, 3600, `${slug}-forge-x.zip`) };
  }),
};
