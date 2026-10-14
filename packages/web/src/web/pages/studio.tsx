import { Link, useLocation, useParams, useSearch } from "wouter";
import { motion } from "motion/react";
import { ArrowLeft, ArrowRight, BrainCircuit, Check, FileCode2, Hammer, Layers3, Loader2, Rocket, Settings2, Sparkles } from "lucide-react";
import { AppShell } from "../components/app-shell";
import { Button } from "../components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { exportsQuery, useCollection } from "../queries/forge";
import { StepCollection } from "../components/studio/step-collection";
import { StepLayers } from "../components/studio/step-layers";
import { StepPlan } from "../components/studio/step-plan";
import { StepGenerate } from "../components/studio/step-generate";
import { StepGallery } from "../components/studio/step-gallery";
import { StepContract } from "../components/studio/step-contract";
import { StepExport } from "../components/studio/step-export";
import { cn } from "../lib/utils";
import { useT } from "../lib/i18n";

const STEPS = [
  { id: "collection", label: ["Collection", "Collection"], icon: Settings2 },
  { id: "layers", label: ["Calques & traits", "Layers & traits"], icon: Layers3 },
  { id: "plan", label: ["Plan IA", "AI plan"], icon: BrainCircuit },
  { id: "generate", label: ["Génération", "Generate"], icon: Hammer },
  { id: "rarity", label: ["Galerie & rareté", "Gallery & rarity"], icon: Sparkles },
  { id: "contract", label: ["Candy Machine", "Candy Machine"], icon: FileCode2 },
  { id: "export", label: ["Export & déploiement", "Export & deploy"], icon: Rocket },
] as const;
type StepId = (typeof STEPS)[number]["id"];

function Studio() {
  const { id } = useParams<{ id: string }>();
  const search = useSearch();
  const [, navigate] = useLocation();
  const q = useCollection(id);
  const ex = useQuery({ ...exportsQuery(id), enabled: !!q.data });
  const t = useT();
  const L = (s: (typeof STEPS)[number]) => t(s.label[0], s.label[1]);
  const rawStep = new URLSearchParams(search).get("step");
  const step: StepId = STEPS.some((s) => s.id === rawStep) ? (rawStep as StepId) : "layers";
  const idx = Math.max(0, STEPS.findIndex((s) => s.id === step));
  const go = (s: StepId) => navigate(`/app/c/${id}?step=${s}`);

  if (q.isPending)
    return (
      <div className="grid min-h-[70vh] place-items-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  if (q.isError || !q.data)
    return (
      <div className="grid min-h-[70vh] place-items-center text-center">
        <div>
          <p className="text-lg font-semibold">{t("Collection introuvable", "Collection not found")}</p>
          <Button asChild className="mt-4">
            <Link to="/app">{t("Retour aux collections", "Back to collections")}</Link>
          </Button>
        </div>
      </div>
    );

  const data = q.data;
  const done: Record<StepId, boolean> = {
    collection: !!data.collection.name && !!data.collection.symbol,
    layers: data.layers.length > 0 && data.layers.every((l) => l.traits.length > 0 || l.allowNone),
    plan: !!data.plan,
    generate: !!data.generation,
    rarity: !!data.generation,
    contract: data.collection.creators.some((c) => c.address),
    export: !!ex.data?.some((e) => e.status === "done"),
  };

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)]">
      <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-60 shrink-0 flex-col border-r border-border bg-card/50 p-4 lg:flex">
        <Link to="/app" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" /> Collections
        </Link>
        <div className="mt-4 flex items-center gap-3">
          <div className="checker size-10 shrink-0 overflow-hidden rounded-md border border-border">
            {data.generation && <img src={`/api/render/${data.generation.id}/0?s=128`} alt="" className="size-full object-cover" />}
          </div>
          <div className="min-w-0">
            <p className="truncate font-display font-bold">{data.collection.name}</p>
            <p className="font-mono text-[10px] text-muted-foreground">
              {data.collection.symbol} · {data.collection.network}
            </p>
          </div>
        </div>
        <nav className="relative mt-6 space-y-0.5">
          {STEPS.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => go(s.id)}
              className={cn("relative flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left text-sm transition", s.id === step ? "text-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              {s.id === step && <motion.span layoutId="step-bg" className="absolute inset-0 rounded-md border border-primary/40 bg-primary/10" transition={{ type: "spring", stiffness: 400, damping: 34 }} />}
              <span className={cn("relative grid size-6 place-items-center rounded-full border font-mono text-[10px]", done[s.id] ? "border-ok/50 bg-ok/10 text-ok" : s.id === step ? "border-primary text-primary" : "border-border")}>
                {done[s.id] ? <Check className="size-3" /> : i + 1}
              </span>
              <span className="relative">{L(s)}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="min-w-0 flex-1 px-5 py-8 lg:px-10">
        {/* mobile step picker */}
        <select aria-label={t("Étape", "Step")} className="field mb-6 lg:hidden" value={step} onChange={(e) => go(e.target.value as StepId)}>
          {STEPS.map((s, i) => (
            <option key={s.id} value={s.id}>
              {i + 1}. {L(s)}
            </option>
          ))}
        </select>
        <motion.div key={step} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          {step === "collection" && <StepCollection data={data} />}
          {step === "layers" && <StepLayers data={data} dataVersion={q.dataUpdatedAt} />}
          {step === "plan" && <StepPlan data={data} />}
          {step === "generate" && <StepGenerate data={data} onNext={() => go("rarity")} />}
          {step === "rarity" && <StepGallery data={data} onBack={() => go("generate")} />}
          {step === "contract" && <StepContract data={data} />}
          {step === "export" && <StepExport data={data} onBack={() => go("generate")} />}
        </motion.div>
        <div className="mt-12 flex justify-between border-t border-border pt-6">
          {idx > 0 ? (
            <Button variant="ghost" onClick={() => go(STEPS[idx - 1]!.id)}>
              <ArrowLeft /> {L(STEPS[idx - 1]!)}
            </Button>
          ) : (
            <span />
          )}
          {idx < STEPS.length - 1 && (
            <Button variant="outline" onClick={() => go(STEPS[idx + 1]!.id)}>
              {L(STEPS[idx + 1]!)} <ArrowRight />
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}

export default function StudioPage() {
  return (
    <AppShell>
      <Studio />
    </AppShell>
  );
}
