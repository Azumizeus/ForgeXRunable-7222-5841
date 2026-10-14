import { nf, tr } from "../lib/i18n";
// Pure — shared by API and web UI. Port of forge/combinatorics.py
export interface LayerShape {
  name: string;
  traitCount: number;
  allowNone: boolean;
}

export interface Feasibility {
  feasible: boolean;
  maxCombinations: number;
  requested: number;
  ratio: number;
  level: "impossible" | "over" | "high" | "ok" | "comfortable";
  recommendation: string;
}

export function maxCombinations(layers: LayerShape[]): number {
  if (!layers.length) return 0;
  let product = 1;
  for (const l of layers) {
    if (l.traitCount === 0) {
      if (!l.allowNone) return 0;
      continue;
    }
    product *= l.traitCount + (l.allowNone ? 1 : 0);
    if (product > Number.MAX_SAFE_INTEGER) return Number.MAX_SAFE_INTEGER;
  }
  return product;
}

const pct = (r: number) => `${(r * 100).toFixed(1)}%`;
const fmt = nf;

export function feasibility(layers: LayerShape[], requestedSize: number): Feasibility {
  const max = maxCombinations(layers);
  const requested = Math.max(0, Math.floor(requestedSize));
  const ratio = max > 0 ? requested / max : 0;
  const feasible = max > 0 && requested <= max;
  let level: Feasibility["level"];
  let recommendation: string;
  if (max <= 0) {
    level = "impossible";
    recommendation =
      tr(
      "Au moins un calque obligatoire n'a aucun trait. Ajoutez au moins une image à chaque calque, ou rendez-le optionnel.",
      "At least one required layer has no traits. Add at least one image to every layer, or make it optional.",
    );
  } else if (!feasible) {
    level = "over";
    recommendation = tr(
      `La taille demandée (${fmt(requested)}) dépasse les ${fmt(max)} combinaisons uniques possibles. Ajoutez des traits ou des calques, ou réduisez la collection. Sinon la génération sera plafonnée à ${fmt(max)}.`,
      `The requested size (${fmt(requested)}) exceeds the ${fmt(max)} possible unique combinations. Add traits or layers, or shrink the collection. Otherwise generation will be capped at ${fmt(max)}.`,
    );
  } else if (ratio > 0.5) {
    level = "high";
    recommendation = tr(
      `${fmt(requested)} NFT pour ${fmt(max)} combinaisons (${pct(ratio)}). Faisable, mais les poids de rareté seront écrasés : quasi toutes les combinaisons sortiront. Ajoutez quelques traits pour une vraie rareté.`,
      `${fmt(requested)} NFT for ${fmt(max)} combinations (${pct(ratio)}). Feasible, but rarity weights will be flattened: almost every combination will come out. Add a few traits for real rarity.`,
    );
  } else if (ratio < 0.1) {
    level = "comfortable";
    recommendation = tr(
      `Très confortable : ${fmt(requested)} NFT pour ${fmt(max)} combinaisons (${pct(ratio)}). Rareté fidèle aux poids, génération rapide.`,
      `Very comfortable: ${fmt(requested)} NFT for ${fmt(max)} combinations (${pct(ratio)}). Rarity follows your weights, fast generation.`,
    );
  } else {
    level = "ok";
    recommendation = tr(
      `Rapport sain (${pct(ratio)}). Les quelques doublons tirés seront éliminés automatiquement.`,
      `Healthy ratio (${pct(ratio)}). The few duplicates drawn will be removed automatically.`,
    );
  }
  return { feasible, maxCombinations: max, requested, ratio, level, recommendation };
}
