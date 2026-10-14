import type { Picks, Snapshot } from "./types";
import { makeRng, dnaOf } from "./rng";
import { maxCombinations } from "./combinatorics";

export interface SampleResult {
  items: Picks[];
  dnas: string[];
  duplicates: number;
  /** NFTs added by exhaustive fill when random sampling saturated */
  filled: number;
  target: number;
  maxCombinations: number;
}

function weightedPick(weights: number[], rng: () => number): number {
  const sum = weights.reduce((s, w) => s + w, 0);
  if (sum <= 0) return Math.floor(rng() * weights.length);
  let r = rng() * sum;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i]!;
    if (r <= 0) return i;
  }
  return weights.length - 1;
}

/**
 * Weighted sampling without replacement (sha256 DNA uniqueness), seeded.
 * Port of forge/engine.py, plus: when rejection sampling saturates, the remaining
 * unique combinations are enumerated and picked by weighted reservoir (A-ES) so the
 * requested supply is always reached when it is feasible.
 */
export function sample(snap: Snapshot, count: number, seed: string): SampleResult {
  const shapes = snap.layers.map((l) => ({ name: l.name, traitCount: l.traits.length, allowNone: l.allowNone }));
  const max = maxCombinations(shapes);
  const target = Math.min(count, max);
  const rng = makeRng(seed);

  // option lists per layer: index -1 = none
  const opts = snap.layers.map((l) => {
    const idx: number[] = l.traits.map((_, i) => i);
    const w: number[] = l.traits.map((t) => Math.max(0, t.weight));
    if (l.allowNone) {
      idx.push(-1);
      w.push(Math.max(0, l.noneWeight));
    }
    return { idx, w };
  });

  const dnaFor = (p: Picks) =>
    dnaOf(snap.layers.map((l, li) => [l.name, p[li]! >= 0 ? l.traits[p[li]!]!.name : null]));

  const seen = new Set<string>();
  const items: Picks[] = [];
  const dnas: string[] = [];
  let duplicates = 0;
  let attempts = 0;
  const maxAttempts = target * 20 + 1000;
  let streak = 0;

  while (items.length < target && attempts < maxAttempts) {
    attempts++;
    const p: Picks = opts.map((o) => (o.idx.length ? o.idx[weightedPick(o.w, rng)]! : -1));
    const dna = dnaFor(p);
    if (seen.has(dna)) {
      duplicates++;
      if (++streak > 2000) break;
      continue;
    }
    streak = 0;
    seen.add(dna);
    items.push(p);
    dnas.push(dna);
  }

  let filled = 0;
  if (items.length < target && max <= 2_000_000) {
    // enumerate every combination not yet used, weighted reservoir: key = u^(1/w)
    const missing = target - items.length;
    const heap: { key: number; p: Picks }[] = [];
    const cur: number[] = Array.from({ length: opts.length }, () => 0);
    const walk = (li: number, w: number) => {
      if (li === opts.length) {
        const p = opts.map((o, i) => (o.idx.length ? o.idx[cur[i]!]! : -1));
        const dna = dnaFor(p);
        if (seen.has(dna)) return;
        const key = Math.pow(rng(), 1 / Math.max(w, 1e-9));
        heap.push({ key, p });
        return;
      }
      const o = opts[li]!;
      if (!o.idx.length) return walk(li + 1, w);
      for (let i = 0; i < o.idx.length; i++) {
        cur[li] = i;
        walk(li + 1, w * (o.w[i]! || 1e-6));
      }
    };
    walk(0, 1);
    heap.sort((a, b) => b.key - a.key);
    for (const { p } of heap.slice(0, missing)) {
      const dna = dnaFor(p);
      seen.add(dna);
      items.push(p);
      dnas.push(dna);
      filled++;
    }
    // shuffle so the filled tail isn't grouped at the end (Fisher-Yates, seeded)
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [items[i], items[j]] = [items[j]!, items[i]!];
      [dnas[i], dnas[j]] = [dnas[j]!, dnas[i]!];
    }
  }

  return { items, dnas, duplicates, filled, target, maxCombinations: max };
}
