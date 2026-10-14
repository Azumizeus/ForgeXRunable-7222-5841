import { z } from "zod";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import sharp from "sharp";
import { authed } from "../middleware/auth";
import { tr } from "../lib/i18n";
import { db } from "../database";
import { actionPlans, collections as collectionsT, exportsTable, generations, layers, traits } from "../database/schema";
import { fileUrl, loadTree, ownCollection, parse } from "../lib/own";
import { putObject } from "../lib/s3";
import { DEMO_BASE_STATS, DEMO_KIT, demoTraitsFor } from "../lib/demoKit";

const creatorSchema = z.object({ address: z.string().max(64), share: z.number().int().min(0).max(100) });
const candySchema = z.object({
  price: z.number().min(0).max(1000).default(0.5),
  treasury: z.string().max(64).default(""),
  goLiveDate: z.string().nullable().default(null),
  tokenStandard: z.enum(["nft", "pnft"]).default("nft"),
  isSequential: z.boolean().default(false),
  botTax: z.boolean().default(true),
});
export type CandySettings = z.infer<typeof candySchema>;
/** Patch shape: NO defaults (zod 4 applies defaults inside .partial(), which would reset untouched fields). */
const candyPatchSchema = z
  .object({
    price: z.number().min(0).max(1000),
    treasury: z.string().max(64),
    goLiveDate: z.string().nullable(),
    tokenStandard: z.enum(["nft", "pnft"]),
    isSequential: z.boolean(),
    botTax: z.boolean(),
  })
  .partial();
export const defaultCandy = (): CandySettings => candySchema.parse({});

const patchSchema = z.object({
  name: z.string().min(1).max(32).optional(),
  symbol: z.string().min(1).max(10).optional(),
  description: z.string().max(2000).optional(),
  externalUrl: z.string().max(300).optional(),
  size: z.number().int().min(1).max(50000).optional(),
  network: z.enum(["devnet", "mainnet-beta"]).optional(),
  width: z.number().int().min(128).max(4096).optional(),
  height: z.number().int().min(128).max(4096).optional(),
  royaltyBps: z.number().int().min(0).max(10000).optional(),
  creators: z.array(creatorSchema).max(5).optional(),
  seed: z.string().max(80).optional(),
  baseStats: z.record(z.string(), z.number().min(0).max(100)).optional(),
  candy: candyPatchSchema.optional(),
});

/** Uploads a procedural demo trait and returns the row to insert. */
export async function demoTraitRows(collectionId: string, layerId: string, layerName: string, count = 5) {
  const list = demoTraitsFor(layerName, count);
  return Promise.all(
    list.map(async (t) => {
      const id = crypto.randomUUID();
      const key = `traits/${collectionId}/${id}.png`;
      const png = await sharp(Buffer.from(t.svg)).png().toBuffer();
      await putObject(key, png, "image/png");
      return { id, layerId, collectionId, name: t.name, weight: t.weight, imageKey: key, source: "demo", stats: JSON.stringify(t.stats ?? {}) };
    }),
  );
}

function serialize(c: typeof collectionsT.$inferSelect) {
  return {
    ...c,
    creators: parse<{ address: string; share: number }[]>(c.creators, []),
    baseStats: parse<{ base?: Record<string, number> }>(c.gameStats, {}).base ?? {},
    candy: { ...defaultCandy(), ...parse<Partial<CandySettings>>(c.candy, {}) },
  };
}

export const collections = {
  list: authed.handler(async ({ context }) => {
    const rows = await db.select().from(collectionsT).where(eq(collectionsT.userId, context.user.id)).orderBy(desc(collectionsT.updatedAt));
    if (!rows.length) return [];
    const ids = rows.map((r) => r.id);
    const layerCounts = await db
      .select({ id: layers.collectionId, n: sql<number>`count(*)` })
      .from(layers)
      .where(inArray(layers.collectionId, ids))
      .groupBy(layers.collectionId);
    const traitCounts = await db
      .select({ id: traits.collectionId, n: sql<number>`count(*)` })
      .from(traits)
      .where(inArray(traits.collectionId, ids))
      .groupBy(traits.collectionId);
    const gens = await db
      .select({ id: generations.id, collectionId: generations.collectionId, generated: generations.generated })
      .from(generations)
      .where(inArray(generations.collectionId, ids));
    return rows.map((r) => {
      const g = gens.find((x) => x.collectionId === r.id);
      return {
        id: r.id,
        name: r.name,
        symbol: r.symbol,
        size: r.size,
        network: r.network,
        status: r.status,
        updatedAt: r.updatedAt,
        layers: Number(layerCounts.find((x) => x.id === r.id)?.n ?? 0),
        traits: Number(traitCounts.find((x) => x.id === r.id)?.n ?? 0),
        generated: g?.generated ?? 0,
        cover: g ? `/api/render/${g.id}/0?s=320` : null,
      };
    });
  }),

  create: authed
    .input(z.object({ name: z.string().min(1).max(32).default("My collection"), demo: z.boolean().default(false) }))
    .handler(async ({ input, context }) => {
      const id = crypto.randomUUID();
      await db.insert(collectionsT).values({
        id,
        userId: context.user.id,
        name: input.demo ? "Forge Pilots" : input.name,
        symbol: input.demo ? "FPLT" : "NFT",
        description: input.demo ? tr("Collection de démo générée avec Forge-X : pilotes mécas procéduraux pour Solana.", "Demo collection made with Forge-X: procedural mech pilots for Solana.") : "",
        size: input.demo ? 500 : 100,
        seed: crypto.randomUUID().slice(0, 8),
        gameStats: JSON.stringify({ base: input.demo ? DEMO_BASE_STATS : {} }),
        candy: JSON.stringify(defaultCandy()),
      });
      if (input.demo) {
        for (let i = 0; i < DEMO_KIT.length; i++) {
          const k = DEMO_KIT[i]!;
          const name = tr(...k.name);
          const layerId = crypto.randomUUID();
          await db.insert(layers).values({ id: layerId, collectionId: id, name, position: i, allowNone: k.allowNone, noneWeight: k.noneWeight });
          const rows = await demoTraitRows(id, layerId, name);
          await db.insert(traits).values(rows);
        }
      }
      return { id };
    }),

  get: authed.input(z.object({ id: z.string() })).handler(async ({ input, context }) => {
    const c = await ownCollection(context.user.id, input.id);
    const tree = await loadTree(c.id);
    const [gen] = await db
      .select({
        id: generations.id,
        seed: generations.seed,
        requested: generations.requested,
        generated: generations.generated,
        duplicates: generations.duplicates,
        filled: generations.filled,
        elapsedMs: generations.elapsedMs,
        createdAt: generations.createdAt,
      })
      .from(generations)
      .where(eq(generations.collectionId, c.id));
    const [plan] = await db.select().from(actionPlans).where(eq(actionPlans.collectionId, c.id));
    return {
      collection: serialize(c),
      layers: tree.map((l) => ({
        ...l,
        traits: l.traits.map((t) => ({ ...t, stats: parse<Record<string, number>>(t.stats, {}), transform: { x: 0, y: 0, scale: 100, ...parse<object>(t.transform, {}) }, url: fileUrl(t.imageKey) })),
      })),
      generation: gen ?? null,
      plan: plan?.content ?? null,
    };
  }),

  update: authed.input(z.object({ id: z.string(), patch: patchSchema })).handler(async ({ input, context }) => {
    const c = await ownCollection(context.user.id, input.id);
    const { creators, baseStats, candy, ...rest } = input.patch;
    const set: Partial<typeof collectionsT.$inferInsert> = { ...rest, updatedAt: new Date() };
    if (creators) set.creators = JSON.stringify(creators);
    if (baseStats) set.gameStats = JSON.stringify({ base: baseStats });
    if (rest.symbol) set.symbol = rest.symbol.toUpperCase();
    // candy is merged atomically in SQL so concurrent autosaves of different fields never clobber each other
    const candyPatch = candy ? Object.fromEntries(Object.entries(candy).filter(([, v]) => v !== undefined)) : null;
    await db
      .update(collectionsT)
      .set({
        ...set,
        ...(candyPatch && Object.keys(candyPatch).length
          ? {
              candy: sql`json_set(json_patch(${JSON.stringify(defaultCandy())}, coalesce(${collectionsT.candy}, '{}')), ${sql.join(
                Object.entries(candyPatch).map(([k, v]) => sql`${`$.${k}`}, json(${JSON.stringify(v)})`),
                sql`, `,
              )})`,
            }
          : {}),
      })
      .where(eq(collectionsT.id, c.id));
    return { ok: true };
  }),

  remove: authed.input(z.object({ id: z.string() })).handler(async ({ input, context }) => {
    const c = await ownCollection(context.user.id, input.id);
    await db.delete(traits).where(eq(traits.collectionId, c.id));
    await db.delete(layers).where(eq(layers.collectionId, c.id));
    await db.delete(generations).where(eq(generations.collectionId, c.id));
    await db.delete(actionPlans).where(eq(actionPlans.collectionId, c.id));
    await db.delete(exportsTable).where(and(eq(exportsTable.collectionId, c.id), eq(exportsTable.userId, context.user.id)));
    await db.delete(collectionsT).where(eq(collectionsT.id, c.id));
    return { ok: true };
  }),
};
