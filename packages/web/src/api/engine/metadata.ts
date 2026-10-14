import type { Picks, Snapshot } from "./types";
import { fullAttributes } from "./rarity";

export interface CollectionMeta {
  name: string;
  symbol: string;
  description: string;
  externalUrl: string;
  royaltyBps: number;
  creators: { address: string; share: number }[];
}

/** Metaplex Token Metadata JSON, Sugar asset convention (image = "<n>.png"). */
export function tokenMetadata(c: CollectionMeta, snap: Snapshot, edition: number, picks: Picks) {
  const file = `${edition}.png`;
  return {
    name: `${c.name} #${edition + 1}`,
    symbol: c.symbol,
    description: c.description,
    seller_fee_basis_points: c.royaltyBps,
    image: file,
    external_url: c.externalUrl || undefined,
    attributes: fullAttributes(snap, picks),
    properties: {
      files: [{ uri: file, type: "image/png" }],
      category: "image",
      creators: c.creators.filter((x) => x.address),
    },
  };
}

export function collectionMetadata(c: CollectionMeta) {
  return {
    name: c.name,
    symbol: c.symbol,
    description: c.description,
    seller_fee_basis_points: c.royaltyBps,
    image: "collection.png",
    external_url: c.externalUrl || undefined,
    properties: {
      files: [{ uri: "collection.png", type: "image/png" }],
      category: "image",
      creators: c.creators.filter((x) => x.address),
    },
  };
}
