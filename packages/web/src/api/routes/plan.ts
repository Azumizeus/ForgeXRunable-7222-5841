import { z } from "zod";
import { eq } from "drizzle-orm";
import { generateText } from "ai";
import dedent from "dedent";
import { authed } from "../middleware/auth";
import { db } from "../database";
import { actionPlans } from "../database/schema";
import { loadTree, ownCollection, parse } from "../lib/own";
import { gateway } from "../lib/gateway";
import { feasibility } from "../engine/combinatorics";
import { lang, nf } from "../lib/i18n";

function fallbackPlan(name: string, size: number, network: string, price: number) {
  if (lang() === "en")
    return dedent`
    ## Action plan — ${name}

    ### 1. Art direction (D-30)
    - Lock a palette and a line style shared by every layer.
    - Plan 6 to 12 traits per layer: rarity needs headroom.

    ### 2. Rarity & economics (D-21)
    - Aim for under 50% of possible combinations for ${nf(size)} NFT.
    - 1 to 2 "legendary" traits (weight ≤ 2) per key layer.
    - Indicative mint price: ${price} SOL.

    ### 3. Community (D-14)
    - Open X/Twitter + Discord, tease 1 trait per day.
    - Whitelist the first 100 active members.

    ### 4. Testing (D-7)
    - Deploy on **devnet** with \`deploy.sh\`, mint 5 NFT, check metadata on Solana Explorer.

    ### 5. Launch (D0) — ${network}
    - Export the collection, run \`deploy.sh\` on mainnet, publish the Candy Machine address.
    - List on Magic Eden / Tensor as soon as the mint ends.
  `;
  return dedent`
    ## Plan d'action — ${name}

    ### 1. Direction artistique (J-30)
    - Fixez une palette et un style de trait communs à tous les calques.
    - Prévoyez 6 à 12 traits par calque : la rareté a besoin de marge.

    ### 2. Rareté & économie (J-21)
    - Visez moins de 50 % des combinaisons possibles pour ${nf(size)} NFT.
    - 1 à 2 traits « légendaires » (poids ≤ 2) par calque clé.
    - Prix de mint indicatif : ${price} SOL.

    ### 3. Communauté (J-14)
    - Ouvrez X/Twitter + Discord, teasez 1 trait par jour.
    - Whitelist pour les 100 premiers membres actifs.

    ### 4. Tests (J-7)
    - Déployez sur **devnet** avec \`deploy.sh\`, mintez 5 NFT, vérifiez les métadonnées sur Solana Explorer.

    ### 5. Lancement (J0) — ${network}
    - Exportez la collection, lancez \`deploy.sh\` sur mainnet, publiez l'adresse de la Candy Machine.
    - Listez sur Magic Eden / Tensor dès la fin du mint.
  `;
}

export const plan = {
  generate: authed.input(z.object({ collectionId: z.string(), goals: z.string().max(800).optional() })).handler(async ({ input, context }) => {
    const c = await ownCollection(context.user.id, input.collectionId);
    const tree = await loadTree(c.id);
    const f = feasibility(tree.map((l) => ({ name: l.name, traitCount: l.traits.length, allowNone: l.allowNone })), c.size);
    const candy = parse<{ price?: number }>(c.candy, {});
    const price = candy.price ?? 0.5;
    const layersDesc = tree
      .map((l) => `- ${l.name} (${l.traits.length} traits${l.allowNone ? `, optionnel ${l.noneWeight}` : ""}) : ${l.traits.map((t) => `${t.name}[${t.weight}]`).join(", ")}`)
      .join("\n");
    let content: string;
    try {
      const { text } = await generateText({
        model: gateway("anthropic/claude-sonnet-5"),
        system: dedent`Tu es un stratège senior de lancements NFT sur Solana (Metaplex Candy Machine v3, Magic Eden, Tensor).
          ${lang() === "en" ? "Tu réponds en ANGLAIS (English only)" : "Tu réponds en français"}, en Markdown, de manière concrète et chiffrée, sans blabla ni avertissements génériques.
          Structure : ## titre, puis sections ### numérotées avec puces courtes. 450 à 700 mots.`,
        prompt: dedent`Établis un plan d'action de lancement pour cette collection.
          Nom : ${c.name} (${c.symbol}) — ${c.description || "pas de description"}
          Taille : ${c.size} NFT, réseau ${c.network}, prix ${price} SOL, royalties ${(c.royaltyBps / 100).toFixed(1)} %
          Combinatoire : ${nf(f.maxCombinations)} combinaisons possibles (${(f.ratio * 100).toFixed(1)} % utilisées, niveau ${f.level}).
          Calques (back→front) avec poids :
          ${layersDesc || "aucun calque"}
          ${input.goals ? `Objectifs du créateur : ${input.goals}` : ""}

          Inclure : 1) diagnostic rareté (traits à ajouter / poids à corriger, cite les traits), 2) prix et revenus estimés (mint + royalties, scénario prudent/optimiste),
          3) calendrier J-30 → J+7, 4) communauté & marketing, 5) checklist technique (devnet, Sugar, guards, vérification), 6) risques & parades.`,
      });
      content = text.trim();
    } catch (e) {
      console.error("[plan] AI failed, fallback", e);
      content = fallbackPlan(c.name, c.size, c.network, price);
    }
    await db
      .insert(actionPlans)
      .values({ collectionId: c.id, content, updatedAt: new Date() })
      .onConflictDoUpdate({ target: actionPlans.collectionId, set: { content, updatedAt: new Date() } });
    return { content };
  }),

  get: authed.input(z.object({ collectionId: z.string() })).handler(async ({ input, context }) => {
    await ownCollection(context.user.id, input.collectionId);
    const [p] = await db.select().from(actionPlans).where(eq(actionPlans.collectionId, input.collectionId));
    return p ?? null;
  }),
};
