import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Plus, X } from "lucide-react";
import { Button } from "../ui/button";
import { CodeBlock, Stat, StepHeader, Toggle, fmt, useDraft } from "./kit";
import { candyQuery, useStudioMutations, type StudioData } from "../../queries/forge";
import { cn } from "../../lib/utils";
import { useT } from "../../lib/i18n";

const toLocal = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export function StepContract({ data }: { data: StudioData }) {
  const t = useT();
  const c = data.collection;
  const m = useStudioMutations();
  const candy = useQuery(candyQuery(c.id));
  const save = (patch: Parameters<typeof m.updateCollection.mutate>[0]["patch"]) => m.updateCollection.mutate({ id: c.id, patch });
  const [price, setPrice] = useDraft(c.candy.price, (price) => save({ candy: { price } }), 600);
  const [treasury, setTreasury] = useDraft(c.candy.treasury, (treasury) => save({ candy: { treasury: treasury.trim() } }), 700);
  const [royalty, setRoyalty] = useDraft(c.royaltyBps, (royaltyBps) => save({ royaltyBps }), 600);
  const [creators, setCreators] = useDraft(c.creators, (creators) => save({ creators: creators.map((x) => ({ ...x, address: x.address.trim() })) }), 700);
  const shareSum = creators.reduce((s, x) => s + x.share, 0);
  const size = data.generation?.generated ?? c.size;

  return (
    <div>
      <StepHeader n="6" title="Candy Machine v3" desc={t("Paramètres de mint et guards Metaplex. Le config.json Sugar et le script de déploiement sont générés en direct.", "Mint settings and Metaplex guards. The Sugar config.json and deploy script are generated live.")} />
      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="space-y-5">
          <div className="panel space-y-5 p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <span className="label">{t("Prix de mint (SOL)", "Mint price (SOL)")}</span>
                <input aria-label={t("Prix de mint (SOL)", "Mint price (SOL)")} className="field font-mono" type="number" min={0} step={0.01} value={price} onChange={(e) => setPrice(Math.max(0, Number(e.target.value)))} />
              </div>
              <div>
                <span className="label">{t("Royalties secondaires (%)", "Secondary royalties (%)")}</span>
                <input aria-label={t("Royalties secondaires (%)", "Secondary royalties (%)")} className="field font-mono" type="number" min={0} max={100} step={0.5} value={royalty / 100} onChange={(e) => setRoyalty(Math.round(Number(e.target.value) * 100))} />
              </div>
            </div>
            <div>
              <span className="label">{t("Trésorerie (reçoit les paiements de mint)", "Treasury (receives mint payments)")}</span>
              <input aria-label={t("Trésorerie", "Treasury")} className="field font-mono text-xs" placeholder={t("Adresse wallet Solana", "Solana wallet address")} value={treasury} onChange={(e) => setTreasury(e.target.value)} maxLength={64} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <span className="label">{t("Ouverture du mint", "Mint go-live")}</span>
                <input aria-label={t("Ouverture du mint", "Mint go-live")}
                  className="field font-mono text-xs"
                  type="datetime-local"
                  defaultValue={toLocal(c.candy.goLiveDate)}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (!v) return save({ candy: { goLiveDate: null } });
                    const d = new Date(v);
                    if (!Number.isNaN(d.getTime()) && d.getFullYear() > 2000) save({ candy: { goLiveDate: d.toISOString() } });
                  }}
                />
              </div>
              <div>
                <span className="label">Standard</span>
                <div className="flex gap-2">
                  {(
                    [
                      ["nft", "NFT"],
                      ["pnft", t("pNFT (royalties forcées)", "pNFT (enforced royalties)")],
                    ] as ["nft" | "pnft", string][]
                  ).map(([v, l]) => (
                    <button key={v} type="button" onClick={() => save({ candy: { tokenStandard: v } })} className={cn("rounded-md border px-3 py-2 text-xs transition", c.candy.tokenStandard === v ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground")}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-6">
              <Toggle checked={c.candy.botTax} onChange={(botTax) => save({ candy: { botTax } })} label={t("Bot tax (0,01 SOL)", "Bot tax (0.01 SOL)")} />
              <Toggle checked={c.candy.isSequential} onChange={(isSequential) => save({ candy: { isSequential } })} label={t("Mint séquentiel", "Sequential mint")} />
            </div>
          </div>

          <div className="panel p-6">
            <div className="flex items-center justify-between">
              <p className="eyebrow">{t("Créateurs & parts de royalties", "Creators & royalty shares")}</p>
              <span className={cn("font-mono text-xs", shareSum === 100 ? "text-ok" : "text-gold")}>Σ {shareSum}%</span>
            </div>
            <div className="mt-4 space-y-2">
              {creators.map((cr, i) => (
                <div key={i} className="flex gap-2">
                  <input aria-label={t("Adresse wallet", "Wallet address")} className="field h-9 font-mono text-xs" placeholder={t("Adresse wallet", "Wallet address")} value={cr.address} maxLength={64} onChange={(e) => setCreators(creators.map((x, j) => (j === i ? { ...x, address: e.target.value } : x)))} />
                  <input aria-label={t("Part (%)", "Share (%)")} className="field h-9 w-20 font-mono text-xs" type="number" min={0} max={100} value={cr.share} onChange={(e) => setCreators(creators.map((x, j) => (j === i ? { ...x, share: Math.max(0, Math.min(100, Number(e.target.value))) } : x)))} />
                  <Button variant="ghost" size="icon" aria-label={t("Retirer", "Remove")} onClick={() => setCreators(creators.filter((_, j) => j !== i))}>
                    <X />
                  </Button>
                </div>
              ))}
            </div>
            {creators.length < 5 && (
              <Button variant="outline" size="sm" className="mt-3" onClick={() => setCreators([...creators, { address: "", share: creators.length ? 0 : 100 }])}>
                <Plus /> {t("Ajouter un créateur", "Add creator")}
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-5">
          {candy.data && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <Stat label="Supply" value={fmt(size)} />
                <Stat label={t("Revenu mint max", "Max mint revenue")} value={`${fmt(Math.round(candy.data.revenue.mint * 100) / 100)} ◎`} tone="primary" />
                <Stat label="Royalties" value={`${candy.data.revenue.royaltyPct}%`} tone="gold" />
              </div>
              {candy.data.warnings.length ? (
                <div className="space-y-1.5 rounded-md border border-gold/40 bg-gold/5 p-4">
                  {candy.data.warnings.map((w) => (
                    <p key={w} className="flex gap-2 text-sm">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-gold" /> {w}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="flex items-center gap-2 rounded-md border border-ok/40 bg-ok/5 p-4 text-sm">
                  <CheckCircle2 className="size-4 text-ok" /> {t("Configuration prête au déploiement.", "Configuration ready to deploy.")}
                </p>
              )}
              <CodeBlock filename="config.json" code={JSON.stringify(candy.data.config, null, 2)} />
              <CodeBlock filename="deploy.sh" code={candy.data.script} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
