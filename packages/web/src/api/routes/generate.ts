import { z } from "zod";
import { eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { authed } from "../middleware/auth";
import { tr } from "../lib/i18n";
import { db } from "../database";
import { collections, generations } from "../database/schema";
import { loadTree, ownCollection, parse, toSnapshot } from "../lib/own";
import { invalidateGen, loadGen } from "../lib/genCache";
import { feasibility } from "../engine/combinatorics";
import { sample } from "../engine/sampler";
import { fullAttributes, traitDistribution } from "../engine/rarity";
import { gameStats } from "../engine/stats";
import { tokenMetadata } from "../engine/metadata";

async function currentGen(userId: string, collectionId: string) {
  await ownCollection(userId, collectionId);
  const [g] = await db.select({ id: generations.id }).from(generations).where(eq(generations.collectionId, collectionId));
  if (!g) throw new ORPCError("NOT_FOUND", { message: tr("Aucune génération pour cette collection", "No generation for this collection") });
  const gen = await loadGen(g.id);
  if (!gen) throw new ORPCError("NOT_FOUND", { message: tr("Génération introuvable", "Generation not found") });
  return gen;
}

export const generate = {
  feasibility: authed.input(z.object({ collectionId: z.string(), size: z.number().int().min(1).max(50000).optional() })).handler(async ({ input, context }) => {
    const c = await ownCollection(context.user.id, input.collectionId);
    const tree = await loadTree(c.id);
    return feasibility(
      tree.map((l) => ({ name: l.name, traitCount: l.traits.length, allowNone: l.allowNone })),
      input.size ?? c.size,
    );
  }),

  run: authed
    .input(z.object({ collectionId: z.string(), seed: z.string().max(80).optional() }))
    .handler(async ({ input, context }) => {
      const c = await ownCollection(context.user.id, input.collectionId);
      const tree = await loadTree(c.id);
      const f = feasibility(tree.map((l) => ({ name: l.name, traitCount: l.traits.length, allowNone: l.allowNone })), c.size);
      if (f.level === "impossible") throw new ORPCError("BAD_REQUEST", { message: f.recommendation });
      const seed = input.seed?.trim() || c.seed || crypto.randomUUID().slice(0, 8);
      const snap = toSnapshot(tree, c.gameStats);
      const t0 = performance.now();
      const res = sample(snap, c.size, seed);
      const elapsedMs = Math.round(performance.now() - t0);

      const [old] = await db.select({ id: generations.id }).from(generations).where(eq(generations.collectionId, c.id));
      if (old) {
        await db.delete(generations).where(eq(generations.id, old.id));
        invalidateGen(old.id);
      }
      const id = crypto.randomUUID();
      await db.insert(generations).values({
        id,
        collectionId: c.id,
        seed,
        requested: c.size,
        generated: res.items.length,
        duplicates: res.duplicates,
        filled: res.filled,
        elapsedMs,
        snapshot: JSON.stringify(snap),
        items: JSON.stringify(res.items),
      });
      await db.update(collections).set({ seed, status: "generated", updatedAt: new Date() }).where(eq(collections.id, c.id));
      return {
        id,
        seed,
        requested: c.size,
        generated: res.items.length,
        duplicates: res.duplicates,
        filled: res.filled,
        elapsedMs,
        maxCombinations: res.maxCombinations,
        capped: res.items.length < c.size,
      };
    }),

  nfts: authed
    .input(
      z.object({
        collectionId: z.string(),
        page: z.number().int().min(0).default(0),
        pageSize: z.number().int().min(1).max(120).default(48),
        sort: z.enum(["edition", "rarest", "common"]).default("edition"),
        /** filter: traitId, or "none:<layerId>" */
        trait: z.string().optional(),
        search: z.string().max(10).optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const gen = await currentGen(context.user.id, input.collectionId);
      let order: number[] =
        input.sort === "rarest" ? gen.byRank : input.sort === "common" ? [...gen.byRank].reverse() : gen.items.map((_, i) => i);
      if (input.trait) {
        let li = -1;
        let ti = -2;
        if (input.trait.startsWith("none:")) {
          li = gen.snap.layers.findIndex((l) => l.id === input.trait!.slice(5));
          ti = -1;
        } else {
          gen.snap.layers.forEach((l, i) => {
            const k = l.traits.findIndex((t) => t.id === input.trait);
            if (k >= 0) [li, ti] = [i, k];
          });
        }
        order = li < 0 ? [] : order.filter((e) => gen.items[e]![li] === ti);
      }
      if (input.search) {
        const n = Number.parseInt(input.search.replace("#", ""), 10);
        order = Number.isFinite(n) ? order.filter((e) => e + 1 === n) : [];
      }
      const total = order.length;
      const slice = order.slice(input.page * input.pageSize, (input.page + 1) * input.pageSize);
      return {
        generationId: gen.id,
        total,
        totalSupply: gen.items.length,
        items: slice.map((e) => ({
          edition: e,
          rank: gen.rarity[e]!.rank,
          score: gen.rarity[e]!.score,
          image: `/api/render/${gen.id}/${e}?s=360`,
        })),
      };
    }),

  nft: authed.input(z.object({ collectionId: z.string(), edition: z.number().int().min(0) })).handler(async ({ input, context }) => {
    const gen = await currentGen(context.user.id, input.collectionId);
    const picks = gen.items[input.edition];
    if (!picks) throw new ORPCError("NOT_FOUND", { message: tr("NFT introuvable", "NFT not found") });
    const c = await ownCollection(context.user.id, input.collectionId);
    const meta = tokenMetadata(
      {
        name: c.name,
        symbol: c.symbol,
        description: c.description,
        externalUrl: c.externalUrl,
        royaltyBps: c.royaltyBps,
        creators: parse(c.creators, []),
      },
      gen.snap,
      input.edition,
      picks,
    );
    return {
      edition: input.edition,
      rank: gen.rarity[input.edition]!.rank,
      score: gen.rarity[input.edition]!.score,
      total: gen.items.length,
      attributes: fullAttributes(gen.snap, picks),
      stats: gameStats(gen.snap, picks),
      image: `/api/render/${gen.id}/${input.edition}?s=1024`,
      metadata: meta,
    };
  }),

  rarity: authed.input(z.object({ collectionId: z.string() })).handler(async ({ input, context }) => {
    const gen = await currentGen(context.user.id, input.collectionId);
    const dist = traitDistribution(gen.snap, gen.items);
    const scores = gen.rarity.map((r) => r.score);
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    const bins = 24;
    const hist = Array.from({ length: bins }, () => 0);
    for (const s of scores) hist[Math.min(bins - 1, Math.floor(((s - min) / (max - min || 1)) * bins))]!++;
    const tiers = [
      { name: "Légendaire", pct: 1 },
      { name: "Épique", pct: 5 },
      { name: "Rare", pct: 15 },
      { name: "Peu commun", pct: 35 },
      { name: "Commun", pct: 100 },
    ].map((t) => ({ ...t, upToRank: Math.max(1, Math.round((t.pct / 100) * gen.items.length)) }));
    return {
      generationId: gen.id,
      total: gen.items.length,
      layers: gen.snap.layers.map((l) => ({ id: l.id, name: l.name })),
      distribution: dist,
      histogram: hist.map((count, i) => ({ score: Math.round(min + ((max - min) * (i + 0.5)) / bins), count })),
      minScore: min,
      maxScore: max,
      tiers,
      top: gen.byRank.slice(0, 12).map((e) => ({ edition: e, rank: gen.rarity[e]!.rank, score: gen.rarity[e]!.score, image: `/api/render/${gen.id}/${e}?s=360` })),
    };
  }),

  /** Quick live preview of N random combos without saving (layer editor). */
  preview: authed.input(z.object({ collectionId: z.string(), count: z.number().int().min(1).max(12).default(6), seed: z.string().optional() })).handler(async ({ input, context }) => {
    const c = await ownCollection(context.user.id, input.collectionId);
    const tree = await loadTree(c.id);
    const snap = toSnapshot(tree, c.gameStats);
    const f = feasibility(tree.map((l) => ({ name: l.name, traitCount: l.traits.length, allowNone: l.allowNone })), input.count);
    if (f.level === "impossible") return { items: [] };
    const res = sample(snap, input.count, input.seed ?? crypto.randomUUID());
    return {
      items: res.items.map((p) => ({
        picks: p,
        attributes: fullAttributes(snap, p),
        image: `/api/preview/${c.id}?p=${p.join(",")}&s=320`,
      })),
    };
  }),
};
