import type { Picks, Snapshot } from "./types";

/** Game stats (feat Seeker): base + per-trait bonuses, clamped to [0, 100]. */
export function gameStats(snap: Snapshot, picks: Picks): Record<string, number> {
  const base = snap.baseStats ?? {};
  if (!Object.keys(base).length && !snap.layers.some((l) => l.traits.some((t) => Object.keys(t.stats).length)))
    return {};
  const stats: Record<string, number> = { ...base };
  snap.layers.forEach((layer, li) => {
    const idx = picks[li] ?? -1;
    if (idx < 0) return;
    const t = layer.traits[idx];
    if (!t) return;
    for (const [k, v] of Object.entries(t.stats)) {
      stats[k] = Math.max(0, Math.min(100, (stats[k] ?? 0) + v));
    }
  });
  return stats;
}
