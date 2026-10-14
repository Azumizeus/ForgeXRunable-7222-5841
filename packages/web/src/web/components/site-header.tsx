import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { Logo } from "./brand";
import { Button } from "./ui/button";
import { authClient } from "../lib/auth";
import { LangSwitch, useT } from "../lib/i18n";

export function SiteHeader() {
  const { data: session } = authClient.useSession();
  const t = useT();
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/75 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
        <Logo />
        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <a href="/#moteur" className="transition hover:text-foreground">{t("Moteur", "Engine")}</a>
          <a href="/#ia" className="transition hover:text-foreground">{t("Traits IA", "AI traits")}</a>
          <a href="/#deploiement" className="transition hover:text-foreground">{t("Déploiement", "Deploy")}</a>
          <Link to="/pricing" className="transition hover:text-foreground">{t("Tarifs", "Pricing")}</Link>
        </nav>
        <div className="flex items-center gap-2">
          <LangSwitch className="mr-1" />
          {session ? (
            <Button asChild size="sm">
              <Link to="/app">
                {t("Ouvrir le studio", "Open studio")} <ArrowRight />
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link to="/sign-in">{t("Connexion", "Sign in")}</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/sign-in?mode=signup">
                  {t("Commencer gratuitement", "Start for free")} <ArrowRight />
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const t = useT();
  return (
    <footer className="border-t border-border">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm text-muted-foreground">
            {t(
              "Le générateur de collections NFT pour Solana : calques, rareté, traits IA, export Metaplex Candy Machine v3.",
              "The NFT collection generator for Solana: layers, rarity, AI traits, Metaplex Candy Machine v3 export.",
            )}
          </p>
        </div>
        <div className="text-sm">
          <p className="eyebrow mb-3">{t("Produit", "Product")}</p>
          <ul className="space-y-2 text-muted-foreground">
            <li><a href="/#moteur" className="hover:text-foreground">{t("Moteur de rareté", "Rarity engine")}</a></li>
            <li><a href="/#ia" className="hover:text-foreground">{t("Traits IA", "AI traits")}</a></li>
            <li><Link to="/pricing" className="hover:text-foreground">{t("Tarifs", "Pricing")}</Link></li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="eyebrow mb-3">Export</p>
          <ul className="space-y-2 text-muted-foreground">
            <li>Metaplex Token Metadata</li>
            <li>Sugar config.json</li>
            <li>{t("CLI Python compatible", "Python CLI compatible")}</li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="eyebrow mb-3">{t("Réseaux", "Networks")}</p>
          <ul className="space-y-2 text-muted-foreground">
            <li>Solana devnet</li>
            <li>Solana mainnet-beta</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-5 text-center font-mono text-[11px] text-muted-foreground">
        © {new Date().getFullYear()} Forge-X — {t("forgé pour Solana", "forged for Solana")}
      </div>
    </footer>
  );
}
