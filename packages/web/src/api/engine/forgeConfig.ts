import type { Snapshot } from "./types";

/** Export compatible with the Python CLI (ULTIMATE SOLANA NFT FORGE / forge.engine). */
export function pythonForgeConfig(
  c: { name: string; description: string; symbol: string; externalUrl: string; size: number; width: number; seed: string; network: string; price: number; creators: { address: string; share: number }[]; royaltyBps: number },
  snap: Snapshot,
) {
  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "layer";
  const perTrait: Record<string, Record<string, Record<string, number>>> = {};
  for (const l of snap.layers)
    for (const t of l.traits)
      if (Object.keys(t.stats).length) ((perTrait[l.name] ??= {})[t.name] = t.stats);
  return {
    collection_name: c.name,
    collection_description: c.description,
    symbol: c.symbol,
    base_uri: "",
    external_url: c.externalUrl,
    count: c.size,
    image_size: c.width,
    seed: c.seed,
    layers: snap.layers.map((l) => ({
      name: l.name,
      folder: slug(l.name),
      position: "front",
      allow_none: l.allowNone,
      none_weight: l.noneWeight,
      traits: Object.fromEntries(l.traits.map((t) => [t.name, t.weight])),
    })),
    game_stats: Object.keys(snap.baseStats).length || Object.keys(perTrait).length ? { base: snap.baseStats, per_trait: perTrait } : undefined,
    candy_machine: {
      network: c.network,
      price: c.price,
      go_live_date: null,
      symbol: c.symbol,
      creators: c.creators.map((x) => ({ ...x, royalty_bps: c.royaltyBps })),
    },
  };
}
