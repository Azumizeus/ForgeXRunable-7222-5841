import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { motion } from "motion/react";
import { ArrowUpRight, Layers3, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "../components/app-shell";
import { Button } from "../components/ui/button";
import { errMsg, orpc } from "../lib/api";
import { useCollections, useInvalidateCollection } from "../queries/forge";
import { authClient } from "../lib/auth";
import { locale, useT } from "../lib/i18n";

function Dashboard() {
  const { data, isPending } = useCollections();
  const { data: session } = authClient.useSession();
  const [, navigate] = useLocation();
  const inv = useInvalidateCollection();
  const [name, setName] = useState("");
  const t = useT();
  const create = useMutation(
    orpc.collections.create.mutationOptions({
      onSuccess: (r) => {
        inv();
        navigate(`/app/c/${r.id}`);
      },
      onError: (e) => toast.error(errMsg(e)),
    }),
  );
  const remove = useMutation(orpc.collections.remove.mutationOptions({ onSuccess: () => inv(), onError: (e) => toast.error(errMsg(e)) }));

  return (
    <main className="mx-auto max-w-7xl px-5 py-12">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow">{t(`Atelier de ${session?.user.name?.split(" ")[0] ?? "forge"}`, `${session?.user.name?.split(" ")[0] ?? "Your"}'s workshop`)}</p>
          <h1 className="mt-3 text-5xl font-extrabold">{t("Vos collections", "Your collections")}</h1>
        </div>
      </div>

      <div className="mt-10 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <form
          className="panel relative overflow-hidden p-6"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate({ name: name.trim() || t("Ma collection", "My collection"), demo: false });
          }}
        >
          <p className="eyebrow">{t("Nouvelle collection", "New collection")}</p>
          <div className="mt-4 flex gap-2">
            <input aria-label={t("Nom de la collection", "Collection name")} className="field h-11" placeholder={t("Nom de la collection", "Collection name")} maxLength={32} value={name} onChange={(e) => setName(e.target.value)} />
            <Button type="submit" size="lg" className="h-11" disabled={create.isPending}>
              {create.isPending && !create.variables?.demo ? <Loader2 className="animate-spin" /> : <Plus />} {t("Créer", "Create")}
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{t("Partez d'une toile vide et importez vos propres calques PNG.", "Start from a blank canvas and upload your own PNG layers.")}</p>
        </form>
        <button
          type="button"
          disabled={create.isPending}
          onClick={() => create.mutate({ name: "Forge Pilots", demo: true })}
          className="group relative overflow-hidden rounded-[10px] border border-primary/40 bg-[linear-gradient(120deg,#2a160c,#15120f_60%)] p-6 text-left transition hover:border-primary"
        >
          <div className="absolute -right-6 -top-6 flex gap-2 opacity-80 transition group-hover:scale-105">
            {[2, 5, 8].map((i) => (
              <img key={i} src={`/images/showcase/nft-${i}.jpg`} alt="" className="size-24 rotate-12 rounded-md border border-border object-cover" />
            ))}
          </div>
          <p className="eyebrow relative inline-block rounded bg-[#2a160c]/90 px-1.5 py-0.5 text-primary">{t("Démarrage rapide", "Quick start")}</p>
          <p className="relative mt-10 text-xl font-bold">{t("Collection démo · 5 calques, 25 traits", "Demo collection · 5 layers, 25 traits")}</p>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            {create.isPending && create.variables?.demo ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4 text-gold" />}
            {t("Prête à générer en un clic", "Ready to generate in one click")}
          </p>
        </button>
      </div>

      <div className="mt-12">
        {isPending ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="shimmer aspect-[4/5] rounded-[10px]" />
            ))}
          </div>
        ) : !data?.length ? (
          <div className="panel grid place-items-center px-6 py-20 text-center">
            <Layers3 className="size-10 text-muted-foreground" />
            <p className="mt-4 text-lg font-semibold">{t("Aucune collection pour l'instant", "No collections yet")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("Créez-en une ou lancez la démo pour voir le moteur en action.", "Create one or launch the demo to see the engine in action.")}</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {data.map((c, i) => (
              <motion.div key={c.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="group panel relative overflow-hidden">
                <Link to={`/app/c/${c.id}`} className="block">
                  <div className="checker relative aspect-square overflow-hidden">
                    {c.cover ? (
                      <img src={c.cover} alt="" className="size-full object-cover transition duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="grid size-full place-items-center font-display text-6xl font-extrabold text-border">{c.symbol.slice(0, 2)}</div>
                    )}
                    <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-foreground/80 backdrop-blur">
                      {c.network}
                    </span>
                    <ArrowUpRight className="absolute right-3 top-3 size-5 text-foreground opacity-0 transition group-hover:opacity-100" />
                  </div>
                  <div className="p-4">
                    <p className="truncate font-semibold">{c.name}</p>
                    <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                      {c.symbol} · {c.layers} {t("calques", "layers")} · {c.traits} traits · {c.generated ? `${c.generated.toLocaleString(locale())} ${t("générés", "generated")}` : `${c.size.toLocaleString(locale())} ${t("prévus", "planned")}`}
                    </p>
                  </div>
                </Link>
                <button
                  type="button"
                  title={t("Supprimer", "Delete")}
                  aria-label={t("Supprimer", "Delete")}
                  className="absolute bottom-4 right-3 rounded p-1 text-muted-foreground transition hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:hover)]:opacity-0"
                  onClick={() => {
                    if (confirm(t(`Supprimer « ${c.name} » ? Cette action est définitive.`, `Delete "${c.name}"? This cannot be undone.`))) remove.mutate({ id: c.id });
                  }}
                >
                  <Trash2 className="size-4" />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <AppShell>
      <Dashboard />
    </AppShell>
  );
}
