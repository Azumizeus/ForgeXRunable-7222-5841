import { useState } from "react";
import { Link } from "wouter";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Modal, Toggle } from "./kit";
import { useStudioMutations, useUsage, type StudioLayer } from "../../queries/forge";
import { errMsg, isQuotaError } from "../../lib/api";
import { cn } from "../../lib/utils";
import { useLang, useT } from "../../lib/i18n";

const IDEAS: Record<"fr" | "en", Record<string, string[]>> = {
  fr: {
    default: ["casque viking en bronze, cornes ivoire", "couronne dorée sertie de rubis", "lunettes de soleil néon", "cicatrice lumineuse", "écharpe rouge qui flotte"],
    fond: ["coucher de soleil cyberpunk, néons", "forge en fusion, braises", "ciel étoilé violet profond", "désert de dunes dorées"],
  },
  en: {
    default: ["bronze viking helmet, ivory horns", "golden crown set with rubies", "neon sunglasses", "glowing scar", "red scarf flowing in the wind"],
    fond: ["cyberpunk sunset, neon lights", "molten forge, embers", "deep purple starry sky", "golden sand dunes desert"],
  },
};

export function AiDialog({ layer, isBottom, open, onClose }: { layer: StudioLayer; isBottom: boolean; open: boolean; onClose: () => void }) {
  const m = useStudioMutations();
  const usage = useUsage();
  const lang = useLang();
  const t = useT();
  const isBg = isBottom || /fond|back|bg/i.test(layer.name);
  const [prompt, setPrompt] = useState("");
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"isolated" | "background">(isBg ? "background" : "isolated");
  const [useRef, setUseRef] = useState(true);
  const [quota, setQuota] = useState(false);
  const left = usage.data ? usage.data.ai.remaining : null;
  const ideas = isBg ? IDEAS[lang].fond! : IDEAS[lang].default!;

  const run = () =>
    m.aiTrait.mutate(
      { layerId: layer.id, prompt, name: name || undefined, mode, useReference: useRef },
      {
        onSuccess: (r) => {
          toast.success(t(`Trait « ${r.name} » ajouté à ${layer.name}`, `Trait "${r.name}" added to ${layer.name}`));
          setPrompt("");
          setName("");
          onClose();
        },
        onError: (e) => {
          if (isQuotaError(e)) setQuota(true);
          else toast.error(errMsg(e));
        },
      },
    );

  return (
    <Modal open={open} onClose={() => !m.aiTrait.isPending && onClose()} title={`${t("Trait IA", "AI trait")} · ${layer.name}`}>
      {quota ? (
        <div className="text-center">
          <Sparkles className="mx-auto size-8 text-gold" />
          <p className="mt-3 font-semibold">{t("Quota de traits IA atteint", "AI trait quota reached")}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {usage.data?.plan === "studio"
              ? t("Votre quota mensuel se renouvelle au prochain cycle.", "Your monthly quota renews next cycle.")
              : usage.data?.plan === "creator"
                ? t("Passez à Studio pour 1 000 traits IA par mois.", "Upgrade to Studio for 1,000 AI traits per month.")
                : t("Passez à Creator pour 200 traits IA par mois.", "Upgrade to Creator for 200 AI traits per month.")}
          </p>
          <Button asChild className="mt-5">
            <Link to="/app/billing">{t("Voir les plans", "See plans")}</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <span className="label">{t("Décrivez le trait", "Describe the trait")}</span>
            <textarea aria-label={t("Décrivez le trait", "Describe the trait")} className="field min-h-24" maxLength={600} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={ideas[0]} disabled={m.aiTrait.isPending} />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {ideas.map((i) => (
                <button key={i} type="button" onClick={() => setPrompt(i)} className="rounded-full border border-border px-2.5 py-0.5 text-[11px] text-muted-foreground hover:border-gold hover:text-gold">
                  {i}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="label">{t("Nom du trait (optionnel)", "Trait name (optional)")}</span>
            <input aria-label={t("Nom du trait (optionnel)", "Trait name (optional)")} className="field" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} placeholder={t("Casque viking", "Viking helmet")} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["isolated", t("Élément isolé", "Isolated element"), t("Fond détouré, s'empile sur le perso", "Background removed, stacks on the character")],
                ["background", t("Fond plein", "Full background"), t("Image bord à bord", "Edge-to-edge image")],
              ] as const
            ).map(([v, title, d]) => (
              <button key={v} type="button" onClick={() => setMode(v)} className={cn("rounded-md border p-3 text-left transition", mode === v ? "border-gold bg-gold/10" : "border-border hover:border-muted-foreground")}>
                <p className="text-sm font-semibold">{title}</p>
                <p className="text-xs text-muted-foreground">{d}</p>
              </button>
            ))}
          </div>
          {mode === "isolated" && !isBottom && <Toggle checked={useRef} onChange={setUseRef} label={t("Caler sur les calques inférieurs (recommandé)", "Align to lower layers (recommended)")} />}
          <div className="flex items-center justify-between border-t border-border pt-4">
            <span className="font-mono text-xs text-muted-foreground">{left !== null ? t(`${left} trait(s) IA restants`, `${left} AI trait(s) left`) : ""}</span>
            <Button onClick={run} disabled={prompt.trim().length < 3 || m.aiTrait.isPending} className="bg-gold text-[#1a1004] hover:bg-gold/90">
              {m.aiTrait.isPending ? <Loader2 className="animate-spin" /> : <Sparkles />}
              {m.aiTrait.isPending ? t("Forge en cours… (~20 s)", "Forging… (~20 s)") : t("Générer le trait", "Generate trait")}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
