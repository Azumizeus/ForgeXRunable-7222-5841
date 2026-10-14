import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "../ui/button";
import { StepHeader, useDraft } from "./kit";
import { useStudioMutations, type StudioData } from "../../queries/forge";
import { cn } from "../../lib/utils";
import { useT } from "../../lib/i18n";

type Patch = Parameters<ReturnType<typeof useStudioMutations>["updateCollection"]["mutate"]>[0]["patch"];

export function StepCollection({ data }: { data: StudioData }) {
  const c = data.collection;
  const m = useStudioMutations();
  const t = useT();
  const save = (patch: Patch) => m.updateCollection.mutate({ id: c.id, patch });
  const [form, setForm] = useDraft(
    { name: c.name, symbol: c.symbol, description: c.description, externalUrl: c.externalUrl, size: c.size, royaltyBps: c.royaltyBps, width: c.width, height: c.height },
    (v) => {
      if (!v.name.trim() || !v.symbol.trim()) return;
      save({ ...v, size: Math.max(1, Math.min(50000, v.size || 1)) });
    },
    700,
  );
  const upd = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm({ ...form, [k]: v });

  return (
    <div>
      <StepHeader n="1" title="Collection" desc={t("Identité on-chain de la collection : ces champs alimentent les métadonnées Metaplex de chaque NFT. Sauvegarde automatique.", "On-chain identity of the collection: these fields feed the Metaplex metadata of every NFT. Autosaved.")} />
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="panel relative space-y-5 p-6">
          <span className="absolute right-6 top-1.5 font-mono text-[11px] text-muted-foreground" aria-live="polite">
          {m.updateCollection.isPending ? t("Enregistrement…", "Saving…") : m.updateCollection.isError ? <span className="text-destructive">{t("Échec de l'enregistrement", "Save failed")}</span> : m.updateCollection.isSuccess ? <span className="text-ok">{t("Enregistré ✓", "Saved ✓")}</span> : null}
        </span>
          <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
            <div>
              <span className="label">{t("Nom (32 car. max)", "Name (32 chars max)")}</span>
              <input aria-label={t("Nom (32 car. max)", "Name (32 chars max)")} className="field" maxLength={32} value={form.name} onChange={(e) => upd("name", e.target.value)} />
            </div>
            <div>
              <span className="label">{t("Symbole", "Symbol")}</span>
              <input aria-label={t("Symbole", "Symbol")} className="field font-mono uppercase" maxLength={10} value={form.symbol} onChange={(e) => upd("symbol", e.target.value.toUpperCase())} />
            </div>
          </div>
          <div>
            <span className="label">Description</span>
            <textarea aria-label="Description" className="field min-h-24" maxLength={2000} value={form.description} onChange={(e) => upd("description", e.target.value)} placeholder={t("Utilisée dans les métadonnées et comme contexte de style pour l'IA.", "Used in metadata and as style context for the AI.")} />
          </div>
          <div>
            <span className="label">{t("Site externe", "External URL")}</span>
            <input aria-label={t("Site externe", "External URL")} className="field" value={form.externalUrl} onChange={(e) => upd("externalUrl", e.target.value)} placeholder="https://…" />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <span className="label">{t("Taille de la collection", "Collection size")}</span>
              <input aria-label={t("Taille de la collection", "Collection size")} className="field font-mono" type="number" min={1} max={50000} value={form.size} onChange={(e) => upd("size", Number(e.target.value))} />
            </div>
            <div>
              <span className="label">Royalties (%)</span>
              <input aria-label="Royalties (%)" className="field font-mono" type="number" min={0} max={100} step={0.5} value={form.royaltyBps / 100} onChange={(e) => upd("royaltyBps", Math.round(Number(e.target.value) * 100))} />
            </div>
            <div>
              <span className="label">{t("Résolution (px)", "Resolution (px)")}</span>
              <select
                aria-label={t("Résolution", "Resolution")}
                className="field font-mono"
                value={form.width}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setForm({ ...form, width: v, height: v });
                }}
              >
                {[512, 1024, 2048].map((v) => (
                  <option key={v} value={v}>
                    {v} × {v}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <span className="label">{t("Réseau", "Network")}</span>
            <div className="flex gap-2">
              {(["devnet", "mainnet-beta"] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => save({ network: n })}
                  className={cn("rounded-md border px-4 py-2 font-mono text-xs transition", c.network === n ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground")}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>
        <BaseStats initial={c.baseStats} onSave={(baseStats) => save({ baseStats })} />
      </div>
    </div>
  );
}

function BaseStats({ initial, onSave }: { initial: Record<string, number>; onSave: (v: Record<string, number>) => void }) {
  const [rows, setRows] = useState(Object.entries(initial));
  const [key, setKey] = useState("");
  const t = useT();
  const commit = (r: [string, number][]) => {
    setRows(r);
    onSave(Object.fromEntries(r.filter(([k]) => k.trim())));
  };
  return (
    <div className="panel p-6">
      <p className="eyebrow">{t("Stats de jeu (optionnel)", "Game stats (optional)")}</p>
      <p className="mt-2 text-sm text-muted-foreground">{t("Valeurs de base (0–100). Chaque trait peut ajouter un bonus/malus ; le total est exporté en attributs numériques.", "Base values (0–100). Each trait can add a bonus/malus; the total is exported as numeric attributes.")}</p>
      <div className="mt-5 space-y-2">
        {rows.map(([k, v], i) => (
          <div key={k} className="flex items-center gap-2">
            <span className="w-28 truncate font-mono text-sm capitalize">{k}</span>
            <input aria-label={k}
              type="number"
              min={0}
              max={100}
              className="field h-8 w-20 font-mono"
              defaultValue={v}
              onBlur={(e) => commit(rows.map((r, j) => (j === i ? [k, Math.max(0, Math.min(100, Number(e.target.value)))] : r)))}
            />
            <button type="button" aria-label={t(`Retirer ${k}`, `Remove ${k}`)} className="ml-auto text-muted-foreground hover:text-destructive" onClick={() => commit(rows.filter((_, j) => j !== i))}>
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const k = key.trim().toLowerCase();
          if (!k || rows.some(([x]) => x === k)) return;
          commit([...rows, [k, 50]]);
          setKey("");
        }}
      >
        <input aria-label={t("Nouvelle stat", "New stat")} className="field h-8" placeholder={t("ex. force, vitesse…", "e.g. strength, speed…")} value={key} onChange={(e) => setKey(e.target.value)} maxLength={20} />
        <Button type="submit" size="sm" variant="outline">
          <Plus /> {t("Ajouter", "Add")}
        </Button>
      </form>
    </div>
  );
}
