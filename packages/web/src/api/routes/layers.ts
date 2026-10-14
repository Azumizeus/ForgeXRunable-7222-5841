import { z } from "zod";
import { asc, eq } from "drizzle-orm";
import { authed } from "../middleware/auth";
import { db } from "../database";
import { collections, layers as layersT, traits } from "../database/schema";
import { ownCollection, ownLayer } from "../lib/own";
import { BLEND_MODES } from "../lib/composer";

const touch = (collectionId: string) => db.update(collections).set({ updatedAt: new Date() }).where(eq(collections.id, collectionId));

export const layers = {
  blendModes: authed.handler(() => BLEND_MODES),

  create: authed
    .input(z.object({ collectionId: z.string(), name: z.string().min(1).max(40) }))
    .handler(async ({ input, context }) => {
      await ownCollection(context.user.id, input.collectionId);
      const existing = await db.select({ p: layersT.position }).from(layersT).where(eq(layersT.collectionId, input.collectionId));
      const id = crypto.randomUUID();
      await db.insert(layersT).values({
        id,
        collectionId: input.collectionId,
        name: input.name.trim(),
        position: existing.reduce((m, r) => Math.max(m, r.p + 1), 0),
      });
      await touch(input.collectionId);
      return { id };
    }),

  update: authed
    .input(
      z.object({
        id: z.string(),
        patch: z.object({
          name: z.string().min(1).max(40).optional(),
          allowNone: z.boolean().optional(),
          noneWeight: z.number().int().min(0).max(10000).optional(),
          blendMode: z.enum(BLEND_MODES as [string, ...string[]]).optional(),
          opacity: z.number().int().min(0).max(100).optional(),
        }),
      }),
    )
    .handler(async ({ input, context }) => {
      const { layer } = await ownLayer(context.user.id, input.id);
      await db.update(layersT).set(input.patch).where(eq(layersT.id, layer.id));
      await touch(layer.collectionId);
      return { ok: true };
    }),

  remove: authed.input(z.object({ id: z.string() })).handler(async ({ input, context }) => {
    const { layer } = await ownLayer(context.user.id, input.id);
    await db.delete(traits).where(eq(traits.layerId, layer.id));
    await db.delete(layersT).where(eq(layersT.id, layer.id));
    await touch(layer.collectionId);
    return { ok: true };
  }),

  /** ids in back→front order */
  reorder: authed
    .input(z.object({ collectionId: z.string(), ids: z.array(z.string()).max(50) }))
    .handler(async ({ input, context }) => {
      await ownCollection(context.user.id, input.collectionId);
      const rows = await db.select({ id: layersT.id }).from(layersT).where(eq(layersT.collectionId, input.collectionId)).orderBy(asc(layersT.position));
      const valid = new Set(rows.map((r) => r.id));
      let pos = 0;
      for (const id of input.ids) if (valid.has(id)) await db.update(layersT).set({ position: pos++ }).where(eq(layersT.id, id));
      await touch(input.collectionId);
      return { ok: true };
    }),
};
