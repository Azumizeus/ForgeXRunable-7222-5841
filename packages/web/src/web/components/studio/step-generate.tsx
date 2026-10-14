import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { ArrowRight, Dices, Hammer, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Stat, StepHeader, fmt } from "./kit";
import { feasibilityQuery, nftsQuery, useStudioMutations, type StudioData } from "../../queries/forge";
import { cn } from "../../lib/utils";
import { useT } from "../../lib/i18n";

const LEVEL: Record<string, { label: [string, string]; tone: "ok" | "gold" | "bad" }> = {
  comfortable: { label: ["Confortable", "Comfortable"], tone: "ok" },
  ok: { label: ["Sain", "Healthy"], tone: "ok" },
  high: { label: ["Tendu", "Tight"], tone: "gold" },
  over: { label: ["Dépassé", "Exceeded"], tone: "bad" },
  impossible: { label: ["Impossible", "Impossible"], tone: "bad" },
};

export function StepGenerate({ data, onNext }: { data: StudioData; onNext: () => void }) {
  const m = useStudioMutations();
  const f = useQuery(feasibilityQuery(data.collection.id));
  const [seed, setSeed] = useState(data.collection.seed);
  const gen = data.generation;
  const thumbs = useQuery({ ...nftsQuery({ collectionId: data.collection.id, page: 0, pageSize: 24, sort: "edition" }), enabled: !!gen });
  const lvl = f.data ? LEVEL[f.data.level]! : null;
  const t = useT();

  return (
    <div>
      <StepHeader
        n="4"
        title={t("Génération", "Generate")}
        desc={t(
          "Tirage pondéré déterministe : même seed + mêmes calques = même collection. Les doublons sont éliminés automatiquement. Gratuit et illimité.",
          "Deterministic weighted sampling: same seed + same layers = same collection. Duplicates are removed automatically. Free and unlimited.",
        )}
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_1.3fr]">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Stat label={t("Taille demandée", "Requested size")} value={fmt(data.collection.size)} />
            <Stat label={t("Combinaisons", "Combinations")} value={f.data ? fmt(f.data.maxCombinations) : "…"} />
            <Stat label={t("Utilisation", "Usage")} value={f.data ? `${(f.data.ratio * 100).toFixed(1)}%` : "…"} />
            <Stat label={t("Faisabilité", "Feasibility")} value={lvl ? t(lvl.label[0], lvl.label[1]) : "…"} tone={lvl?.tone} />
          </div>
          {f.data && <p className={cn("rounded-md border px-4 py-3 text-sm", lvl?.tone === "bad" ? "border-destructive/40 bg-destructive/10" : lvl?.tone === "gold" ? "border-gold/40 bg-gold/10" : "border-border bg-card")}>{f.data.recommendation}</p>}
          <div className="panel p-5">
            <span className="label">Seed</span>
            <div className="flex gap-2">
              <input aria-label="Seed" className="field font-mono" value={seed} onChange={(e) => setSeed(e.target.value)} maxLength={80} />
              <Button variant="outline" size="icon" onClick={() => setSeed(Math.random().toString(36).slice(2, 10))} title={t("Seed aléatoire", "Random seed")}>
                <Dices />
              </Button>
            </div>
            <Button
              size="lg"
              className="mt-5 h-12 w-full text-base"
              disabled={m.generate.isPending || f.data?.level === "impossible"}
              onClick={() =>
                m.generate.mutate(
                  { collectionId: data.collection.id, seed },
                  { onSuccess: (r) => toast.success(t(`${fmt(r.generated)} NFT forgés en ${r.elapsedMs} ms`, `${fmt(r.generated)} NFTs forged in ${r.elapsedMs} ms`)) },
                )
              }
            >
              {m.generate.isPending ? <Loader2 className="animate-spin" /> : <Hammer />}
              {gen ? t("Re-forger la collection", "Re-forge collection") : t("Forger la collection", "Forge collection")}
            </Button>
            {gen && <p className="mt-2 text-center text-xs text-muted-foreground">{t("Re-forger remplace la génération actuelle.", "Re-forging replaces the current generation.")}</p>}
          </div>
        </div>

        <div className="panel relative overflow-hidden p-5">
          {gen ? (
            <>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                <div>
                  <p className="eyebrow">{t("Dernière génération", "Latest generation")}</p>
                  <p className="mt-1 font-display text-4xl font-extrabold text-primary">{fmt(gen.generated)} NFT</p>
                </div>
                <div className="font-mono text-xs text-muted-foreground">
                  <p>seed {gen.seed}</p>
                  <p>
                    {gen.elapsedMs} ms · {gen.duplicates} {t("doublons écartés", "duplicates discarded")}
                  </p>
                </div>
                <Button variant="outline" className="ml-auto" onClick={onNext}>
                  {t("Explorer la rareté", "Explore rarity")} <ArrowRight />
                </Button>
              </div>
              {gen.generated < gen.requested && <p className="mt-3 text-xs text-gold">{t("Plafonné :", "Capped:")} {fmt(gen.requested - gen.generated)} {t("NFT manquants faute de combinaisons.", "NFTs missing for lack of combinations.")}</p>}
              <div className="mt-5 grid grid-cols-4 gap-2 sm:grid-cols-6">
                {thumbs.data?.items.map((it, i) => (
                  <motion.div key={it.image} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.025 }} className="checker relative aspect-square overflow-hidden rounded-md">
                    <img src={it.image} alt="" className="size-full object-cover" loading="lazy" />
                    <span className="absolute bottom-0.5 left-1 font-mono text-[9px] text-white/80 drop-shadow">#{it.edition + 1}</span>
                  </motion.div>
                ))}
              </div>
            </>
          ) : (
            <div className="grid h-full min-h-[360px] place-items-center text-center">
              <div>
                <Hammer className="mx-auto size-10 text-muted-foreground" />
                <p className="mt-3 font-semibold">{t("Pas encore forgée", "Not forged yet")}</p>
                <p className="mt-1 text-sm text-muted-foreground">{t("Lancez la génération pour voir vos NFT.", "Run the generation to see your NFTs.")}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
