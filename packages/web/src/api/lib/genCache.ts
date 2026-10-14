import { eq } from "drizzle-orm";
import { db } from "../database";
import { generations } from "../database/schema";
import { computeRarity, type RarityRow } from "../engine/rarity";
import type { Picks, Snapshot } from "../engine/types";
import { parse } from "./own";

export interface LoadedGen {
  id: string;
  collectionId: string;
  seed: string;
  snap: Snapshot;
  items: Picks[];
  rarity: RarityRow[];
  /** editions sorted by rank (rarest first) */
  byRank: number[];
}

const cache = new Map<string, LoadedGen>();

export function invalidateGen(id: string) {
  cache.delete(id);
}

export async function loadGen(id: string): Promise<LoadedGen | null> {
  const hit = cache.get(id);
  if (hit) return hit;
  const [g] = await db.select().from(generations).where(eq(generations.id, id));
  if (!g) return null;
  const snap = parse<Snapshot>(g.snapshot, { layers: [], baseStats: {} });
  const items = parse<Picks[]>(g.items, []);
  const rarity = computeRarity(snap, items);
  const byRank = [...rarity].sort((a, b) => a.rank - b.rank).map((r) => r.edition);
  const out: LoadedGen = { id: g.id, collectionId: g.collectionId, seed: g.seed, snap, items, rarity, byRank };
  cache.set(id, out);
  if (cache.size > 30) cache.delete(cache.keys().next().value!);
  return out;
}
