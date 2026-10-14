import { z } from "zod";
import { eq } from "drizzle-orm";
import { authed } from "../middleware/auth";
import { tr } from "../lib/i18n";
import { db } from "../database";
import { generations } from "../database/schema";
import { ownCollection, parse } from "../lib/own";
import { deployScript, sugarConfig, type CandyInput } from "../engine/candy";
import { defaultCandy, type CandySettings } from "./collections";

export const candy = {
  /** Live preview of Sugar config.json + deploy.sh. */
  preview: authed.input(z.object({ collectionId: z.string() })).handler(async ({ input, context }) => {
    const c = await ownCollection(context.user.id, input.collectionId);
    const [g] = await db.select({ generated: generations.generated }).from(generations).where(eq(generations.collectionId, c.id));
    const cs = { ...defaultCandy(), ...parse<Partial<CandySettings>>(c.candy, {}) };
    const ci: CandyInput = {
      name: c.name,
      symbol: c.symbol,
      size: g?.generated ?? c.size,
      royaltyBps: c.royaltyBps,
      network: c.network === "mainnet-beta" ? "mainnet-beta" : "devnet",
      creators: parse(c.creators, []),
      ...cs,
    };
    const warnings: string[] = [];
    const creators = ci.creators.filter((x) => x.address);
    if (!creators.length) warnings.push(tr("Aucun créateur : ajoutez votre adresse wallet pour toucher les royalties.", "No creators: add your wallet address to receive royalties."));
    else if (creators.reduce((s, x) => s + x.share, 0) !== 100) warnings.push(tr("La somme des parts créateurs doit faire 100 %.", "Creator shares must add up to 100%."));
    if (ci.price > 0 && !ci.treasury) warnings.push(tr("Prix défini mais pas de trésorerie : le guard solPayment sera ignoré.", "Price set but no treasury: the solPayment guard will be skipped."));
    if (ci.network === "mainnet-beta") warnings.push("Mainnet : testez d'abord sur devnet.");
    if (!g) warnings.push(tr("Collection pas encore générée.", "Collection not generated yet."));
    const addr = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    for (const x of creators) if (!addr.test(x.address)) warnings.push(tr(`Adresse créateur invalide : ${x.address.slice(0, 12)}…`, `Invalid creator address: ${x.address.slice(0, 12)}…`));
    if (ci.treasury && !addr.test(ci.treasury)) warnings.push(tr("Adresse de trésorerie invalide.", "Invalid treasury address."));
    return { config: sugarConfig(ci), script: deployScript(ci), warnings, revenue: { mint: ci.price * ci.size, royaltyPct: ci.royaltyBps / 100 } };
  }),
};
