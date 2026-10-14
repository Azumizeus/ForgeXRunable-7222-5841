import { PassThrough } from "node:stream";
import { eq } from "drizzle-orm";
import { Zip, ZipDeflate, ZipPassThrough, strToU8 } from "fflate";
import { Upload } from "@aws-sdk/lib-storage";
import sharp from "sharp";
import { db } from "../database";
import { collections, exportsTable } from "../database/schema";
import { BUCKET, s3 } from "./s3";
import { loadGen } from "./genCache";
import { parse } from "./own";
import { renderNft } from "./composer";
import { trackUsage } from "./billing";
import { collectionMetadata, tokenMetadata, type CollectionMeta } from "../engine/metadata";
import { rarityReport } from "../engine/rarity";
import { deployScript, sugarConfig, type CandyInput } from "../engine/candy";
import { pythonForgeConfig } from "../engine/forgeConfig";
import { lang, tr } from "./i18n";

const README_FR = (name: string, size: number) => `# ${name} — export Forge-X

${size} NFT prêts pour Metaplex Candy Machine v3 (Sugar).

## Contenu
- assets/0.png … assets/${size - 1}.png + métadonnées JSON (standard Metaplex)
- assets/collection.png + collection.json : NFT de collection
- config.json : configuration Sugar (guards : prix, date, bot tax)
- deploy.sh : script de déploiement (devnet ou mainnet)
- rarity_report.json : distribution des traits
- rarity_ranks.json : score et rang de rareté de chaque NFT
- forge.config.json : compatible avec le moteur Python ULTIMATE SOLANA NFT FORGE

## Déployer
\`\`\`bash
unzip collection.zip && cd collection
chmod +x deploy.sh && ./deploy.sh
\`\`\`
Testez TOUJOURS sur devnet avant mainnet.
`;

const README_EN = (name: string, size: number) => `# ${name} — Forge-X export

${size} NFT ready for Metaplex Candy Machine v3 (Sugar).

## Contents
- assets/0.png … assets/${size - 1}.png + JSON metadata (Metaplex standard)
- assets/collection.png + collection.json: collection NFT
- config.json: Sugar configuration (guards: price, date, bot tax)
- deploy.sh: deployment script (devnet or mainnet)
- rarity_report.json: trait distribution
- rarity_ranks.json: rarity score and rank for every NFT
- forge.config.json: compatible with the ULTIMATE SOLANA NFT FORGE Python engine

## Deploy
\`\`\`bash
unzip collection.zip && cd collection
chmod +x deploy.sh && ./deploy.sh
\`\`\`
ALWAYS test on devnet before mainnet.
`;

const README = (name: string, size: number) => (lang() === "en" ? README_EN : README_FR)(name, size);

async function setProgress(id: string, patch: Partial<typeof exportsTable.$inferInsert>) {
  await db.update(exportsTable).set(patch).where(eq(exportsTable.id, id));
}

/** Renders every NFT, streams a ZIP to Tigris, consumes nft_exports on success. */
const active = new Set<string>();
export const isExportActive = (id: string) => active.has(id);

export async function runExport(id: string) {
  active.add(id);
  try {
    await doExport(id);
  } finally {
    active.delete(id);
  }
}

async function doExport(id: string) {
  const [job] = await db.select().from(exportsTable).where(eq(exportsTable.id, id));
  if (!job) return;
  try {
    const gen = await loadGen(job.generationId);
    const [c] = await db.select().from(collections).where(eq(collections.id, job.collectionId));
    if (!gen || !c) throw new Error(tr("Génération introuvable", "Generation not found"));
    await setProgress(id, { status: "rendering", progress: 0 });

    const meta: CollectionMeta = {
      name: c.name,
      symbol: c.symbol,
      description: c.description,
      externalUrl: c.externalUrl,
      royaltyBps: c.royaltyBps,
      creators: parse(c.creators, []),
    };
    const candy = parse<Partial<CandyInput>>(c.candy, {});
    const candyInput: CandyInput = {
      name: c.name,
      symbol: c.symbol,
      size: gen.items.length,
      royaltyBps: c.royaltyBps,
      network: c.network === "mainnet-beta" ? "mainnet-beta" : "devnet",
      creators: meta.creators,
      price: candy.price ?? 0.5,
      treasury: candy.treasury ?? "",
      goLiveDate: candy.goLiveDate ?? null,
      tokenStandard: candy.tokenStandard ?? "nft",
      isSequential: candy.isSequential ?? false,
      botTax: candy.botTax ?? true,
    };

    const body = new PassThrough({ highWaterMark: 8 * 1024 * 1024 });
    const key = `exports/${c.id}/${id}.zip`;
    const slug = (c.symbol || c.name || "collection").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const upload = new Upload({
      client: s3,
      params: {
        Bucket: BUCKET,
        Key: key,
        Body: body,
        ContentType: "application/zip",
        ContentDisposition: `attachment; filename="${slug}-forge-x.zip"`,
      },
      partSize: 10 * 1024 * 1024,
      queueSize: 4,
    });
    const uploaded = upload.done();
    let bytes = 0;
    let zipErr: Error | null = null;
    const zip = new Zip((err, chunk, final) => {
      if (err) {
        zipErr = err;
        body.destroy(err);
        return;
      }
      bytes += chunk.length;
      if (!body.write(Buffer.from(chunk))) {
        /* backpressure handled by awaiting drain below */
      }
      if (final) body.end();
    });
    const drain = () => (body.writableNeedDrain ? new Promise<void>((r) => body.once("drain", () => r())) : Promise.resolve());
    const root = "collection/";
    const addFile = async (name: string, data: Uint8Array, compress: boolean) => {
      const f = compress ? new ZipDeflate(root + name, { level: 6 }) : new ZipPassThrough(root + name);
      zip.add(f);
      f.push(data, true);
      await drain();
    };
    const json = (o: unknown) => strToU8(JSON.stringify(o, null, 2));

    const W = c.width;
    const H = c.height;
    const total = gen.items.length;
    const CONC = 6;
    let next = 0;
    let done = 0;
    let lastPct = -1;
    // render ahead with bounded concurrency, write in order
    const pending = new Map<number, Promise<Buffer>>();
    const kick = () => {
      while (next < total && pending.size < CONC) {
        const e = next++;
        pending.set(e, renderNft(gen.snap, gen.items[e]!, W, H, { compression: 6 }));
      }
    };
    kick();
    for (let e = 0; e < total; e++) {
      const png = await pending.get(e)!;
      pending.delete(e);
      kick();
      await addFile(`assets/${e}.png`, png, false);
      await addFile(`assets/${e}.json`, json(tokenMetadata(meta, gen.snap, e, gen.items[e]!)), true);
      done++;
      const pct = Math.floor((done / total) * 100);
      if (pct !== lastPct && (pct % 2 === 0 || done === total)) {
        lastPct = pct;
        await setProgress(id, { progress: done });
      }
      if (zipErr) throw zipErr;
    }

    // collection cover = rarest NFT
    const rarest = gen.byRank[0] ?? 0;
    const cover = await renderNft(gen.snap, gen.items[rarest]!, W, H);
    await addFile("assets/collection.png", cover, false);
    await addFile("assets/collection.json", json(collectionMetadata(meta)), true);
    await addFile("config.json", json(sugarConfig(candyInput)), true);
    await addFile("deploy.sh", strToU8(deployScript(candyInput)), true);
    await addFile("rarity_report.json", json(rarityReport(c.name, gen.snap, gen.items)), true);
    await addFile(
      "rarity_ranks.json",
      json(gen.byRank.map((e) => ({ edition: e, name: `${c.name} #${e + 1}`, rank: gen.rarity[e]!.rank, score: gen.rarity[e]!.score }))),
      true,
    );
    await addFile(
      "forge.config.json",
      json(pythonForgeConfig({ ...meta, size: total, width: W, seed: gen.seed, network: c.network, price: candyInput.price }, gen.snap)),
      true,
    );
    await addFile("README.md", strToU8(README(c.name, total)), true);
    const thumb = await sharp(cover).resize(512, 512, { fit: "cover" }).png().toBuffer();
    await addFile("preview.png", thumb, false);
    zip.end();

    await setProgress(id, { status: "uploading" });
    await uploaded;
    await setProgress(id, { status: "done", progress: total, fileKey: key, sizeBytes: bytes, finishedAt: new Date() });
    await trackUsage(job.userId, "nft_exports", total);
    await db.update(collections).set({ status: "exported", updatedAt: new Date() }).where(eq(collections.id, c.id));
  } catch (e) {
    console.error("[export] failed", e);
    await setProgress(id, { status: "error", error: e instanceof Error ? e.message : String(e), finishedAt: new Date() });
  }
}
