import { useEffect, useRef, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { Check, Loader2 } from "lucide-react";
import { useCustomer } from "autumn-js/react";
import { useQueryClient } from "@tanstack/react-query";
import { orpc } from "../lib/api";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { inIframe } from "./brand";
import { authClient } from "../lib/auth";
import { cn } from "../lib/utils";
import { locale, tr, useT } from "../lib/i18n";

export const PLANS = [
  {
    id: "free",
    name: "Free",
    price: 0,
    tagline: ["Pour tester le moteur", "To try the engine"],
    exports: 100,
    ai: 10,
    features: [
      ["Génération & aperçu illimités", "Unlimited generation & preview"],
      ["100 NFT exportés / mois", "100 exported NFTs / month"],
      ["10 traits IA / mois", "10 AI traits / month"],
      ["Export Metaplex + Sugar", "Metaplex + Sugar export"],
      ["Démo procédurale incluse", "Procedural demo included"],
    ],
  },
  {
    id: "creator",
    name: "Creator",
    price: 19,
    tagline: ["Lancer une vraie collection", "Launch a real collection"],
    exports: 10000,
    ai: 200,
    features: [
      ["10 000 NFT exportés / mois", "10,000 exported NFTs / month"],
      ["200 traits IA / mois", "200 AI traits / month"],
      ["Plan d'action IA", "AI action plan"],
      ["Stats de jeu & rareté avancée", "Game stats & advanced rarity"],
      ["Script de déploiement devnet / mainnet", "Devnet / mainnet deploy script"],
    ],
    highlight: true,
  },
  {
    id: "studio",
    name: "Studio",
    price: 49,
    tagline: ["Studios & séries multiples", "Studios & multiple series"],
    exports: 50000,
    ai: 1000,
    features: [
      ["50 000 NFT exportés / mois", "50,000 exported NFTs / month"],
      ["1 000 traits IA / mois", "1,000 AI traits / month"],
      ["Collections illimitées", "Unlimited collections"],
      ["Export compatible CLI Python", "Python CLI compatible export"],
      ["Support prioritaire", "Priority support"],
    ],
  },
] as const;

export function PricingPlans() {
  const { data: session } = authClient.useSession();
  return session ? <AuthedPlans /> : <PlanGrid onPick={null} current={null} busy={null} />;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const RANK: Record<string, number> = { free: 0, creator: 1, studio: 2 };

function usePaidSub() {
  const ctx = useCustomer();
  const qc = useQueryClient();
  const sub = ctx.data?.subscriptions?.find((s) => s.status === "active" && s.planId !== "free") ?? null;
  const scheduled = ctx.data?.subscriptions?.find((s) => (s.status as string) === "scheduled" && s.planId !== "free")?.planId ?? null;
  /** Refresh Autumn's customer AND our own usage/plan query (header meters, quotas). */
  const refetch = async () => {
    await ctx.refetch();
    await qc.invalidateQueries({ queryKey: orpc.billing.key() });
  };
  return { ...ctx, sub, scheduled, refetch };
}

function AuthedPlans() {
  const { data: customer, attach, updateSubscription, sub, scheduled, refetch } = usePaidSub();
  const [busy, setBusy] = useState<string | null>(null);
  const current = sub?.planId ?? (customer ? "free" : null);
  const pick = async (planId: string) => {
    setBusy(planId);
    try {
      if (planId === "free" && sub) {
        if (!window.confirm(tr("Annuler l'abonnement ? Vous repasserez en Free à la fin de la période en cours.", "Cancel the subscription? You'll move back to Free at the end of the current period."))) return;
        await updateSubscription({ planId: sub.planId, cancelAction: "cancel_end_of_cycle" });
        toast.success(tr("Abonnement annulé en fin de période.", "Subscription will end at period end."));
        await refetch();
        return;
      }
      await attach({ planId, successUrl: `${window.location.origin}/app/billing?upgraded=1`, openInNewTab: inIframe() });
      if (inIframe()) toast.message(tr("Paiement ouvert dans un nouvel onglet (Stripe, mode test).", "Checkout opened in a new tab (Stripe, test mode)."));
      await refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tr("Impossible d'ouvrir le paiement", "Could not open checkout"));
    } finally {
      setBusy(null);
    }
  };
  // Plan picked on the public pricing page before sign-up: /app/billing?plan=creator → open checkout once.
  const search = useSearch();
  const [loc, navigate] = useLocation();
  const auto = useRef(false);
  useEffect(() => {
    const want = new URLSearchParams(search).get("plan");
    if (auto.current || !want || !customer || !(want in RANK) || want === "free") return;
    auto.current = true;
    navigate(loc, { replace: true });
    if (current !== want) void pick(want);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, customer]);
  return <PlanGrid onPick={pick} current={current} busy={busy} scheduled={sub?.canceledAt ? (scheduled ?? "free") : null} />;
}

/** Subscription status + Stripe portal + cancel / reactivate. Rendered on the billing page. */
export function SubscriptionPanel() {
  const { sub, scheduled, openCustomerPortal, updateSubscription, refetch } = usePaidSub();
  const [busy, setBusy] = useState<"portal" | "cancel" | "uncancel" | null>(null);
  const t = useT();
  if (!sub) return null;
  const end = sub.currentPeriodEnd ?? sub.expiresAt;
  const endTxt = end ? new Date(end).toLocaleDateString(locale(), { day: "numeric", month: "long", year: "numeric" }) : null;
  const run = async (k: "portal" | "cancel" | "uncancel") => {
    if (k === "cancel" && !window.confirm(tr("Annuler l'abonnement ? Il reste actif jusqu'à la fin de la période.", "Cancel the subscription? It stays active until the end of the period."))) return;
    setBusy(k);
    try {
      if (k === "portal") {
        await openCustomerPortal({ returnUrl: `${window.location.origin}/app/billing`, openInNewTab: inIframe() });
      } else {
        await updateSubscription({ planId: sub.planId, cancelAction: k === "cancel" ? "cancel_end_of_cycle" : "uncancel" });
        toast.success(k === "cancel" ? tr("Abonnement annulé en fin de période.", "Subscription will end at period end.") : tr("Abonnement réactivé.", "Subscription reactivated."));
        await refetch();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tr("Action impossible", "Action failed"));
    } finally {
      setBusy(null);
    }
  };
  const canceled = !!sub.canceledAt;
  return (
    <div className="panel mt-4 flex flex-wrap items-center justify-between gap-4 p-6">
      <div className="text-sm">
        <p className="font-semibold">
          {cap(sub.planId)} · {canceled ? <span className="text-destructive">{scheduled ? t("changement programmé", "change scheduled") : t("annulé", "canceled")}</span> : <span className="text-ok">{t("actif", "active")}</span>}
        </p>
        {endTxt && (
          <p className="mt-1 text-muted-foreground">
            {canceled
              ? scheduled
                ? t(`Actif jusqu'au ${endTxt}, puis passage au plan ${cap(scheduled)}.`, `Active until ${endTxt}, then switches to ${cap(scheduled)}.`)
                : t(`Actif jusqu'au ${endTxt}, puis retour au plan Free.`, `Active until ${endTxt}, then back to Free.`) : t(`Renouvellement le ${endTxt}.`, `Renews on ${endTxt}.`)}
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={busy !== null} onClick={() => run("portal")}>
          {busy === "portal" && <Loader2 className="animate-spin" />}
          {t("Factures & moyen de paiement", "Invoices & payment method")}
        </Button>
        {canceled ? (
          <Button disabled={busy !== null} onClick={() => run("uncancel")}>
            {busy === "uncancel" && <Loader2 className="animate-spin" />}
            {scheduled ? t(`Rester sur ${cap(sub.planId)}`, `Stay on ${cap(sub.planId)}`) : t("Réactiver", "Reactivate")}
          </Button>
        ) : (
          <Button variant="ghost" className="text-muted-foreground hover:text-destructive" disabled={busy !== null} onClick={() => run("cancel")}>
            {busy === "cancel" && <Loader2 className="animate-spin" />}
            {t("Annuler l'abonnement", "Cancel subscription")}
          </Button>
        )}
      </div>
    </div>
  );
}

function PlanGrid({
  onPick,
  current,
  busy,
  scheduled = null,
}: {
  onPick: ((id: string) => void) | null;
  current: string | null;
  busy: string | null;
  scheduled?: string | null;
}) {
  const [, navigate] = useLocation();
  const t = useT();
  return (
    <div className="grid gap-5 lg:grid-cols-3 lg:items-end">
      {PLANS.map((p) => {
        const isCurrent = current === p.id;
        const hl = "highlight" in p && p.highlight;
        return (
          <div
            key={p.id}
            className={cn(
              "relative flex flex-col rounded-[12px] border p-7",
              hl ? "border-primary/60 bg-[linear-gradient(180deg,#22160f,#15120f)] lg:pb-10 lg:pt-10 shadow-[0_0_80px_-30px_rgba(255,90,31,0.6)]" : "border-border bg-card",
            )}
          >
            {hl && <span className="absolute -top-3 left-7 rounded-full bg-primary px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-primary-foreground">{t("Le plus choisi", "Most popular")}</span>}
            <p className="eyebrow">{t(p.tagline[0], p.tagline[1])}</p>
            <h3 className="mt-2 text-2xl font-bold">{p.name}</h3>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="font-display text-5xl font-extrabold tracking-tight">{p.price}$</span>
              <span className="text-sm text-muted-foreground">{t("/ mois", "/ month")}</span>
            </div>
            <ul className="mt-6 flex-1 space-y-2.5 text-sm">
              {p.features.map(([fr, en]) => (
                <li key={fr} className="flex gap-2.5">
                  <Check className={cn("mt-0.5 size-4 shrink-0", hl ? "text-primary" : "text-muted-foreground")} />
                  <span className="text-foreground/85">{t(fr, en)}</span>
                </li>
              ))}
            </ul>
            <Button
              className="mt-8 w-full"
              variant={hl ? "default" : "outline"}
              size="lg"
              disabled={isCurrent || busy !== null || scheduled === p.id}
              onClick={() =>
                onPick
                  ? onPick(p.id)
                  : navigate(p.id === "free" ? "/sign-in?mode=signup" : `/sign-in?mode=signup&next=${encodeURIComponent(`/app/billing?plan=${p.id}`)}`)
              }
            >
              {busy === p.id && <Loader2 className="animate-spin" />}
              {isCurrent
                ? t("Plan actuel", "Current plan")
                : scheduled === p.id
                  ? t("Programmé", "Scheduled")
                : current && RANK[p.id] < RANK[current]
                  ? `${t("Rétrograder vers", "Downgrade to")} ${p.name}`
                  : p.id === "free"
                    ? t("Commencer", "Get started")
                    : `${t("Passer à", "Upgrade to")} ${p.name}`}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
