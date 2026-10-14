import { useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { BrainCircuit, Loader2, RefreshCw } from "lucide-react";
import { Button } from "../ui/button";
import { StepHeader } from "./kit";
import { useStudioMutations, type StudioData } from "../../queries/forge";
import { useT } from "../../lib/i18n";

export function StepPlan({ data }: { data: StudioData }) {
  const m = useStudioMutations();
  const [goals, setGoals] = useState("");
  const t = useT();
  const plan = m.plan.data?.content ?? data.plan;
  const run = () => m.plan.mutate({ collectionId: data.collection.id, goals: goals || undefined });
  return (
    <div>
      <StepHeader
        n="3"
        title={t("Plan d'action IA", "AI action plan")}
        desc={t(
          "Un stratège IA analyse vos calques, vos poids et votre économie pour produire un plan de lancement chiffré : rareté, prix, calendrier, marketing, checklist technique.",
          "An AI strategist reviews your layers, weights and economics to produce a quantified launch plan: rarity, pricing, timeline, marketing, technical checklist.",
        )}
      >
        {plan && (
          <Button variant="outline" onClick={run} disabled={m.plan.isPending}>
            {m.plan.isPending ? <Loader2 className="animate-spin" /> : <RefreshCw />} {t("Régénérer", "Regenerate")}
          </Button>
        )}
      </StepHeader>
      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <div className="panel self-start p-5">
          <span className="label">{t("Vos objectifs (optionnel)", "Your goals (optional)")}</span>
          <textarea aria-label={t("Vos objectifs (optionnel)", "Your goals (optional)")} className="field min-h-32" maxLength={800} value={goals} onChange={(e) => setGoals(e.target.value)} placeholder={t("ex. sold-out en 48 h, communauté gaming, budget marketing 2 000 €…", "e.g. sell out in 48h, gaming community, $2,000 marketing budget…")} />
          <Button className="mt-4 w-full" onClick={run} disabled={m.plan.isPending}>
            {m.plan.isPending ? <Loader2 className="animate-spin" /> : <BrainCircuit />}
            {m.plan.isPending ? t("Analyse en cours (~40 s)…", "Analyzing (~40 s)…") : plan ? t("Mettre à jour le plan", "Update plan") : t("Générer le plan", "Generate plan")}
          </Button>
          <p className="mt-3 text-xs text-muted-foreground">{t("Inclus dans tous les plans, ne consomme pas de quota.", "Included in every plan, uses no quota.")}</p>
        </div>
        <div className="panel min-h-[420px] p-8">
          {m.plan.isPending ? (
            <div className="space-y-3">
              {[80, 60, 95, 70, 85, 50, 90].map((w, i) => (
                <div key={i} className="shimmer h-4 rounded" style={{ width: `${w}%` }} />
              ))}
            </div>
          ) : plan ? (
            <article className="prose-forge max-w-3xl">
              <Markdown
                remarkPlugins={[remarkGfm]}
                components={{
                  table: ({ children }) => (
                    <div className="my-4 overflow-x-auto">
                      <table>{children}</table>
                    </div>
                  ),
                }}
              >
                {plan}
              </Markdown>
            </article>
          ) : (
            <div className="grid h-full place-items-center text-center text-muted-foreground">
              <div>
                <BrainCircuit className="mx-auto size-10" />
                <p className="mt-3 text-sm">{t("Aucun plan pour l'instant.", "No plan yet.")}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
