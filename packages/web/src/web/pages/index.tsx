import { useEffect, useState } from "react";
import { Link } from "wouter";
import { motion } from "motion/react";
import { ArrowRight, Boxes, Dices, FileCode2, Layers3, Rocket, Sparkles, Wand2 } from "lucide-react";
import { SiteFooter, SiteHeader } from "../components/site-header";
import { PricingPlans } from "../components/pricing-plans";
import { Button } from "../components/ui/button";
import { useT } from "../lib/i18n";

const LAYERS = [
  { src: "/images/showcase/layer-0.png", name: ["Fond", "Background"], trait: ["Braise", "Ember"], w: 30 },
  { src: "/images/showcase/layer-1.png", name: ["Corps", "Body"], trait: ["Or", "Gold"], w: 4 },
  { src: "/images/showcase/layer-2.png", name: ["Yeux", "Eyes"], trait: ["Laser", "Laser"], w: 2 },
  { src: "/images/showcase/layer-3.png", name: ["Bouche", "Mouth"], trait: ["Crocs", "Fangs"], w: 12 },
  { src: "/images/showcase/layer-4.png", name: ["Tête", "Head"], trait: ["Casque viking · IA", "Viking helmet · AI"], w: 6, ai: true },
];

function ExplodedStack() {
  const [open, setOpen] = useState(true);
  const t = useT();
  useEffect(() => {
    const id = setInterval(() => setOpen((o) => !o), 3800);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[520px] [perspective:1600px]">
      <div className="ember-glow absolute inset-[-20%] -z-10 blur-2xl" />
      <div className="absolute inset-0 [transform-style:preserve-3d] [transform:rotateX(58deg)_rotateZ(-38deg)]">
        {LAYERS.map((l, i) => (
          <motion.div
            key={l.src}
            className="absolute inset-[12%] [transform-style:preserve-3d]"
            initial={{ z: 0, opacity: 0 }}
            animate={{ z: open ? i * 62 : i * 2, opacity: 1 }}
            transition={{ type: "spring", stiffness: 70, damping: 16, delay: open ? i * 0.07 : (4 - i) * 0.05 }}
          >
            <div
              className={`relative size-full overflow-hidden rounded-[6px] ${open ? "outline outline-1 outline-[#ff5a1f]/30" : ""}`}
              style={{ boxShadow: open ? "0 30px 60px -20px rgba(0,0,0,.8)" : "none" }}
            >
              <img src={l.src} alt="" className="size-full object-contain" draggable={false} />
            </div>
          </motion.div>
        ))}
      </div>
      {/* labels */}
      <div className="pointer-events-none absolute -right-16 top-[6%] hidden flex-col gap-[38px] sm:flex">
        {[...LAYERS].reverse().map((l, i) => (
          <motion.div
            key={l.src}
            animate={{ opacity: open ? 1 : 0, x: open ? 0 : 12 }}
            transition={{ delay: open ? 0.35 + i * 0.06 : 0 }}
            className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider"
          >
            <span className="h-px w-6 bg-primary/60" />
            <span className="text-muted-foreground">{t(l.name[0], l.name[1])}</span>
            <span className={l.ai ? "text-gold" : "text-foreground"}>{t(l.trait[0], l.trait[1])}</span>
            <span className="text-primary">w{l.w}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function Marquee() {
  const imgs = Array.from({ length: 14 }, (_, i) => `/images/showcase/nft-${i}.jpg`);
  return (
    <div className="relative overflow-hidden border-y border-border bg-card py-5">
      <div className="absolute inset-y-0 left-0 z-10 w-32 bg-gradient-to-r from-card to-transparent" />
      <div className="absolute inset-y-0 right-0 z-10 w-32 bg-gradient-to-l from-card to-transparent" />
      <div className="animate-marquee flex w-max gap-4">
        {[...imgs, ...imgs].map((src, i) => (
          <div key={i} className="relative size-40 shrink-0 overflow-hidden rounded-[8px] border border-border">
            <img src={src} alt="" className="size-full object-cover" loading="lazy" />
            <span className="absolute bottom-1.5 left-1.5 rounded bg-black/60 px-1.5 font-mono text-[10px] text-foreground/80">
              #{((i * 37) % 500) + 1}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const fade = (d = 0) => ({ initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.6, delay: d, ease: [0.2, 0.7, 0.2, 1] as const } });

const STEPS = [
  { icon: Layers3, t: ["Calques & traits", "Layers & traits"], d: ["Glissez vos PNG, réglez poids, opacité, mode de fusion et position de chaque trait. Aperçu live.", "Drop your PNGs, tune weight, opacity, blend mode and position of every trait. Live preview."] },
  { icon: Sparkles, t: ["Traits IA", "AI traits"], d: ["Décrivez un trait : l'IA le dessine calé sur votre personnage, fond détouré, prêt à empiler.", "Describe a trait: the AI draws it aligned to your character, background removed, ready to stack."] },
  { icon: Dices, t: ["Génération déterministe", "Deterministic generation"], d: ["Tirage pondéré avec seed, zéro doublon, 10 000 NFT en quelques millisecondes.", "Seeded weighted sampling, zero duplicates, 10,000 NFTs in milliseconds."] },
  { icon: Boxes, t: ["Rareté", "Rarity"], d: ["Score statistique, rangs, histogramme, distribution réelle vs cible, filtres par trait.", "Statistical score, ranks, histogram, actual vs target distribution, trait filters."] },
  { icon: FileCode2, t: ["Candy Machine v3", "Candy Machine v3"], d: ["Prix, trésorerie, date, créateurs & royalties → config Sugar et script de déploiement.", "Price, treasury, date, creators & royalties → Sugar config and deploy script."] },
  { icon: Rocket, t: ["Export Metaplex", "Metaplex export"], d: ["ZIP prêt pour Sugar : images, JSON Token Metadata, rapports de rareté, deploy.sh.", "Sugar-ready ZIP: images, Token Metadata JSON, rarity reports, deploy.sh."] },
];

export default function Index() {
  const t = useT();
  return (
    <div className="noise min-h-screen">
      <SiteHeader />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="grid-lines absolute inset-0 [mask-image:radial-gradient(70%_60%_at_70%_40%,black,transparent)]" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-5 pb-20 pt-16 lg:grid-cols-[1.05fr_1fr] lg:pt-24">
          <div className="flex flex-col justify-center">
            <motion.p {...fade(0)} className="eyebrow flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-primary shadow-[0_0_10px_#ff5a1f]" /> {t("Générateur NFT", "NFT generator")} · Solana · Metaplex
            </motion.p>
            <motion.h1 {...fade(0.08)} className="mt-5 text-[clamp(2.6rem,5.2vw,4.9rem)] font-extrabold">
              <span className="whitespace-nowrap">{t("Forgez 10 000 NFT.", "Forge 10,000 NFTs.")}</span>
              <br />
              <span className="text-primary">{t("Lancez-les", "Launch them")}</span> {t("ce soir.", "tonight.")}
            </motion.h1>
            <motion.p {...fade(0.16)} className="mt-6 max-w-xl text-lg text-foreground/75">
              {t(
                "Forge-X assemble vos calques en collection unique, calcule la rareté, dessine les traits manquants avec l'IA et livre un export Candy Machine v3 prêt à déployer.",
                "Forge-X assembles your layers into a unique collection, scores rarity, draws missing traits with AI and ships a deploy-ready Candy Machine v3 export.",
              )}
            </motion.p>
            <motion.div {...fade(0.24)} className="mt-9 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="h-12 px-6 text-base">
                <Link to="/sign-in?mode=signup">
                  {t("Forger ma collection", "Forge my collection")} <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="ghost" className="h-12 px-5 text-base">
                <a href="#moteur">{t("Voir le moteur", "See the engine")}</a>
              </Button>
            </motion.div>
            <motion.dl {...fade(0.32)} className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-border pt-6">
              {[
                ["5 ms", t("500 NFT générés", "500 NFTs generated")],
                ["0", t("doublon garanti", "duplicates, guaranteed")],
                ["v3", "Candy Machine"],
              ].map(([k, v]) => (
                <div key={v}>
                  <dt className="font-display text-3xl font-extrabold">{k}</dt>
                  <dd className="mt-1 text-xs text-muted-foreground">{v}</dd>
                </div>
              ))}
            </motion.dl>
          </div>
          <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.9, delay: 0.2 }}>
            <ExplodedStack />
          </motion.div>
        </div>
      </section>

      <Marquee />

      {/* MOTEUR */}
      <section id="moteur" className="mx-auto max-w-7xl px-5 py-28">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <p className="eyebrow">01 — {t("Le moteur", "The engine")}</p>
            <h2 className="mt-4 text-5xl font-extrabold">{t("De la pile de PNG à la collection on-chain.", "From a stack of PNGs to an on-chain collection.")}</h2>
            <p className="mt-5 max-w-md text-foreground/70">
              {t(
                "Le même moteur que la version CLI Python, porté dans le navigateur : sampler pondéré, détection de doublons, combinatoire, stats de jeu et métadonnées Metaplex.",
                "The same engine as the Python CLI, ported to the browser: weighted sampler, duplicate detection, combinatorics, game stats and Metaplex metadata.",
              )}
            </p>
          </div>
          <div className="grid gap-px overflow-hidden rounded-[12px] border border-border bg-border sm:grid-cols-2">
            {STEPS.map((s, i) => (
              <div key={s.t[0]} className="group bg-card p-7 transition hover:bg-raised">
                <div className="flex items-center justify-between">
                  <s.icon className="size-6 text-primary" />
                  <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
                </div>
                <h3 className="mt-8 text-xl font-bold">{t(s.t[0], s.t[1])}</h3>
                <p className="mt-2 text-sm text-foreground/65">{t(s.d[0], s.d[1])}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* IA */}
      <section id="ia" className="relative overflow-hidden border-y border-border bg-card">
        <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 py-28 lg:grid-cols-2">
          <div className="relative">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
              <div className="checker aspect-square overflow-hidden rounded-[10px] border border-border">
                <img src="/images/showcase/nft-3.jpg" alt="" className="size-full object-cover" />
              </div>
              <Wand2 className="size-7 text-gold" />
              <div className="relative aspect-square overflow-hidden rounded-[10px] border border-gold/50 shadow-[0_0_60px_-20px_#ffb547]">
                <img src="/images/showcase/layer-0.png" alt="" className="absolute inset-0 size-full object-cover" />
                <img src="/images/showcase/layer-1.png" alt="" className="absolute inset-0 size-full object-contain" />
                <img src="/images/showcase/layer-2.png" alt="" className="absolute inset-0 size-full object-contain" />
                <img src="/images/showcase/layer-3.png" alt="" className="absolute inset-0 size-full object-contain" />
                <img src="/images/showcase/layer-4.png" alt="" className="absolute inset-0 size-full object-contain" />
              </div>
            </div>
            <div className="mt-5 rounded-[8px] border border-border bg-background p-4 font-mono text-[13px]">
              <span className="text-muted-foreground">prompt › </span>
              <span className="text-gold">{t("casque viking en bronze, cornes ivoire, style cartoon", "bronze viking helmet, ivory horns, cartoon style")}</span>
              <span className="ml-1 inline-block h-4 w-2 translate-y-0.5 animate-pulse bg-primary" />
            </div>
          </div>
          <div>
            <p className="eyebrow">02 — {t("Traits IA", "AI traits")}</p>
            <h2 className="mt-4 text-5xl font-extrabold">{t("Le trait qui manque, dessiné à la bonne place.", "The missing trait, drawn right where it belongs.")}</h2>
            <p className="mt-5 max-w-lg text-foreground/70">
              {t(
                "L'IA reçoit votre personnage en référence et ne dessine que l'élément demandé, au bon cadrage, dans votre style. Le fond est détouré automatiquement : le trait s'empile directement dans le calque.",
                "The AI gets your character as a reference and draws only the requested element, perfectly framed, in your style. The background is removed automatically: the trait stacks straight into the layer.",
              )}
            </p>
            <ul className="mt-8 space-y-3 text-sm">
              {[
                t("Référence des calques inférieurs pour un cadrage exact", "Lower layers used as reference for exact framing"),
                t("Mode fond plein ou élément isolé", "Full background or isolated element mode"),
                t("Ajustez ensuite position, échelle et poids", "Then tweak position, scale and weight"),
              ].map((x) => (
                <li key={x} className="flex gap-3">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-gold" />
                  {x}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* DEPLOIEMENT */}
      <section id="deploiement" className="mx-auto max-w-7xl px-5 py-28">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="eyebrow">03 — {t("Déploiement", "Deploy")}</p>
            <h2 className="mt-4 max-w-xl text-5xl font-extrabold">{t("Un ZIP. Une commande. Votre Candy Machine.", "One ZIP. One command. Your Candy Machine.")}</h2>
            <p className="mt-5 max-w-lg text-foreground/70">
              {t("Forge-X écrit le", "Forge-X writes the Sugar")} <code className="font-mono text-gold">config.json</code>
              {t(" Sugar, les guards (solPayment, startDate, botTax), les métadonnées Token Metadata et un ", ", the guards (solPayment, startDate, botTax), Token Metadata and a ")}
              <code className="font-mono text-gold">deploy.sh</code> {t("pour devnet ou mainnet.", "for devnet or mainnet.")}
            </p>
            <Button asChild size="lg" className="mt-9 h-12 px-6">
              <Link to="/sign-in?mode=signup">
                {t("Essayer avec la démo", "Try it with the demo")} <ArrowRight />
              </Link>
            </Button>
          </div>
          <pre className="overflow-hidden rounded-[12px] border border-border bg-[#0a0807] p-6 font-mono text-[12.5px] leading-6 text-foreground/80">
            <span className="text-muted-foreground"># forge-pilots-forge-x.zip</span>
            {"\n"}
            <span className="text-steel">collection/</span>
            {"\n  assets/0.png  0.json  …  499.json\n  collection.png  collection.json\n"}
            <span className="text-steel">config.json</span>
            {"      "}
            <span className="text-muted-foreground"># Sugar</span>
            {"\n"}
            <span className="text-steel">rarity_report.json</span>
            {"\n"}
            <span className="text-steel">deploy.sh</span>
            {"\n\n"}
            <span className="text-primary">$</span> ./deploy.sh{"\n"}
            <span className="text-ok">✔</span> upload 500/500{"\n"}
            <span className="text-ok">✔</span> candy machine deployed{"\n"}
            <span className="text-ok">✔</span> guards: solPayment 0.5 SOL · botTax{"\n"}
            <span className="text-gold">→</span> CnDy…x9Qf <span className="text-muted-foreground">(devnet)</span>
          </pre>
        </div>
      </section>

      {/* PRICING */}
      <section className="border-t border-border bg-card/40">
        <div className="mx-auto max-w-7xl px-5 py-28">
          <div className="mb-14 flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="eyebrow">{t("Tarifs", "Pricing")}</p>
              <h2 className="mt-4 text-5xl font-extrabold">{t("Générez gratuitement. Payez à l'export.", "Generate for free. Pay when you export.")}</h2>
            </div>
            <p className="max-w-sm text-sm text-foreground/65">{t("Aperçus, génération et analyse de rareté sont illimités. Les quotas portent sur les NFT exportés et les traits IA.", "Previews, generation and rarity analysis are unlimited. Quotas apply to exported NFTs and AI traits.")}</p>
          </div>
          <PricingPlans />
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
