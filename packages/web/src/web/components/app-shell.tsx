import { Link, useLocation } from "wouter";
import { LogOut, Sparkles, Zap } from "lucide-react";
import { Logo } from "./brand";
import { RequireAuth } from "./require-auth";
import { authClient, signOut } from "../lib/auth";
import { useUsage } from "../queries/forge";
import { cn } from "../lib/utils";
import { LangSwitch, locale, useT } from "../lib/i18n";

function Meter({ label, used, granted, icon: Icon }: { label: string; used: number; granted: number; icon: typeof Zap }) {
  const pct = granted ? Math.min(100, (used / granted) * 100) : 0;
  return (
    <div className="hidden min-w-[150px] lg:block">
      <div className="flex items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        <span className="flex items-center gap-1">
          <Icon className="size-3" />
          {label}
        </span>
        <span className="text-foreground/80">
          {used.toLocaleString(locale())}/{granted.toLocaleString(locale())}
        </span>
      </div>
      <div className="mt-1 h-1 overflow-hidden rounded-full bg-raised">
        <div className={cn("h-full rounded-full", pct > 85 ? "bg-destructive" : "bg-primary")} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const [loc, navigate] = useLocation();
  const { data: session } = authClient.useSession();
  const usage = useUsage();
  const t = useT();
  const nav = [
    { to: "/app", label: "Collections", active: loc === "/app" || loc.startsWith("/app/c/") },
    { to: "/app/billing", label: t("Abonnement", "Billing"), active: loc.startsWith("/app/billing") },
  ];
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="flex h-14 items-center gap-2 px-3 sm:gap-6 sm:px-5">
          <Logo to="/app" className="[&>span:last-child]:hidden sm:[&>span:last-child]:inline" />
          <nav className="flex items-center gap-1 text-sm">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className={cn("whitespace-nowrap rounded-md px-2 py-1.5 transition sm:px-3", n.active ? "bg-raised text-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2 sm:gap-6">
            {usage.data && (
              <>
                <Meter label="Exports" used={usage.data.exports.used} granted={usage.data.exports.granted} icon={Zap} />
                <Meter label={t("Traits IA", "AI traits")} used={usage.data.ai.used} granted={usage.data.ai.granted} icon={Sparkles} />
                <Link
                  to="/app/billing"
                  className={cn(
                    "hidden whitespace-nowrap rounded-full border px-2.5 py-0.5 font-mono sm:inline-block text-[10px] font-bold uppercase tracking-widest",
                    usage.data.plan === "free" ? "border-border text-muted-foreground hover:border-primary hover:text-primary" : "border-gold/50 text-gold",
                  )}
                >
                  {usage.data.plan === "free" ? t("Free · Passer Pro", "Free · Upgrade") : usage.data.plan}
                </Link>
              </>
            )}
            <div className="flex items-center gap-2">
              <LangSwitch className="sm:mr-1" />
              <div className="hidden size-8 place-items-center overflow-hidden sm:grid rounded-full bg-raised text-xs font-bold uppercase">
                {session?.user.image ? <img src={session.user.image} alt="" className="size-full object-cover" /> : session?.user.name?.[0]}
              </div>
              <button
                type="button"
                title={t("Déconnexion", "Sign out")}
                aria-label={t("Déconnexion", "Sign out")}
                onClick={async () => {
                  await signOut();
                  navigate("/");
                }}
                className="rounded-md p-1.5 text-muted-foreground transition hover:bg-raised hover:text-foreground"
              >
                <LogOut className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <Shell>{children}</Shell>
    </RequireAuth>
  );
}
