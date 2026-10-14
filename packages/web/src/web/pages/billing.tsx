import { useEffect } from "react";
import { useSearch } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "../components/app-shell";
import { PricingPlans, SubscriptionPanel } from "../components/pricing-plans";
import { useUsage } from "../queries/forge";
import { orpc } from "../lib/api";
import { cn } from "../lib/utils";
import { locale, tr, useT } from "../lib/i18n";

function Gauge({ label, used, granted, hint }: { label: string; used: number; granted: number; hint: string }) {
  const pct = granted ? Math.min(100, (used / granted) * 100) : 0;
  const t = useT();
  return (
    <div className="panel p-6">
      <p className="eyebrow">{label}</p>
      <div className="mt-4 flex items-baseline gap-2">
        <span className="font-display text-5xl font-extrabold">{Math.max(0, granted - used).toLocaleString(locale())}</span>
        <span className="text-sm text-muted-foreground">{t("restants sur", "left of")} {granted.toLocaleString(locale())}</span>
      </div>
      <div className="mt-5 h-2 overflow-hidden rounded-full bg-raised">
        <div className={cn("h-full rounded-full transition-all", pct > 85 ? "bg-destructive" : "bg-primary")} style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function Billing() {
  const usage = useUsage();
  const qc = useQueryClient();
  const search = useSearch();
  const t = useT();
  useEffect(() => {
    if (new URLSearchParams(search).get("upgraded")) {
      toast.success(tr("Abonnement activé. Merci !", "Subscription active. Thank you!"));
      qc.invalidateQueries({ queryKey: orpc.billing.key() });
    }
  }, [search, qc]);
  const u = usage.data;
  return (
    <main className="mx-auto max-w-7xl px-5 py-12">
      <p className="eyebrow">{t("Abonnement", "Billing")}</p>
      <h1 className="mt-3 text-5xl font-extrabold">
        Plan <span className="capitalize text-primary">{u?.plan ?? "…"}</span>
      </h1>
      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <Gauge label={t("NFT exportés ce mois", "NFTs exported this month")} used={u?.exports.used ?? 0} granted={u?.exports.granted ?? 0} hint={t("1 unité par NFT inclus dans un export ZIP.", "1 unit per NFT included in a ZIP export.")} />
        <Gauge label={t("Traits IA ce mois", "AI traits this month")} used={u?.ai.used ?? 0} granted={u?.ai.granted ?? 0} hint={t("1 unité par image générée par l'IA.", "1 unit per AI-generated image.")} />
      </div>
      <SubscriptionPanel />
      <h2 className="mb-8 mt-16 text-3xl font-extrabold">{t("Changer de plan", "Change plan")}</h2>
      <PricingPlans />
    </main>
  );
}

export default function BillingPage() {
  return (
    <AppShell>
      <Billing />
    </AppShell>
  );
}
