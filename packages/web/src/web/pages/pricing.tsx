import { SiteFooter, SiteHeader } from "../components/site-header";
import { PricingPlans } from "../components/pricing-plans";
import { useLang, useT } from "../lib/i18n";

const FAQ = {
  fr: [
    ["Qu'est-ce qui consomme mon quota ?", "Uniquement l'export ZIP (1 unité par NFT exporté) et la génération de traits IA (1 unité par image). Aperçus, générations et analyses de rareté sont illimités."],
    ["Puis-je ré-exporter la même collection ?", "Chaque export est décompté. Le ZIP reste téléchargeable depuis l'historique sans nouveau décompte."],
    ["Le paiement est-il sécurisé ?", "Le paiement passe par Stripe. Vous pouvez changer ou annuler votre plan à tout moment."],
    ["Les quotas se renouvellent ?", "Oui, chaque mois à la date d'abonnement."],
  ],
  en: [
    ["What consumes my quota?", "Only ZIP exports (1 unit per exported NFT) and AI trait generation (1 unit per image). Previews, generations and rarity analysis are unlimited."],
    ["Can I re-export the same collection?", "Each export is counted. The ZIP stays downloadable from the history at no extra cost."],
    ["Is payment secure?", "Payments go through Stripe. You can change or cancel your plan at any time."],
    ["Do quotas renew?", "Yes, every month on your subscription date."],
  ],
};

export default function Pricing() {
  const lang = useLang();
  const t = useT();
  return (
    <div className="noise min-h-screen">
      <SiteHeader />
      <section className="mx-auto max-w-7xl px-5 pb-24 pt-20">
        <p className="eyebrow">{t("Tarifs", "Pricing")}</p>
        <h1 className="mt-4 max-w-3xl text-6xl font-extrabold">{t("Un plan pour chaque drop.", "A plan for every drop.")}</h1>
        <p className="mt-5 max-w-xl text-lg text-foreground/70">{t("Commencez gratuitement avec 100 NFT exportés par mois. Passez à la vitesse supérieure quand votre collection est prête.", "Start free with 100 exported NFTs per month. Level up when your collection is ready.")}</p>
        <div className="mt-16">
          <PricingPlans />
        </div>
        <div className="mt-28 grid gap-10 lg:grid-cols-[0.6fr_1.4fr]">
          <h2 className="text-3xl font-extrabold">{t("Questions fréquentes", "FAQ")}</h2>
          <dl className="divide-y divide-border border-y border-border">
            {FAQ[lang].map(([q, a]) => (
              <div key={q} className="grid gap-2 py-6 md:grid-cols-[1fr_1.4fr] md:gap-8">
                <dt className="font-semibold">{q}</dt>
                <dd className="text-sm text-foreground/70">{a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
