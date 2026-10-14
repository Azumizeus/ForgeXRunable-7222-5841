import { tr } from "./i18n";
import { ORPCError } from "@orpc/server";
import { and, asc, eq } from "drizzle-orm";
import { db } from "../database";
import { collections, layers, traits } from "../database/schema";
import type { Snapshot, TraitTransform } from "../engine/types";

export async function ownCollection(userId: string, id: string) {
  const [c] = await db.select().from(collections).where(and(eq(collections.id, id), eq(collections.userId, userId)));
  if (!c) throw new ORPCError("NOT_FOUND", { message: tr("Collection introuvable", "Collection not found") });
  return c;
}

export async function ownLayer(userId: string, layerId: string) {
  const [l] = await db.select().from(layers).where(eq(layers.id, layerId));
  if (!l) throw new ORPCError("NOT_FOUND", { message: tr("Calque introuvable", "Layer not found") });
  const c = await ownCollection(userId, l.collectionId);
  return { layer: l, collection: c };
}

export async function ownTrait(userId: string, traitId: string) {
  const [t] = await db.select().from(traits).where(eq(traits.id, traitId));
  if (!t) throw new ORPCError("NOT_FOUND", { message: tr("Trait introuvable", "Trait not found") });
  await ownCollection(userId, t.collectionId);
  return t;
}

export const parse = <T>(s: string | null | undefined, fallback: T): T => {
  try {
    return s ? (JSON.parse(s) as T) : fallback;
  } catch {
    return fallback;
  }
};

export async function loadTree(collectionId: string) {
  const ls = await db.select().from(layers).where(eq(layers.collectionId, collectionId)).orderBy(asc(layers.position), asc(layers.createdAt));
  const ts = await db.select().from(traits).where(eq(traits.collectionId, collectionId)).orderBy(asc(traits.createdAt));
  return ls.map((l) => ({ ...l, traits: ts.filter((t) => t.layerId === l.id) }));
}

export function toSnapshot(tree: Awaited<ReturnType<typeof loadTree>>, gameStatsJson: string): Snapshot {
  const gs = parse<{ base?: Record<string, number> }>(gameStatsJson, {});
  return {
    baseStats: gs.base ?? {},
    layers: tree.map((l) => ({
      id: l.id,
      name: l.name,
      allowNone: l.allowNone,
      noneWeight: l.noneWeight,
      blendMode: l.blendMode,
      opacity: l.opacity,
      traits: l.traits.map((t) => ({ id: t.id, name: t.name, weight: t.weight, imageKey: t.imageKey, stats: parse(t.stats, {}), transform: parseTransform(t.transform) })),
    })),
  };
}

export const fileUrl = (key: string) => `/api/file/${key}`;

export function parseTransform(s: string | null | undefined): TraitTransform | undefined {
  const t = parse<Partial<TraitTransform>>(s, {});
  const x = t.x ?? 0, y = t.y ?? 0, scale = t.scale ?? 100;
  return x === 0 && y === 0 && scale === 100 ? undefined : { x, y, scale };
}
