import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChevronLeft, ChevronRight, Crown, Hammer, Loader2, Search } from "lucide-react";
import { Button } from "../ui/button";
import { CodeBlock, Modal, StepHeader, fmt } from "./kit";
import { nftQuery, nftsQuery, rarityQuery, type StudioData } from "../../queries/forge";
import { cn } from "../../lib/utils";
import { useLang, useT } from "../../lib/i18n";
import type { AppRouterClient } from "../../../api";

type Tiers = { name: string; upToRank: number }[];
const TIER_STYLE: Record<string, string> = {
  Légendaire: "bg-gold text-[#1a1004]",
  Épique: "bg-primary text-primary-foreground",
  Rare: "bg-steel text-[#06121d]",
  "Peu commun": "bg-ok/80 text-[#04140a]",
  Commun: "bg-raised text-muted-foreground",
};
const tierOf = (rank: number, tiers: Tiers) => tiers.find((x) => rank <= x.upToRank)?.name ?? "Commun";
const TIER_EN: Record<string, string> = { Légendaire: "Legendary", Épique: "Epic", Rare: "Rare", "Peu commun": "Uncommon", Commun: "Common" };
const tierLabel = (name: string, lang: string) => (lang === "en" ? (TIER_EN[name] ?? name) : name);

export function StepGallery({ data, onBack }: { data: StudioData; onBack: () => void }) {
  const t = useT();
  const [tab, setTab] = useState<"gallery" | "rarity">("gallery");
  const rarity = useQuery({ ...rarityQuery(data.collection.id), enabled: !!data.generation });
  const [open, setOpen] = useState<number | null>(null);

  if (!data.generation)
    return (
      <div>
        <StepHeader n="5" title={t("Galerie & rareté", "Gallery & rarity")} />
        <div className="panel grid place-items-center p-16 text-center">
          <Hammer className="size-10 text-muted-foreground" />
          <p className="mt-3 font-semibold">{t("Générez d'abord la collection", "Generate the collection first")}</p>
          <Button className="mt-4" onClick={onBack}>
            {t("Aller à la génération", "Go to generation")}
          </Button>
        </div>
      </div>
    );

  return (
    <div>
      <StepHeader n="5" title={t("Galerie & rareté", "Gallery & rarity")} desc={t("Score de rareté statistique (Σ 1/fréquence par trait), rang 1 = le plus rare. Comparez la distribution réelle à vos poids cibles.", "Statistical rarity score (Σ 1/frequency per trait), rank 1 = rarest. Compare the real distribution with your target weights.")}>
        <div className="flex rounded-md border border-border p-0.5">
          {(
            [
              ["gallery", t("Galerie", "Gallery")],
              ["rarity", t("Analyse", "Analysis")],
            ] as [typeof tab, string][]
          ).map(([k, l]) => (
            <button key={k} type="button" onClick={() => setTab(k)} className={cn("rounded px-4 py-1.5 text-sm transition", tab === k ? "bg-raised text-foreground" : "text-muted-foreground")}>
              {l}
            </button>
          ))}
        </div>
      </StepHeader>
      {tab === "gallery" ? <Gallery data={data} rarity={rarity.data} onOpen={setOpen} /> : <Analysis rarity={rarity.data} onOpen={setOpen} />}
      <NftModal collectionId={data.collection.id} edition={open} tiers={rarity.data?.tiers ?? []} onClose={() => setOpen(null)} onNav={setOpen} total={data.generation.generated} />
    </div>
  );
}

type Rarity = Awaited<ReturnType<AppRouterClient["generate"]["rarity"]>>;

function Gallery({ data, rarity, onOpen }: { data: StudioData; rarity?: Rarity; onOpen: (e: number) => void }) {
  const t = useT();
  const lang = useLang();
  const [sort, setSort] = useState<"edition" | "rarest" | "common">("edition");
  const [trait, setTrait] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 48;
  const q = useQuery(nftsQuery({ collectionId: data.collection.id, page, pageSize, sort, trait: trait || undefined, search: search || undefined }));
  const pages = q.data ? Math.max(1, Math.ceil(q.data.total / pageSize)) : 1;
  const turn = (p: number) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const groups = rarity ? rarity.layers.map((l) => ({ ...l, rows: rarity.distribution.filter((d) => d.layer === l.name) })) : [];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input aria-label={t("Rechercher une édition", "Search an edition")} className="field h-9 w-32 pl-8 font-mono" placeholder="#123" value={search} onChange={(e) => (setSearch(e.target.value), setPage(0))} />
        </div>
        <select aria-label={t("Tri", "Sort")} className="field h-9 w-auto" value={sort} onChange={(e) => (setSort(e.target.value as typeof sort), setPage(0))}>
          <option value="edition">{t("Par édition", "By edition")}</option>
          <option value="rarest">{t("Plus rares d'abord", "Rarest first")}</option>
          <option value="common">{t("Plus communs d'abord", "Most common first")}</option>
        </select>
        <select aria-label={t("Filtrer par trait", "Filter by trait")} className="field h-9 w-auto max-w-[260px]" value={trait} onChange={(e) => (setTrait(e.target.value), setPage(0))}>
          <option value="">{t("Tous les traits", "All traits")}</option>
          {groups.map((g) => (
            <optgroup key={g.id} label={g.name}>
              {g.rows.map((r) => (
                <option key={`${g.id}-${r.traitId}`} value={r.traitId ?? `none:${g.id}`}>
                  {r.trait} ({r.count})
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <span className="ml-auto font-mono text-xs text-muted-foreground">{q.data ? `${fmt(q.data.total)} ${t("résultat(s)", "result(s)")}` : ""}</span>
      </div>
      <div className={cn("grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6 2xl:grid-cols-8", q.isPlaceholderData && "opacity-60")}>
        {q.isPending
          ? Array.from({ length: 24 }, (_, i) => <div key={i} className="shimmer aspect-square rounded-md" />)
          : q.data?.items.map((it) => {
              const tier = tierOf(it.rank, rarity?.tiers ?? []);
              return (
                <button aria-label={`#${it.edition + 1} · ${tierLabel(tier, lang)}`} key={it.edition} type="button" onClick={() => onOpen(it.edition)} className="group overflow-hidden rounded-[8px] border border-border bg-card text-left transition hover:border-primary/60">
                  <div className="checker aspect-square overflow-hidden">
                    <img src={it.image} alt="" className="size-full object-cover transition duration-300 group-hover:scale-105" loading="lazy" />
                  </div>
                  <div className="flex items-center justify-between px-2 py-1.5">
                    <span className="font-mono text-[11px]">#{it.edition + 1}</span>
                    <span className={cn("rounded px-1 font-mono text-[9px] font-bold", TIER_STYLE[tier])}>R{it.rank}</span>
                  </div>
                </button>
              );
            })}
      </div>
      {pages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button variant="outline" size="icon-sm" aria-label={t("Page précédente", "Previous page")} disabled={page === 0} onClick={() => turn(page - 1)}>
            <ChevronLeft />
          </Button>
          <span className="font-mono text-xs">
            {page + 1} / {pages}
          </span>
          <Button variant="outline" size="icon-sm" aria-label={t("Page suivante", "Next page")} disabled={page >= pages - 1} onClick={() => turn(page + 1)}>
            <ChevronRight />
          </Button>
        </div>
      )}
    </div>
  );
}

function Analysis({ rarity, onOpen }: { rarity?: Rarity; onOpen: (e: number) => void }) {
  const t = useT();
  const lang = useLang();
  if (!rarity) return <Loader2 className="mx-auto size-6 animate-spin text-primary" />;
  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <div className="panel p-5">
          <p className="eyebrow">{t("Distribution des scores", "Score distribution")}</p>
          <div className="mt-4 h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rarity.histogram} margin={{ left: -20, right: 4 }}>
                <XAxis dataKey="score" tick={{ fill: "#9a8f82", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#9a8f82", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: "rgba(255,90,31,0.08)" }} contentStyle={{ background: "#1c1814", border: "1px solid #2a241e", borderRadius: 8, fontSize: 12 }} labelFormatter={(l) => `Score ≈ ${l}`} formatter={(v) => [v, "NFT"]} />
                <Bar dataKey="count" fill="#ff5a1f" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {rarity.tiers.map((x) => (
              <span key={x.name} className={cn("rounded px-2 py-0.5 font-mono text-[10px] font-bold", TIER_STYLE[x.name])}>
                {tierLabel(x.name, lang)} · top {x.pct}% · ≤ R{x.upToRank}
              </span>
            ))}
          </div>
        </div>
        <div className="panel p-5">
          <p className="eyebrow flex items-center gap-1.5">
            <Crown className="size-3.5 text-gold" /> {t("Top 12 les plus rares", "Top 12 rarest")}
          </p>
          <div className="mt-4 grid grid-cols-4 gap-2">
            {rarity.top.map((x) => (
              <button aria-label={`#${x.edition + 1}`} key={x.edition} type="button" onClick={() => onOpen(x.edition)} className="checker relative aspect-square overflow-hidden rounded-md border border-border hover:border-gold">
                <img src={x.image} alt="" className="size-full object-cover" />
                <span className="absolute left-1 top-1 rounded bg-black/70 px-1 font-mono text-[9px] text-gold">R{x.rank}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {rarity.layers.map((l) => {
          const rows = rarity.distribution.filter((d) => d.layer === l.name);
          const max = Math.max(...rows.map((r) => Math.max(r.percent, r.targetPercent)), 1);
          return (
            <div key={l.id} className="panel p-5">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{l.name}</p>
                <p className="font-mono text-[10px] text-muted-foreground">
                  <span className="text-primary">■</span> {t("réel", "actual")} <span className="ml-2 text-steel">│</span> {t("cible", "target")}
                </p>
              </div>
              <div className="mt-4 space-y-2.5">
                {rows.map((r) => {
                  const drift = r.percent - r.targetPercent;
                  return (
                    <div key={r.trait}>
                      <div className="flex justify-between text-xs">
                        <span className={r.traitId ? "" : "italic text-muted-foreground"}>{r.trait}</span>
                        <span className="font-mono text-muted-foreground">
                          {r.percent.toFixed(1)}% <span className={Math.abs(drift) > 3 ? "text-gold" : ""}>({drift >= 0 ? "+" : ""}{drift.toFixed(1)})</span>
                        </span>
                      </div>
                      <div className="relative mt-1 h-1.5 rounded-full bg-raised">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${(r.percent / max) * 100}%` }} />
                        <div className="absolute -top-0.5 h-2.5 w-0.5 bg-steel" style={{ left: `${(r.targetPercent / max) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NftModal({ collectionId, edition, tiers, onClose, onNav, total }: { collectionId: string; edition: number | null; tiers: Tiers; onClose: () => void; onNav: (e: number) => void; total: number }) {
  const t = useT();
  const lang = useLang();
  const q = useQuery({ ...nftQuery(collectionId, edition ?? 0), enabled: edition !== null, placeholderData: (p) => p });
  const d = q.data;
  useEffect(() => {
    if (edition === null) return;
    const k = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && edition > 0) onNav(edition - 1);
      if (e.key === "ArrowRight" && edition < total - 1) onNav(edition + 1);
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [edition, total, onNav]);
  const tier = d ? tierOf(d.rank, tiers) : "";
  return (
    <Modal open={edition !== null} onClose={onClose} title={edition !== null ? `#${edition + 1}` : ""} wide>
      {!d ? (
        <div className="grid h-80 place-items-center">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 [&>*]:min-w-0">
          <div>
            <div className={cn("checker aspect-square overflow-hidden rounded-[10px] border border-border transition", q.isPlaceholderData && "opacity-60")}>
              <img src={d.image} alt={`#${d.edition + 1}`} className="size-full object-cover" />
            </div>
            <div className="mt-3 flex items-center justify-between">
              <Button variant="outline" size="sm" disabled={d.edition === 0} onClick={() => onNav(d.edition - 1)}>
                <ChevronLeft /> {t("Préc.", "Prev")}
              </Button>
              <a href={d.image} download={`${d.edition}.png`} className="whitespace-nowrap text-xs text-muted-foreground hover:text-primary">
                PNG 1024 px
              </a>
              <Button variant="outline" size="sm" disabled={d.edition >= total - 1} onClick={() => onNav(d.edition + 1)}>
                {t("Suiv.", "Next")} <ChevronRight />
              </Button>
            </div>
          </div>
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <span className={cn("rounded px-2 py-1 font-mono text-xs font-bold", TIER_STYLE[tier])}>{tierLabel(tier, lang)}</span>
              <span className="font-mono text-sm">
                {t("Rang", "Rank")} {d.rank} / {fmt(d.total)}
              </span>
              <span className="ml-auto font-mono text-xs text-muted-foreground">score {d.score.toFixed(1)}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {d.attributes
                .filter((a) => a.display_type !== "number")
                .map((a) => (
                  <div key={a.trait_type} className="rounded-md border border-border bg-background/50 px-3 py-2">
                    <p className="eyebrow text-[9px]">{a.trait_type}</p>
                    <p className="truncate text-sm font-medium">{String(a.value)}</p>
                  </div>
                ))}
            </div>
            {Object.keys(d.stats).length > 0 && (
              <div className="space-y-2">
                {Object.entries(d.stats).map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[80px_1fr_28px] items-center gap-2 text-xs">
                    <span className="capitalize text-muted-foreground">{k}</span>
                    <div className="h-1.5 rounded-full bg-raised">
                      <div className="h-full rounded-full bg-gold" style={{ width: `${Math.max(0, Math.min(100, v))}%` }} />
                    </div>
                    <span className="text-right font-mono">{v}</span>
                  </div>
                ))}
              </div>
            )}
            <CodeBlock filename={`${d.edition}.json`} code={JSON.stringify(d.metadata, null, 2)} />
          </div>
        </div>
      )}
    </Modal>
  );
}
