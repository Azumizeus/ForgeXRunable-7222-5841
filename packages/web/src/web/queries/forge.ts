import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AppRouterClient } from "../../api";
import { toast } from "sonner";
import { errMsg, orpc } from "../lib/api";

export const useCollections = () => useQuery(orpc.collections.list.queryOptions());
export const useCollection = (id: string) => useQuery(orpc.collections.get.queryOptions({ input: { id } }));
export const useUsage = () => useQuery(orpc.billing.usage.queryOptions({ staleTime: 15_000 }));

/** Invalidate everything collection-scoped after a studio mutation. */
export function useInvalidateCollection() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: orpc.collections.key() }),
      qc.invalidateQueries({ queryKey: orpc.generate.key() }),
      qc.invalidateQueries({ queryKey: orpc.candy.key() }),
    ]);
}

const onError = (e: unknown) => toast.error(errMsg(e));

/** Optimistically patch every cached `collections.get` result; returns a rollback. */
function useOptimistic() {
  const qc = useQueryClient();
  return async (fn: (d: StudioData) => StudioData) => {
    const key = orpc.collections.get.key();
    await qc.cancelQueries({ queryKey: key });
    const prev = qc.getQueriesData<StudioData>({ queryKey: key });
    qc.setQueriesData<StudioData>({ queryKey: key }, (d) => (d ? fn(d) : d));
    return () => {
      for (const [k, v] of prev) qc.setQueryData(k, v);
    };
  };
}

type Rollback = { rollback?: () => void };
const mapTraits = (d: StudioData, fn: (t: StudioTrait) => StudioTrait | null): StudioData => ({
  ...d,
  layers: d.layers.map((l) => ({ ...l, traits: l.traits.map(fn).filter((x): x is StudioTrait => !!x) })),
});

export function useStudioMutations() {
  const inv = useInvalidateCollection();
  const qc = useQueryClient();
  const optimistic = useOptimistic();
  const opts = { onSuccess: () => inv(), onError };
  const optOpts = {
    onError: (e: unknown, _v: unknown, ctx: Rollback | undefined) => {
      ctx?.rollback?.();
      onError(e);
    },
    onSettled: () => inv(),
  };
  return {
    updateCollection: useMutation(
      orpc.collections.update.mutationOptions({
        ...optOpts,
        onMutate: async (v): Promise<Rollback> => ({
          rollback: await optimistic((d) => (d.collection.id === v.id ? {
                  ...d,
                  collection: {
                    ...d.collection,
                    ...v.patch,
                    ...(v.patch.candy ? { candy: { ...d.collection.candy, ...v.patch.candy } } : {}),
                  } as StudioData["collection"],
                } : d)),
        }),
      }),
    ),
    createLayer: useMutation(orpc.layers.create.mutationOptions(opts)),
    updateLayer: useMutation(
      orpc.layers.update.mutationOptions({
        ...optOpts,
        onMutate: async (v): Promise<Rollback> => ({
          rollback: await optimistic((d) => ({ ...d, layers: d.layers.map((l) => (l.id === v.id ? { ...l, ...v.patch } : l)) })),
        }),
      }),
    ),
    removeLayer: useMutation(
      orpc.layers.remove.mutationOptions({
        ...optOpts,
        onMutate: async (v): Promise<Rollback> => ({ rollback: await optimistic((d) => ({ ...d, layers: d.layers.filter((l) => l.id !== v.id) })) }),
      }),
    ),
    reorderLayers: useMutation(
      orpc.layers.reorder.mutationOptions({
        ...optOpts,
        onMutate: async (v): Promise<Rollback> => ({
          rollback: await optimistic((d) => {
            const byId = new Map(d.layers.map((l) => [l.id, l]));
            const next = v.ids.map((id) => byId.get(id)).filter((l): l is StudioLayer => !!l);
            return next.length === d.layers.length ? { ...d, layers: next } : d;
          }),
        }),
      }),
    ),
    demoTraits: useMutation(orpc.traits.demo.mutationOptions(opts)),
    updateTrait: useMutation(
      orpc.traits.update.mutationOptions({
        ...optOpts,
        onMutate: async (v): Promise<Rollback> => ({
          rollback: await optimistic((d) => mapTraits(d, (t) => (t.id === v.id ? ({ ...t, ...v.patch } as StudioTrait) : t))),
        }),
      }),
    ),
    bulkWeights: useMutation(
      orpc.traits.bulkWeights.mutationOptions({
        ...optOpts,
        onMutate: async (v): Promise<Rollback> => {
          const w = new Map(v.weights.map((x) => [x.id, x.weight]));
          return { rollback: await optimistic((d) => mapTraits(d, (t) => (w.has(t.id) ? { ...t, weight: w.get(t.id)! } : t))) };
        },
      }),
    ),
    removeTrait: useMutation(
      orpc.traits.remove.mutationOptions({
        ...optOpts,
        onMutate: async (v): Promise<Rollback> => ({ rollback: await optimistic((d) => mapTraits(d, (t) => (t.id === v.id ? null : t))) }),
      }),
    ),
    moveTrait: useMutation(orpc.traits.move.mutationOptions(opts)),
    aiTrait: useMutation(
      orpc.traits.generateAi.mutationOptions({
        onSuccess: () => {
          inv();
          qc.invalidateQueries({ queryKey: orpc.billing.key() });
        },
      }),
    ),
    generate: useMutation(orpc.generate.run.mutationOptions(opts)),
    plan: useMutation(orpc.plan.generate.mutationOptions(opts)),
  };
}

export const feasibilityQuery = (collectionId: string) => orpc.generate.feasibility.queryOptions({ input: { collectionId } });
export const nftsQuery = (input: { collectionId: string; page: number; pageSize: number; sort: "edition" | "rarest" | "common"; trait?: string; search?: string }) =>
  orpc.generate.nfts.queryOptions({ input, placeholderData: (p) => p });
export const nftQuery = (collectionId: string, edition: number) => orpc.generate.nft.queryOptions({ input: { collectionId, edition } });
export const rarityQuery = (collectionId: string) => orpc.generate.rarity.queryOptions({ input: { collectionId } });
export const previewQuery = (collectionId: string, seed: string) =>
  orpc.generate.preview.queryOptions({ input: { collectionId, count: 6, seed }, placeholderData: (p) => p });
export const candyQuery = (collectionId: string) => orpc.candy.preview.queryOptions({ input: { collectionId } });
export const exportsQuery = (collectionId: string) => orpc.exports.list.queryOptions({ input: { collectionId } });

export type StudioData = Awaited<ReturnType<AppRouterClient["collections"]["get"]>>;
export type StudioLayer = StudioData["layers"][number];
export type StudioTrait = StudioLayer["traits"][number];
export const blendModesQuery = () => orpc.layers.blendModes.queryOptions({ staleTime: Number.POSITIVE_INFINITY });
export const planQuery = (collectionId: string) => orpc.plan.get.queryOptions({ input: { collectionId } });
