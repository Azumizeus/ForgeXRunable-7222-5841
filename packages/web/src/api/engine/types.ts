/** Snapshot of a collection's layers/traits frozen at generation time. */
export interface SnapTrait {
  id: string;
  name: string;
  weight: number;
  imageKey: string;
  stats: Record<string, number>;
  /** offset x/y in % of canvas, scale in % (100 = fit) */
  transform?: TraitTransform;
}
export interface TraitTransform {
  x: number;
  y: number;
  scale: number;
}
export interface SnapLayer {
  id: string;
  name: string;
  allowNone: boolean;
  noneWeight: number;
  blendMode: string;
  opacity: number;
  traits: SnapTrait[];
}
export interface Snapshot {
  layers: SnapLayer[];
  baseStats: Record<string, number>;
}
/** One NFT = trait index per layer, -1 = layer absent. */
export type Picks = number[];

export interface Attribute {
  trait_type: string;
  value: string | number;
  display_type?: "number";
}
