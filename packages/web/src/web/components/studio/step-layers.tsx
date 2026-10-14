import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Dices, Eye, ImagePlus, Layers3, Loader2, Plus, RefreshCw, Shapes, Sparkles, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Range, StepHeader, Toggle, fmt, useDraft } from "./kit";
import { AiDialog } from "./ai-dialog";
import { TraitInspector, placedStyle } from "./trait-inspector";
import { uploadTraits } from "./uploads";
import { blendModesQuery, feasibilityQuery, previewQuery, useInvalidateCollection, useStudioMutations, type StudioData, type StudioLayer } from "../../queries/forge";
import { cn } from "../../lib/utils";
import { useT } from "../../lib/i18n";

const PRESETS: { id: string; label: [string, string]; fn: (n: number, i: number) => number }[] = [
  { id: "flat", label: ["Équilibré", "Balanced"], fn: () => 10 },
  { id: "pyramid", label: ["Pyramide", "Pyramid"], fn: (n, i) => Math.max(1, Math.round(40 * 0.6 ** ((i / Math.max(1, n - 1)) * (n - 1)))) },
  { id: "legend", label: ["1 légendaire", "1 legendary"], fn: (n, i) => (i === n - 1 ? 1 : 20) },
];

const clampW = (v: string) => Math.max(0, Math.min(10000, Math.round(Number(v) || 0)));

export function StepLayers({ data, dataVersion }: { data: StudioData; dataVersion: number }) {
  const m = useStudioMutations();
  const [sel, setSel] = useState<string | null>(data.layers[data.layers.length - 1]?.id ?? null);
  const [traitSel, setTraitSel] = useState<string | null>(null);
  const [newLayer, setNewLayer] = useState("");
  const t = useT();
  const layers = data.layers;
  const layerIdx = Math.max(0, layers.findIndex((l) => l.id === sel));
  const layer = layers[layerIdx];
  useEffect(() => {
    if (!layers.find((l) => l.id === sel)) setSel(layers[layers.length - 1]?.id ?? null);
  }, [layers, sel]);
  const trait = layer?.traits.find((x) => x.id === traitSel);

  const move = (i: number, dir: -1 | 1) => {
    const ids = layers.map((l) => l.id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j]!, ids[i]!];
    m.reorderLayers.mutate({ collectionId: data.collection.id, ids });
  };

  return (
    <div>
      <StepHeader
        n="2"
        title={t("Calques & traits", "Layers & traits")}
        desc={t(
          "Empilez vos calques de l'arrière vers l'avant, importez vos PNG ou générez des traits par IA. Les poids définissent la rareté.",
          "Stack your layers from back to front, upload your PNGs or generate traits with AI. Weights define rarity.",
        )}
      />
      <div className="grid gap-5 lg:grid-cols-[220px_1fr] xl:grid-cols-[240px_1fr_320px]">
        {/* Layer stack */}
        <div className="panel self-start p-3">
          <p className="eyebrow px-1 pb-2">{t("Pile · avant ↑", "Stack · front ↑")}</p>
          <div className="space-y-1">
            {[...layers].reverse().map((l) => {
              const i = layers.indexOf(l);
              return (
                <div
                  key={l.id}
                  className={cn(
                    "group flex items-center gap-2 rounded-md border px-2 py-2 transition",
                    l.id === layer?.id ? "border-primary/60 bg-primary/10" : "border-transparent hover:bg-raised",
                  )}
                >
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    onClick={() => {
                      setSel(l.id);
                      setTraitSel(null);
                    }}
                  >
                    <span className="checker size-8 shrink-0 overflow-hidden rounded">{l.traits[0] && <img src={l.traits[0].url} alt="" className="size-full object-contain" />}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{l.name}</span>
                      <span className="block font-mono text-[10px] text-muted-foreground">
                        {l.traits.length} traits{l.allowNone ? " · opt." : ""}
                      </span>
                    </span>
                  </button>
                  <div className="flex flex-col transition group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:hover)]:opacity-0">
                    <button type="button" className="text-muted-foreground hover:text-foreground disabled:opacity-20" disabled={i === layers.length - 1} aria-label={t("Monter", "Move up")} onClick={() => move(i, 1)}>
                      <ArrowUp className="size-3.5" />
                    </button>
                    <button type="button" className="text-muted-foreground hover:text-foreground disabled:opacity-20" disabled={i === 0} aria-label={t("Descendre", "Move down")} onClick={() => move(i, -1)}>
                      <ArrowDown className="size-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <form
            className="mt-3 flex gap-1.5 border-t border-border pt-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!newLayer.trim()) return;
              m.createLayer.mutate({ collectionId: data.collection.id, name: newLayer.trim() }, { onSuccess: (r) => setSel(r.id) });
              setNewLayer("");
            }}
          >
            <input aria-label={t("Nouveau calque", "New layer")} className="field h-8 text-xs" placeholder={t("Nouveau calque", "New layer")} value={newLayer} onChange={(e) => setNewLayer(e.target.value)} maxLength={40} />
            <Button type="submit" size="icon-sm" aria-label={t("Ajouter le calque", "Add layer")} disabled={m.createLayer.isPending || !newLayer.trim()}>
              <Plus />
            </Button>
          </form>
          {!layers.length && <p className="mt-3 px-1 text-xs text-muted-foreground">{t("Ex. Fond, Corps, Yeux, Bouche, Tête. Le premier calque créé est à l'arrière.", "E.g. Background, Body, Eyes, Mouth, Head. The first layer created sits at the back.")}</p>}
        </div>

        {/* Layer editor */}
        {layer ? (
          <LayerEditor key={layer.id} layer={layer} isBottom={layerIdx === 0} selectedTrait={traitSel} onSelectTrait={setTraitSel} />
        ) : (
          <div className="panel grid place-items-center p-16 text-center">
            <Layers3 className="size-10 text-muted-foreground" />
            <p className="mt-3 font-semibold">{t("Créez votre premier calque", "Create your first layer")}</p>
          </div>
        )}

        {/* Right column */}
        <div className="space-y-5 lg:col-span-2 lg:grid lg:grid-cols-2 lg:items-start lg:gap-5 lg:space-y-0 xl:col-span-1 xl:block xl:space-y-5">
          {trait && layer ? <TraitInspector key={trait.id} data={data} layerIdx={layerIdx} trait={trait} onClose={() => setTraitSel(null)} /> : <LivePreview data={data} version={dataVersion} />}
        </div>
      </div>
    </div>
  );
}

function LayerEditor({ layer, isBottom, selectedTrait, onSelectTrait }: { layer: StudioLayer; isBottom: boolean; selectedTrait: string | null; onSelectTrait: (id: string | null) => void }) {
  const m = useStudioMutations();
  const inv = useInvalidateCollection();
  const blends = useQuery(blendModesQuery());
  const fileRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [up, setUp] = useState<{ done: number; total: number } | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const t = useT();
  const [name, setName] = useDraft(layer.name, (n) => n.trim() && m.updateLayer.mutate({ id: layer.id, patch: { name: n.trim() } }), 700);
  const [opacity, setOpacity] = useDraft(layer.opacity, (v) => m.updateLayer.mutate({ id: layer.id, patch: { opacity: v } }), 400);
  const [noneW, setNoneW] = useDraft(layer.noneWeight, (v) => m.updateLayer.mutate({ id: layer.id, patch: { noneWeight: v } }), 400);
  const wsum = layer.traits.reduce((s, x) => s + x.weight, 0) + (layer.allowNone ? noneW : 0) || 1;

  const upload = async (files: File[]) => {
    const imgs = files.filter((f) => /\.(png|webp|jpe?g|gif|svg)$/i.test(f.name));
    if (!imgs.length) return toast.error(t("Formats acceptés : PNG, WEBP, JPG, GIF, SVG", "Accepted formats: PNG, WEBP, JPG, GIF, SVG"));
    setUp({ done: 0, total: imgs.length });
    const r = await uploadTraits(layer.id, imgs, (done, total) => setUp({ done, total }));
    setUp(null);
    await inv();
    if (r.ok) toast.success(t(`${r.ok} trait(s) ajouté(s) à ${layer.name}`, `${r.ok} trait(s) added to ${layer.name}`));
    for (const e of r.errors.slice(0, 3)) toast.error(e);
  };

  return (
    <div
      className={cn("panel relative min-w-0 p-5", drag && "border-primary")}
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDrag(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        upload(Array.from(e.dataTransfer.files));
      }}
    >
      {drag && (
        <div className="absolute inset-0 z-10 grid place-items-center rounded-[10px] bg-primary/10 backdrop-blur-[2px]">
          <p className="flex items-center gap-2 font-semibold text-primary">
            <Upload className="size-5" /> {t("Déposez vos PNG dans", "Drop your PNGs into")} « {layer.name} »
          </p>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <input aria-label={t("Nom du calque", "Layer name")} className="field h-9 max-w-[220px] font-display text-lg font-bold" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
        <div className="ml-auto flex flex-wrap gap-2">
          <input aria-label={t("Importer des images", "Upload images")} ref={fileRef} type="file" multiple accept="image/png,image/webp,image/jpeg,image/gif,image/svg+xml" className="hidden" onChange={(e) => (upload(Array.from(e.target.files ?? [])), (e.target.value = ""))} />
          <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={!!up}>
            {up ? <Loader2 className="animate-spin" /> : <ImagePlus />}
            {up ? `${up.done}/${up.total}` : t("Importer", "Upload")}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setAiOpen(true)} className="border-gold/40 text-gold hover:bg-gold/10 hover:text-gold">
            <Sparkles /> {t("Trait IA", "AI trait")}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => m.demoTraits.mutate({ layerId: layer.id, count: 4 })} disabled={m.demoTraits.isPending} title={t("Traits procéduraux de démonstration", "Procedural demo traits")}>
            {m.demoTraits.isPending ? <Loader2 className="animate-spin" /> : <Shapes />} {t("Démo", "Demo")}
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            className="text-muted-foreground hover:text-destructive"
            title={t("Supprimer le calque", "Delete layer")}
            onClick={() => confirm(t(`Supprimer le calque « ${layer.name} » et ses ${layer.traits.length} traits ?`, `Delete layer "${layer.name}" and its ${layer.traits.length} traits?`)) && m.removeLayer.mutate({ id: layer.id })}
          >
            <Trash2 />
          </Button>
        </div>
      </div>

      <div className="mt-5 grid gap-4 rounded-md border border-border bg-background/40 p-4 sm:grid-cols-3">
        <div>
          <span className="label">{t("Mode de fusion", "Blend mode")}</span>
          <select
            aria-label={t("Mode de fusion", "Blend mode")} className="field h-8 font-mono text-xs" value={layer.blendMode} onChange={(e) => m.updateLayer.mutate({ id: layer.id, patch: { blendMode: e.target.value } })}>
            {(blends.data ?? ["over"]).map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
        <div>
          <span className="label">{t("Opacité", "Opacity")} · {opacity}%</span>
          <Range label={t("Opacité", "Opacity")} min={0} max={100} value={opacity} onChange={setOpacity} className="mt-3" />
        </div>
        <div>
          <span className="label">{t("Calque optionnel", "Optional layer")}</span>
          <Toggle checked={layer.allowNone} onChange={(v) => m.updateLayer.mutate({ id: layer.id, patch: { allowNone: v } })} label={layer.allowNone ? t("Activé", "Enabled") : t("Toujours présent", "Always present")} />
          {layer.allowNone && (
            <div className="mt-2 flex items-center gap-2 whitespace-nowrap">
              <span className="text-[11px] text-muted-foreground">{t("Vide", "None")}</span>
              <input aria-label={t("Poids vide", "None weight")} type="number" min={0} className="field h-7 w-14 font-mono text-xs" value={noneW || ""} placeholder="0" max={10000} onChange={(e) => setNoneW(clampW(e.target.value))} />
              <span className="font-mono text-[11px] text-muted-foreground">{((noneW / wsum) * 100).toFixed(1)}%</span>
            </div>
          )}
        </div>
      </div>

      {layer.traits.length > 1 && (
        <div className="mt-4 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{t("Préréglages de rareté :", "Rarity presets:")}</span>
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => m.bulkWeights.mutate({ layerId: layer.id, weights: layer.traits.map((x, i) => ({ id: x.id, weight: p.fn(layer.traits.length, i) })) })}
              className="rounded-full border border-border px-2.5 py-0.5 text-[11px] text-muted-foreground hover:border-primary hover:text-primary"
            >
              {t(p.label[0], p.label[1])}
            </button>
          ))}
        </div>
      )}

      {layer.traits.length === 0 ? (
        <button type="button" onClick={() => fileRef.current?.click()} className="mt-5 grid w-full place-items-center rounded-[10px] border-2 border-dashed border-border py-16 text-center transition hover:border-primary/60">
          <Upload className="size-8 text-muted-foreground" />
          <p className="mt-3 font-semibold">{t("Glissez vos PNG ici", "Drop your PNGs here")}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t("Fond transparent, même cadrage pour tous les calques. Le nom du fichier devient le nom du trait.", "Transparent background, same framing for every layer. The file name becomes the trait name.")}</p>
        </button>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-4">
          {layer.traits.map((x) => (
            <TraitCard key={x.id} trait={x} pct={(x.weight / wsum) * 100} selected={selectedTrait === x.id} onSelect={() => onSelectTrait(selectedTrait === x.id ? null : x.id)} />
          ))}
        </div>
      )}
      <AiDialog layer={layer} isBottom={isBottom} open={aiOpen} onClose={() => setAiOpen(false)} />
    </div>
  );
}

function TraitCard({ trait, pct, selected, onSelect }: { trait: StudioLayer["traits"][number]; pct: number; selected: boolean; onSelect: () => void }) {
  const m = useStudioMutations();
  const [w, setW] = useDraft(trait.weight, (v) => m.updateTrait.mutate({ id: trait.id, patch: { weight: v } }), 450);
  const t = useT();
  const tier = pct < 3 ? "text-gold" : pct < 10 ? "text-primary" : "text-muted-foreground";
  return (
    <div className={cn("group overflow-hidden rounded-[8px] border bg-background/40 transition", selected ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-muted-foreground/50")}>
      <button type="button" onClick={onSelect} className="checker relative block aspect-square w-full overflow-hidden">
        <img src={trait.url} alt={trait.name} style={placedStyle(trait.transform)} loading="lazy" />
        {trait.source === "ai" && <span className="absolute left-1.5 top-1.5 rounded bg-gold px-1.5 font-mono text-[9px] font-bold text-[#1a1004]">{t("IA", "AI")}</span>}
        <span className="absolute right-1.5 top-1.5 rounded bg-black/60 p-1 opacity-0 transition group-hover:opacity-100">
          <Eye className="size-3" />
        </span>
      </button>
      <div className="space-y-1.5 p-2.5">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-xs font-medium">{trait.name}</p>
          <span className={cn("font-mono text-[10px]", tier)}>{pct.toFixed(1)}%</span>
        </div>
        <div className="flex items-center gap-2">
          <Range label={t(`Poids ${trait.name}`, `${trait.name} weight`)} min={0} max={Math.max(100, w)} value={w} onChange={setW} />
          <input
            aria-label={t(`Poids ${trait.name}`, `${trait.name} weight`)}
            type="number"
            min={0}
            max={10000}
            className="field h-6 w-12 shrink-0 px-1 text-right font-mono text-[10px]"
            value={w || ""}
            placeholder="0"
            onChange={(e) => setW(clampW(e.target.value))}
          />
        </div>
      </div>
    </div>
  );
}

function LivePreview({ data, version }: { data: StudioData; version: number }) {
  const [seed, setSeed] = useState("live");
  const q = useQuery(previewQuery(data.collection.id, `${seed}-${version}`));
  const f = useQuery(feasibilityQuery(data.collection.id));
  const t = useT();
  return (
    <>
      <div className="panel p-4">
        <div className="flex items-center justify-between">
          <p className="eyebrow">{t("Aperçu live", "Live preview")}</p>
          <button type="button" onClick={() => setSeed(Math.random().toString(36).slice(2, 8))} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
            <RefreshCw className={cn("size-3.5", q.isFetching && "animate-spin")} /> {t("Relancer", "Shuffle")}
          </button>
        </div>
        {q.data && q.data.items.length > 0 ? (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {q.data.items.map((it, i) => (
              <div key={`${it.image}-${i}`} className="checker aspect-square overflow-hidden rounded-md" title={it.attributes.map((a) => `${a.trait_type}: ${a.value}`).join("\n")}>
                <img src={`${it.image}&v=${version}`} alt="" className="size-full object-cover" />
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-3 grid aspect-[4/3] place-items-center rounded-md border border-dashed border-border text-center text-xs text-muted-foreground">
            <div>
              <Dices className="mx-auto mb-2 size-6" />
              {t("Ajoutez au moins un trait par calque obligatoire", "Add at least one trait per required layer")}
            </div>
          </div>
        )}
      </div>
      {f.data && (
        <div className="panel p-4">
          <p className="eyebrow">{t("Combinatoire", "Combinatorics")}</p>
          <p className="mt-2 font-display text-3xl font-extrabold">{fmt(f.data.maxCombinations)}</p>
          <p className="text-xs text-muted-foreground">{t("combinaisons uniques pour", "unique combinations for")} {fmt(f.data.requested)} NFT</p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-raised">
            <div
              className={cn("h-full rounded-full", f.data.level === "comfortable" || f.data.level === "ok" ? "bg-ok" : f.data.level === "high" ? "bg-gold" : "bg-destructive")}
              style={{ width: `${Math.min(100, f.data.ratio * 100)}%` }}
            />
          </div>
          <p className="mt-3 text-xs text-foreground/70">{f.data.recommendation}</p>
        </div>
      )}
    </>
  );
}
