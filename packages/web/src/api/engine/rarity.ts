import type { Attribute, Picks, Snapshot } from "./types";
import { gameStats } from "./stats";

export const NONE = "None";

export function traitAttributes(snap: Snapshot, picks: Picks): Attribute[] {
  return snap.layers.map((l, li) => ({
    trait_type: l.name,
    value: (picks[li] ?? -1) >= 0 ? (l.traits[picks[li]!]?.name ?? NONE) : NONE,
  }));
}

export function fullAttributes(snap: Snapshot, picks: Picks): Attribute[] {
  const attrs = traitAttributes(snap, picks);
  const stats = gameStats(snap, picks);
  for (const k of Object.keys(stats).sort()) {
    attrs.push({ trait_type: k.charAt(0).toUpperCase() + k.slice(1), value: stats[k]!, display_type: "number" });
  }
  return attrs;
}

export interface RarityRow {
  edition: number;
  score: number;
  rank: number;
}

/** Σ 1/frequency per trait attribute (stats excluded). Rank 1 = rarest; ties by edition. */
export function computeRarity(snap: Snapshot, items: Picks[]): RarityRow[] {
  const total = items.length;
  if (!total) return [];
  const counts = snap.layers.map((l) => Array.from({ length: l.traits.length + 1 }, () => 0));
  for (const p of items) {
    snap.layers.forEach((_, li) => {
      counts[li]![(p[li] ?? -1) + 1]!++;
    });
  }
  const rows: RarityRow[] = items.map((p, edition) => {
    let score = 0;
    snap.layers.forEach((_, li) => {
      const c = counts[li]![(p[li] ?? -1) + 1]!;
      score += total / c;
    });
    return { edition, score: Math.round(score * 1000) / 1000, rank: 0 };
  });
  const sorted = [...rows].sort((a, b) => b.score - a.score || a.edition - b.edition);
  sorted.forEach((r, i) => (r.rank = i + 1));
  return rows;
}

export interface DistRow {
  layer: string;
  trait: string;
  traitId: string | null;
  count: number;
  percent: number;
  targetPercent: number;
}

export function traitDistribution(snap: Snapshot, items: Picks[]): DistRow[] {
  const total = items.length || 1;
  const out: DistRow[] = [];
  snap.layers.forEach((l, li) => {
    const counts = Array.from({ length: l.traits.length + 1 }, () => 0);
    for (const p of items) counts[(p[li] ?? -1) + 1]!++;
    const wsum = l.traits.reduce((s, t) => s + Math.max(0, t.weight), 0) + (l.allowNone ? l.noneWeight : 0) || 1;
    if (l.allowNone)
      out.push({ layer: l.name, trait: NONE, traitId: null, count: counts[0]!, percent: (counts[0]! / total) * 100, targetPercent: (l.noneWeight / wsum) * 100 });
    l.traits.forEach((t, ti) =>
      out.push({ layer: l.name, trait: t.name, traitId: t.id, count: counts[ti + 1]!, percent: (counts[ti + 1]! / total) * 100, targetPercent: (Math.max(0, t.weight) / wsum) * 100 }),
    );
  });
  return out;
}

/** rarity_report.json (Seeker format). */
export function rarityReport(name: string, snap: Snapshot, items: Picks[]) {
  const dist: Record<string, { count: number; frequency_pct: number }> = {};
  for (const r of traitDistribution(snap, items)) {
    dist[`${r.layer}: ${r.trait}`] = { count: r.count, frequency_pct: Math.round(r.percent * 100) / 100 };
  }
  return { collection: name, total_supply: items.length, trait_distribution: dist };
}
