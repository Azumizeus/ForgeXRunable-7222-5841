import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { Loader2 } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { authClient } from "../lib/auth";
import { Logo } from "../components/brand";
import { Button } from "../components/ui/button";
import { cn } from "../lib/utils";
import { LangSwitch, useT } from "../lib/i18n";

export default function SignIn() {
  const params = new URLSearchParams(useSearch());
  const [mode, setMode] = useState<"signin" | "signup">(params.get("mode") === "signup" ? "signup" : "signin");
  const next = params.get("next") || "/app";
  const [, navigate] = useLocation();
  const { data: session } = authClient.useSession();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"google" | "email" | null>(null);
  const [error, setError] = useState("");
  const t = useT();

  useEffect(() => {
    if (session) navigate(next.startsWith("/") ? next : "/app", { replace: true });
  }, [session, next, navigate]);

  const google = async () => {
    setError("");
    setBusy("google");
    const r = await authClient.managedAuth.signIn({ provider: "google" });
    if (r.error && r.error.code !== "POPUP_CLOSED") setError(r.error.message ?? t("Connexion Google impossible", "Google sign-in failed"));
    setBusy(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy("email");
    const r =
      mode === "signup"
        ? await authClient.signUp.email({ name: name || email.split("@")[0]!, email, password })
        : await authClient.signIn.email({ email, password });
    setBusy(null);
    if (r.error) {
      const m = r.error.message ?? "";
      setError(
        /invalid email or password/i.test(m)
          ? t("Email ou mot de passe incorrect.", "Invalid email or password.")
          : /already exists/i.test(m)
            ? t("Un compte existe déjà avec cet email.", "An account already exists with this email.")
            : /password.*short/i.test(m)
              ? t("Mot de passe trop court (8 caractères minimum).", "Password too short (8 characters minimum).")
              : m || t("Erreur", "Error"),
      );
    }
  };

  return (
    <div className="noise grid min-h-screen lg:grid-cols-[1fr_1.1fr]">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <div className="flex items-center justify-between">
          <Logo />
          <LangSwitch />
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          <h1 className="text-4xl font-extrabold">{mode === "signup" ? t("Créez votre forge", "Create your forge") : t("Bon retour", "Welcome back")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "signup" ? t("100 NFT exportés et 10 traits IA offerts chaque mois.", "100 exported NFTs and 10 AI traits free every month.") : t("Reprenez vos collections là où vous les avez laissées.", "Pick up your collections where you left off.")}
          </p>

          <Button variant="outline" size="lg" className="mt-8 h-11 w-full" onClick={google} disabled={busy !== null}>
            {busy === "google" ? <Loader2 className="animate-spin" /> : <FcGoogle className="size-5" />}
            {t("Continuer avec Google", "Continue with Google")}
          </Button>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> {t("ou par email", "or with email")} <span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label className="label" htmlFor="name">{t("Nom", "Name")}</label>
                <input aria-label={t("Nom", "Name")} id="name" className="field h-11" value={name} onChange={(e) => setName(e.target.value)} placeholder="Satoshi" autoComplete="name" />
              </div>
            )}
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input aria-label="Email" id="email" type="email" required className="field h-11" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("vous@studio.xyz", "you@studio.xyz")} autoComplete="email" />
            </div>
            <div>
              <label className="label" htmlFor="password">{t("Mot de passe", "Password")}</label>
              <input aria-label={t("Mot de passe", "Password")}
                id="password"
                type="password"
                required
                minLength={8}
                className="field h-11"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("8 caractères minimum", "8 characters minimum")}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
              />
            </div>
            {error && <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
            <Button type="submit" size="lg" className="h-11 w-full" disabled={busy !== null}>
              {busy === "email" && <Loader2 className="animate-spin" />}
              {mode === "signup" ? t("Créer mon compte", "Create my account") : t("Se connecter", "Sign in")}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signup" ? t("Déjà un compte ?", "Already have an account?") : t("Pas encore de compte ?", "No account yet?")}{" "}
            <button type="button" className="font-medium text-primary hover:underline" onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setError(""); }}>
              {mode === "signup" ? t("Se connecter", "Sign in") : t("Créer un compte", "Create an account")}
            </button>
          </p>
        </div>
      </div>
      <div className="relative hidden overflow-hidden border-l border-border bg-card lg:block">
        <div className="grid-lines absolute inset-0" />
        <div className="ember-glow absolute inset-0" />
        <div className="absolute inset-0 grid grid-cols-3 gap-4 p-10 [transform:rotate(-8deg)_scale(1.25)]">
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className={cn("aspect-square overflow-hidden rounded-[10px] border border-border", i % 2 && "translate-y-12")}>
              <img src={`/images/showcase/nft-${i}.jpg`} alt="" className="size-full object-cover" />
            </div>
          ))}
        </div>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-card via-card/90 to-transparent p-10 pt-32">
          <p className="font-display text-3xl font-extrabold">{t("« 500 pilotes uniques, rareté calculée, Candy Machine prête en 4 minutes. »", "“500 unique pilots, rarity scored, Candy Machine ready in 4 minutes.”")}</p>
          <p className="eyebrow mt-3">{t("Collection démo", "Demo collection")} · Forge Pilots</p>
        </div>
      </div>
    </div>
  );
}
