import { lang } from "../lib/i18n";
// Candy Machine v3 — Sugar config.json + deploy.sh. Pure (shared with web UI).
export interface CandyInput {
  name: string;
  symbol: string;
  size: number;
  royaltyBps: number;
  network: "devnet" | "mainnet-beta";
  creators: { address: string; share: number }[];
  price: number;
  treasury: string;
  goLiveDate: string | null;
  tokenStandard: "nft" | "pnft";
  isSequential: boolean;
  botTax: boolean;
}

function sugarDate(iso: string) {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())} +0000`;
}

export function sugarConfig(c: CandyInput) {
  const guards: Record<string, unknown> = {};
  if (c.price > 0 && c.treasury) guards.solPayment = { value: c.price, destination: c.treasury };
  if (c.goLiveDate) guards.startDate = { date: sugarDate(c.goLiveDate) };
  if (c.botTax) guards.botTax = { value: 0.01, lastInstruction: true };
  return {
    tokenStandard: c.tokenStandard,
    number: c.size,
    symbol: c.symbol,
    sellerFeeBasisPoints: c.royaltyBps,
    isMutable: true,
    isSequential: c.isSequential,
    creators: c.creators.filter((x) => x.address),
    uploadMethod: "bundlr",
    ruleSet: null,
    awsConfig: null,
    sdriveApiKey: null,
    pinataConfig: null,
    hiddenSettings: null,
    guards: Object.keys(guards).length ? { default: guards } : null,
  };
}

export function deployScript(c: CandyInput) {
  const rpc = c.network === "devnet" ? "https://api.devnet.solana.com" : "https://api.mainnet-beta.solana.com";
  const devnet = c.network === "devnet";
  const script = `#!/usr/bin/env bash
# =============================================================
#  Forge-X — déploiement Candy Machine v3 (Sugar)
#  Collection : ${c.name} (${c.symbol}) — ${c.size} NFT
#  Réseau     : ${c.network}   Prix : ${c.price} SOL
# =============================================================
#  Lancez ce script depuis le dossier dézippé (là où se trouvent
#  config.json et assets/).
#  Pré-requis : Solana CLI + Sugar CLI (installé ci-dessous si absent)
# =============================================================
set -euo pipefail

echo "▶ Réseau : ${c.network}"
solana config set --url ${rpc}

if [ ! -f ~/.config/solana/id.json ]; then
  echo "▶ Création d'un wallet (notez la seed phrase !)"
  solana-keygen new --outfile ~/.config/solana/id.json
fi
echo "▶ Wallet : $(solana address)"
${devnet ? `
echo "▶ Airdrop devnet (SOL de test)"
solana airdrop 2 || echo "  (airdrop limité — utilisez https://faucet.solana.com)"
` : `
echo "⚠  MAINNET : vérifiez votre solde avant de continuer."
read -p "Continuer ? (o/N) " ok; [ "$ok" = "o" ] || exit 1
`}solana balance

if ! command -v sugar >/dev/null 2>&1; then
  echo "▶ Installation de Sugar CLI"
  bash <(curl -sSf https://sugar.metaplex.com/install.sh)
fi

echo "▶ Validation des assets"
sugar validate

echo "▶ Upload images + métadonnées (Arweave via Bundlr)"
sugar upload

echo "▶ Déploiement de la Candy Machine"
sugar deploy

echo "▶ Ajout des guards (prix, date...)"
sugar guard add || true

echo "▶ Vérification on-chain"
sugar verify

sugar show
echo "✅ Candy Machine déployée. Adresse ci-dessus — branchez-la sur votre page de mint."

# Sécurité : ne partagez JAMAIS votre seed phrase ni ~/.config/solana/id.json
`;
  return lang() === "en" ? SCRIPT_EN.reduce((s, [fr, en]) => s.split(fr).join(en), script) : script;
}

const SCRIPT_EN: [string, string][] = [
  ["Forge-X — déploiement Candy Machine v3 (Sugar)", "Forge-X — Candy Machine v3 deployment (Sugar)"],
  ["Réseau     :", "Network    :"],
  ["   Prix : ", "   Price : "],
  ["Lancez ce script depuis le dossier dézippé (là où se trouvent", "Run this script from the unzipped folder (where"],
  ["#  config.json et assets/).", "#  config.json and assets/ live)."],
  ["Pré-requis : Solana CLI + Sugar CLI (installé ci-dessous si absent)", "Requires: Solana CLI + Sugar CLI (installed below if missing)"],
  ["▶ Réseau :", "▶ Network:"],
  ["Création d'un wallet (notez la seed phrase !)", "Creating a wallet (write down the seed phrase!)"],
  ["▶ Wallet :", "▶ Wallet:"],
  ["Airdrop devnet (SOL de test)", "Devnet airdrop (test SOL)"],
  ["(airdrop limité — utilisez https://faucet.solana.com)", "(airdrop rate-limited — use https://faucet.solana.com)"],
  ["MAINNET : vérifiez votre solde avant de continuer.", "MAINNET: check your balance before continuing."],
  ['read -p "Continuer ? (o/N) " ok; [ "$ok" = "o" ]', 'read -p "Continue? (y/N) " ok; [ "$ok" = "y" ]'],
  ["Installation de Sugar CLI", "Installing Sugar CLI"],
  ["Validation des assets", "Validating assets"],
  ["Upload images + métadonnées (Arweave via Bundlr)", "Uploading images + metadata (Arweave via Bundlr)"],
  ["Déploiement de la Candy Machine", "Deploying the Candy Machine"],
  ["Ajout des guards (prix, date...)", "Adding guards (price, date...)"],
  ["Vérification on-chain", "On-chain verification"],
  ["Candy Machine déployée. Adresse ci-dessus — branchez-la sur votre page de mint.", "Candy Machine deployed. Address above — plug it into your mint page."],
  ["Sécurité : ne partagez JAMAIS votre seed phrase ni ~/.config/solana/id.json", "Security: NEVER share your seed phrase or ~/.config/solana/id.json"],
];
