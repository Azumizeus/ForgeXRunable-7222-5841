import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Download, FileArchive, Hammer, Loader2, Rocket, XCircle, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { StepHeader, fmt } from "./kit";
import { client, errMsg, isQuotaError, orpc } from "../../lib/api";
import { exportsQuery, useUsage, type StudioData } from "../../queries/forge";
import { cn } from "../../lib/utils";
import { locale, tr, useT } from "../../lib/i18n";

const STATUS: Record<string, [string, string]> = { queued: ["En file", "Queued"], rendering: ["Rendu des images", "Rendering images"], uploading: ["Finalisation", "Finalizing"], done: ["Prêt", "Ready"], error: ["Échec", "Failed"] };

export function StepExport({ data, onBack }: { data: StudioData; onBack: () => void }) {
  const t = useT();
  const st = (k: string) => (STATUS[k] ? t(...STATUS[k]) : k);
  const qc = useQueryClient();
  const usage = useUsage();
  const list = useQuery(exportsQuery(data.collection.id));
  const [active, setActive] = useState<string | null>(null);
  const [quota, setQuota] = useState<string | null>(null);
  const [dl, setDl] = useState<string | null>(null);
  const running = list.data?.find((e) => ["queued", "rendering", "uploading"].includes(e.status));
  const watch = active ?? running?.id ?? null;
  const status = useQuery({ ...orpc.exports.status.queryOptions({ input: { id: watch ?? "" } }), enabled: !!watch, refetchInterval: (q) => (q.state.data && ["done", "error"].includes(q.state.data.status) ? false : 1200) });

  useEffect(() => {
    const s = status.data?.status;
    if (s === "done" || s === "error") {
      setActive(null);
      qc.invalidateQueries({ queryKey: orpc.exports.key() });
      qc.invalidateQueries({ queryKey: orpc.billing.key() });
      if (s === "done") toast.success(tr("Export prêt au téléchargement", "Export ready to download"));
    }
  }, [status.data?.status, qc]);

  const start = useMutation(
    orpc.exports.start.mutationOptions({
      onSuccess: (r) => {
        setQuota(null);
        setActive(r.id);
        qc.invalidateQueries({ queryKey: orpc.exports.key() });
      },
      onError: (e) => (isQuotaError(e) ? setQuota(errMsg(e)) : toast.error(errMsg(e))),
    }),
  );

  const download = async (id: string) => {
    setDl(id);
    try {
      const { url } = await client.exports.download({ id });
      // presigned URL carries Content-Disposition: attachment → downloads without leaving the page
      const a = document.createElement("a");
      a.href = url;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setTimeout(() => setDl(null), 800);
    }
  };

  const gen = data.generation;
  if (!gen)
    return (
      <div>
        <StepHeader n="7" title={t("Export & déploiement", "Export & deploy")} />
        <div className="panel grid place-items-center p-16 text-center">
          <Hammer className="size-10 text-muted-foreground" />
          <p className="mt-3 font-semibold">{t("Générez d'abord la collection", "Generate the collection first")}</p>
          <Button className="mt-4" onClick={onBack}>
            {t("Aller à la génération", "Go to generation")}
          </Button>
        </div>
      </div>
    );

  const s = status.data;
  const pct = s && s.total ? Math.round((s.progress / s.total) * 100) : 0;
  const remaining = usage.data?.exports.remaining;
  const short =
    remaining !== undefined && remaining < gen.generated
      ? tr(
          `Quota d'export insuffisant : ${fmt(gen.generated)} NFT à exporter, ${fmt(remaining)} restants ce mois-ci.`,
          `Not enough export quota: ${fmt(gen.generated)} NFT to export, ${fmt(remaining)} left this month.`,
        )
      : null;
  const quotaMsg = quota ?? short;

  return (
    <div>
      <StepHeader n="7" title={t("Export & déploiement", "Export & deploy")} desc={t("Rendu haute résolution de chaque NFT + métadonnées Metaplex, config Sugar et script de déploiement, dans un ZIP prêt à l'emploi.", "High-resolution render of every NFT + Metaplex metadata, Sugar config and deploy script, in a ready-to-use ZIP.")} />
      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <div className="panel relative overflow-hidden p-7">
          <div className="ember-glow absolute -right-20 -top-20 size-80 opacity-60" />
          <div className="relative">
            <FileArchive className="size-8 text-primary" />
            <p className="mt-4 font-display text-3xl font-extrabold">
              {fmt(gen.generated)} NFT · {data.collection.width}px
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("Consomme", "Uses")} {fmt(gen.generated)} {t("unité(s) d'export", "export unit(s)")}
              {remaining !== undefined && <> · {fmt(remaining)} {t("restantes ce mois-ci", "left this month")}</>}
            </p>

            {s && watch ? (
              <div className="mt-7">
                <div className="flex justify-between font-mono text-xs">
                  <span>{st(s.status)}</span>
                  <span>
                    {fmt(s.progress)}/{fmt(s.total)} · {pct}%
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-raised">
                  <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
                </div>
              </div>
            ) : quotaMsg ? (
              <div className="mt-7 rounded-md border border-gold/50 bg-gold/10 p-4">
                <p className="flex items-center gap-2 font-semibold">
                  <Zap className="size-4 text-gold" /> {t("Quota insuffisant", "Not enough quota")}
                </p>
                <p className="mt-1 text-sm text-foreground/80">{quotaMsg}</p>
                <Button asChild className="mt-3">
                  <Link to="/app/billing">
                    {usage.data?.plan === "creator"
                      ? t("Passer à Studio — 50 000 NFT/mois", "Upgrade to Studio — 50,000 NFT/month")
                      : usage.data?.plan === "studio"
                        ? t("Voir mon abonnement", "View my plan")
                        : t("Passer à Creator — 10 000 NFT/mois", "Upgrade to Creator — 10,000 NFT/month")}
                  </Link>
                </Button>
              </div>
            ) : null}

            <Button size="lg" className="mt-7 h-12 px-6 text-base" disabled={start.isPending || !!watch || !!short} onClick={() => start.mutate({ collectionId: data.collection.id })}>
              {start.isPending || watch ? <Loader2 className="animate-spin" /> : <Rocket />}
              {watch ? t("Export en cours…", "Exporting…") : t("Lancer l'export", "Start export")}
            </Button>
          </div>
        </div>

        <div className="panel p-6">
          <p className="eyebrow">{t("Déployer avec Sugar", "Deploy with Sugar")}</p>
          <ol className="mt-4 space-y-4 text-sm">
            {[
              [t("Installez Solana CLI + Sugar", "Install Solana CLI + Sugar"), "sh -c \"$(curl -sSfL https://sugar.metaplex.com/install.sh)\""],
              [t("Dézippez l'export", "Unzip the export"), "unzip *-forge-x.zip && cd collection"],
              [t("Lancez le déploiement", "Run the deployment"), "chmod +x deploy.sh && ./deploy.sh"],
              [t("Vérifiez sur devnet", "Verify on devnet"), "sugar verify && sugar show"],
            ].map(([label, cmd], i) => (
              <li key={label} className="flex gap-3">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-raised font-mono text-[11px] text-primary">{i + 1}</span>
                <div className="min-w-0">
                  <p className="font-medium">{label}</p>
                  <code className="mt-1 block truncate rounded bg-background px-2 py-1 font-mono text-[11px] text-gold">{cmd}</code>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="mt-8">
        <p className="eyebrow mb-3">{t("Historique des exports", "Export history")}</p>
        {!list.data?.length ? (
          <p className="text-sm text-muted-foreground">{t("Aucun export pour l'instant.", "No exports yet.")}</p>
        ) : (
          <div className="panel divide-y divide-border">
            {list.data.map((e) => (
              <div key={e.id} className="flex flex-wrap items-center gap-4 px-5 py-3">
                {e.status === "done" ? <CheckCircle2 className="size-4 text-ok" /> : e.status === "error" ? <XCircle className="size-4 text-destructive" /> : <Loader2 className="size-4 animate-spin text-primary" />}
                <span className="font-mono text-xs">{new Date(e.createdAt).toLocaleString(locale())}</span>
                <span className="text-sm">{fmt(e.total)} NFT</span>
                {e.sizeBytes ? <span className="font-mono text-xs text-muted-foreground">{(e.sizeBytes / 1024 / 1024).toFixed(1)} {t("Mo", "MB")}</span> : null}
                <span className={cn("text-xs", e.status === "error" ? "text-destructive" : "text-muted-foreground")}>{e.status === "error" ? e.error : st(e.status)}</span>
                {e.status === "done" && (
                  <Button size="sm" variant="outline" className="ml-auto" disabled={dl === e.id} onClick={() => download(e.id)}>
                    {dl === e.id ? <Loader2 className="animate-spin" /> : <Download />} {t("Télécharger", "Download")}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
