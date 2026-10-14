import { useState } from "react";
import { Move, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "../ui/button";
import { Range, useDraft } from "./kit";
import { useStudioMutations, type StudioData, type StudioTrait } from "../../queries/forge";
import { useT } from "../../lib/i18n";

type TF = { x: number; y: number; scale: number };

/** CSS mirror of composer.placed(): contain-fit, scale %, offset % of canvas. */
export function placedStyle(tf: TF): React.CSSProperties {
  return {
    position: "absolute",
    width: `${tf.scale}%`,
    height: `${tf.scale}%`,
    left: `${(100 - tf.scale) / 2 + tf.x}%`,
    top: `${(100 - tf.scale) / 2 + tf.y}%`,
    objectFit: "contain",
  };
}

export function TraitInspector({ data, layerIdx, trait, onClose }: { data: StudioData; layerIdx: number; trait: StudioTrait; onClose: () => void }) {
  const m = useStudioMutations();
  const layer = data.layers[layerIdx]!;
  const [tf, setTf] = useDraft<TF>(trait.transform as TF, (transform) => m.updateTrait.mutate({ id: trait.id, patch: { transform } }), 400);
  const [name, setName] = useDraft(trait.name, (n) => n.trim() && m.updateTrait.mutate({ id: trait.id, patch: { name: n.trim() } }), 600);
  const [stats, setStats] = useDraft<Record<string, number>>(trait.stats, (s) => m.updateTrait.mutate({ id: trait.id, patch: { stats: s } }), 600);
  const statKeys = Array.from(new Set([...Object.keys(data.collection.baseStats), ...Object.keys(stats)]));
  const [newKey, setNewKey] = useState("");
  const t = useT();
  const isDefault = tf.x === 0 && tf.y === 0 && tf.scale === 100;

  // reference: first trait of each other layer (back→front), so placement is judged in context
  const refs = data.layers.map((l, i) => ({ l, i, tr: i === layerIdx ? trait : l.traits[0] })).filter((r) => r.tr);

  return (
    <div className="panel overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <p className="eyebrow">{t("Inspecteur", "Inspector")} · {layer.name}</p>
        <button type="button" onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">
          {t("Fermer", "Close")}
        </button>
      </div>
      <div className="checker relative aspect-square overflow-hidden">
        {refs.map(({ l, i, tr }) => (
          <img
            key={l.id}
            src={tr!.url}
            alt=""
            style={{ ...placedStyle(i === layerIdx ? tf : (tr!.transform as TF)), opacity: i === layerIdx ? l.opacity / 100 : 0.35, mixBlendMode: (l.blendMode === "over" ? "normal" : l.blendMode) as React.CSSProperties["mixBlendMode"] }}
            className={i === layerIdx ? "drop-shadow-[0_0_0_rgba(0,0,0,0)]" : "grayscale"}
          />
        ))}
        <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
          {Array.from({ length: 9 }, (_, i) => (
            <div key={i} className="border border-white/5" />
          ))}
        </div>
      </div>
      <div className="space-y-5 p-4">
        <div>
          <span className="label">{t("Nom", "Name")}</span>
          <input aria-label={t("Nom", "Name")} className="field h-8" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Move className="size-3.5" /> {t("Position & échelle", "Position & scale")}
            </p>
            <button type="button" disabled={isDefault} onClick={() => setTf({ x: 0, y: 0, scale: 100 })} className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary disabled:opacity-30">
              <RotateCcw className="size-3" /> {t("Réinitialiser", "Reset")}
            </button>
          </div>
          {(
            [
              ["scale", t("Échelle", "Scale"), 5, 200],
              ["x", "Horizontal", -50, 50],
              ["y", "Vertical", -50, 50],
            ] as const
          ).map(([k, label, min, max]) => (
            <div key={k} className="grid grid-cols-[72px_1fr_44px] items-center gap-3">
              <span className="text-xs text-muted-foreground">{label}</span>
              <Range label={label} min={min} max={max} value={tf[k]} onChange={(v) => setTf({ ...tf, [k]: v })} />
              <span className="text-right font-mono text-xs">{tf[k]}%</span>
            </div>
          ))}
        </div>
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">{t("Bonus de stats", "Stat bonuses")}</p>
          {statKeys.length === 0 && <p className="text-xs text-muted-foreground/70">{t("Aucune stat définie (étape Collection).", "No stats defined (Collection step).")}</p>}
          <div className="space-y-2">
            {statKeys.map((k) => (
              <div key={k} className="grid grid-cols-[72px_1fr_44px] items-center gap-3">
                <span className="truncate font-mono text-xs capitalize">{k}</span>
                <Range label={k} min={-50} max={50} value={stats[k] ?? 0} onChange={(v) => setStats({ ...stats, [k]: v })} />
                <span className={`text-right font-mono text-xs ${(stats[k] ?? 0) > 0 ? "text-ok" : (stats[k] ?? 0) < 0 ? "text-destructive" : ""}`}>
                  {(stats[k] ?? 0) > 0 ? "+" : ""}
                  {stats[k] ?? 0}
                </span>
              </div>
            ))}
          </div>
          <form
            className="mt-2 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const k = newKey.trim().toLowerCase();
              if (k && !(k in stats)) setStats({ ...stats, [k]: 5 });
              setNewKey("");
            }}
          >
            <input aria-label={t("nouvelle stat", "new stat")} className="field h-7 text-xs" placeholder={t("nouvelle stat", "new stat")} value={newKey} onChange={(e) => setNewKey(e.target.value)} maxLength={20} />
          </form>
        </div>
        {data.layers.length > 1 && (
          <div>
            <span className="label">{t("Déplacer vers le calque", "Move to layer")}</span>
            <select
              aria-label={t("Déplacer vers le calque", "Move to layer")}
              className="field h-8 text-xs"
              value={layer.id}
              disabled={m.moveTrait.isPending}
              onChange={(e) => m.moveTrait.mutate({ id: trait.id, layerId: e.target.value }, { onSuccess: onClose })}
            >
              {data.layers.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => {
            if (!confirm(t(`Supprimer le trait « ${trait.name} » ?`, `Delete trait "${trait.name}"?`))) return;
            m.removeTrait.mutate({ id: trait.id });
            onClose();
          }}
        >
          <Trash2 /> {t("Supprimer le trait", "Delete trait")}
        </Button>
      </div>
    </div>
  );
}
