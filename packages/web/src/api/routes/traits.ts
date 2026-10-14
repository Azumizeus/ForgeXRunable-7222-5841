import { z } from "zod";
import { asc, eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { generateText } from "ai";
import dedent from "dedent";
import { authed } from "../middleware/auth";
import { tr } from "../lib/i18n";
import { db } from "../database";
import { traits as traitsT } from "../database/schema";
import { fileUrl, loadTree, ownLayer, ownTrait, toSnapshot } from "../lib/own";
import { getObjectBuffer, presignPut, putObject } from "../lib/s3";
import { chromaKey, normalizeImage, renderNft } from "../lib/composer";
import { gateway } from "../lib/gateway";
import { requireQuota, trackUsage } from "../lib/billing";
import { demoTraitRows } from "./collections";

const ALLOWED = ["image/png", "image/webp", "image/jpeg", "image/gif", "image/svg+xml"];
const cleanName = (s: string) =>
  s
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40) || "Trait";

async function storeTrait(collectionId: string, layerId: string, name: string, png: Buffer, source: string, weight = 10) {
  const id = crypto.randomUUID();
  const key = `traits/${collectionId}/${id}.png`;
  await putObject(key, png, "image/png");
  const row = { id, layerId, collectionId, name, weight, imageKey: key, source, stats: "{}", transform: "{}" };
  await db.insert(traitsT).values(row);
  return { ...row, stats: {}, transform: { x: 0, y: 0, scale: 100 }, url: fileUrl(key) };
}

export const traits = {
  /** Step 1 of upload: direct-to-Tigris presigned PUT. */
  presign: authed
    .input(z.object({ layerId: z.string(), filename: z.string().max(200), contentType: z.string() }))
    .handler(async ({ input, context }) => {
      const { layer } = await ownLayer(context.user.id, input.layerId);
      if (!ALLOWED.includes(input.contentType)) throw new ORPCError("BAD_REQUEST", { message: tr("Format non supporté (PNG, WEBP, JPG, GIF, SVG)", "Unsupported format (PNG, WEBP, JPG, GIF, SVG)") });
      const key = `uploads/${layer.collectionId}/${crypto.randomUUID()}`;
      return { url: await presignPut(key, input.contentType), key };
    }),

  /** Step 2: normalize to RGBA PNG and register the trait. */
  confirm: authed
    .input(z.object({ layerId: z.string(), key: z.string(), filename: z.string().max(200) }))
    .handler(async ({ input, context }) => {
      const { layer } = await ownLayer(context.user.id, input.layerId);
      if (!input.key.startsWith(`uploads/${layer.collectionId}/`)) throw new ORPCError("FORBIDDEN", { message: tr("Clé invalide", "Invalid key") });
      let png: Buffer;
      try {
        png = await normalizeImage(await getObjectBuffer(input.key));
      } catch {
        throw new ORPCError("BAD_REQUEST", { message: tr(`Image illisible : ${input.filename}`, `Unreadable image: ${input.filename}`) });
      }
      return storeTrait(layer.collectionId, layer.id, cleanName(input.filename), png, "upload");
    }),

  demo: authed.input(z.object({ layerId: z.string(), count: z.number().int().min(1).max(8).default(4) })).handler(async ({ input, context }) => {
    const { layer } = await ownLayer(context.user.id, input.layerId);
    const rows = await demoTraitRows(layer.collectionId, layer.id, layer.name, input.count);
    await db.insert(traitsT).values(rows);
    return { added: rows.length };
  }),

  /** AI trait via the Runable gateway (Gemini image). Consumes ai_traits quota. */
  generateAi: authed
    .input(
      z.object({
        layerId: z.string(),
        prompt: z.string().min(3).max(600),
        name: z.string().max(40).optional(),
        mode: z.enum(["isolated", "background"]).default("isolated"),
        useReference: z.boolean().default(true),
      }),
    )
    .handler(async ({ input, context }) => {
      const { layer, collection } = await ownLayer(context.user.id, input.layerId);
      await requireQuota(context.user.id, "ai_traits", 1);

      // Reference = composite of one trait per lower layer, to keep framing and style coherent.
      let reference: Buffer | null = null;
      if (input.useReference && input.mode === "isolated") {
        const tree = await loadTree(collection.id);
        const below = tree.filter((l) => l.position < layer.position && l.traits.length);
        if (below.length) {
          const snap = toSnapshot(below, collection.gameStats);
          reference = await renderNft(snap, snap.layers.map(() => 0), 768, 768).catch(() => null);
        }
      }

      const style = collection.description ? `Collection style/context: ${collection.description}` : "";
      const instructions =
        input.mode === "background"
          ? dedent`Create a full-bleed square 1:1 background image for an NFT collection layer named "${layer.name}".
              ${style}
              Subject: ${input.prompt}
              Fill the entire canvas edge to edge. No characters, no text, no watermark, no border.`
          : dedent`Create ONE isolated element for an NFT trait layer named "${layer.name}" (generative art, layered PNG).
              ${style}
              Element: ${input.prompt}
              Square 1:1 canvas. The background MUST be a perfectly flat, uniform chroma-key green (#00FF00) with no gradient, no shadow, no floor.
              Do not use any green in the element itself. No text, no watermark, no border.
              ${reference ? "The attached image is the character this element will be layered onto: draw ONLY the new element, at the exact size and position it would occupy on that character, matching its art style, line weight and palette. Do NOT redraw the character." : "Center the element with comfortable margins."}`;

      let result;
      try {
        result = await generateText({
          model: gateway("google/gemini-3-pro-image"),
          providerOptions: { google: { responseModalities: ["TEXT", "IMAGE"] } },
          messages: [
            {
              role: "user",
              content: reference
                ? [
                    { type: "file", data: new Uint8Array(reference), mediaType: "image/png" },
                    { type: "text", text: instructions },
                  ]
                : [{ type: "text", text: instructions }],
            },
          ],
        });
      } catch (e) {
        console.error("[ai trait]", e);
        throw new ORPCError("BAD_GATEWAY", { message: tr("Le moteur IA n'a pas répondu. Réessayez dans un instant.", "The AI engine did not respond. Try again in a moment.") });
      }
      const file = result.files?.find((f) => f.mediaType.startsWith("image/"));
      if (!file) throw new ORPCError("BAD_GATEWAY", { message: tr("Aucune image renvoyée par l'IA. Reformulez le prompt.", "The AI returned no image. Rephrase the prompt.") });
      let png = await normalizeImage(Buffer.from(file.uint8Array));
      if (input.mode === "isolated") png = await chromaKey(png);
      const name = input.name?.trim() || cleanName(input.prompt.split(/[,.]/)[0]!.split(" ").slice(0, 4).join(" "));
      const t = await storeTrait(collection.id, layer.id, name, png, "ai");
      await trackUsage(context.user.id, "ai_traits", 1);
      return t;
    }),

  update: authed
    .input(
      z.object({
        id: z.string(),
        patch: z.object({
          name: z.string().min(1).max(40).optional(),
          weight: z.number().int().min(0).max(10000).optional(),
          stats: z.record(z.string(), z.number().min(-100).max(100)).optional(),
          transform: z.object({ x: z.number().min(-100).max(100), y: z.number().min(-100).max(100), scale: z.number().min(5).max(400) }).optional(),
        }),
      }),
    )
    .handler(async ({ input, context }) => {
      const t = await ownTrait(context.user.id, input.id);
      const { stats, transform, ...rest } = input.patch;
      await db
        .update(traitsT)
        .set({ ...rest, ...(stats ? { stats: JSON.stringify(stats) } : {}), ...(transform ? { transform: JSON.stringify(transform) } : {}) })
        .where(eq(traitsT.id, t.id));
      return { ok: true };
    }),

  /** Set weights for many traitsT at once (rarity presets). */
  bulkWeights: authed
    .input(z.object({ layerId: z.string(), weights: z.array(z.object({ id: z.string(), weight: z.number().int().min(0).max(10000) })).max(200) }))
    .handler(async ({ input, context }) => {
      const { layer } = await ownLayer(context.user.id, input.layerId);
      const rows = await db.select({ id: traitsT.id }).from(traitsT).where(eq(traitsT.layerId, layer.id)).orderBy(asc(traitsT.createdAt));
      const ok = new Set(rows.map((r) => r.id));
      for (const w of input.weights) if (ok.has(w.id)) await db.update(traitsT).set({ weight: w.weight }).where(eq(traitsT.id, w.id));
      return { ok: true };
    }),

  move: authed.input(z.object({ id: z.string(), layerId: z.string() })).handler(async ({ input, context }) => {
    const t = await ownTrait(context.user.id, input.id);
    const { layer } = await ownLayer(context.user.id, input.layerId);
    if (layer.collectionId !== t.collectionId) throw new ORPCError("BAD_REQUEST", { message: tr("Calque d'une autre collection", "Layer belongs to another collection") });
    await db.update(traitsT).set({ layerId: layer.id }).where(eq(traitsT.id, t.id));
    return { ok: true };
  }),

  remove: authed.input(z.object({ id: z.string() })).handler(async ({ input, context }) => {
    const t = await ownTrait(context.user.id, input.id);
    // image kept in storage: past generations keep rendering
    await db.delete(traitsT).where(eq(traitsT.id, t.id));
    return { ok: true };
  }),
};
