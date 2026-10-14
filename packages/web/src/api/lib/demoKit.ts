import { tr } from "./i18n";
// Procedural demo traits (SVG → PNG via sharp). Lets anyone try the full pipeline without art.
const S = 1024;
const C = S / 2;
const wrap = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">${body}</svg>`;

export interface DemoTrait {
  name: string;
  weight: number;
  svg: string;
  stats?: Record<string, number>;
}

const BG: [[string, string], string, string, number][] = [
  [["Braise", "Ember"], "#3a0d05", "#ff5a1f", 30],
  [["Abysse", "Abyss"], "#020617", "#155e75", 25],
  [["Toxique", "Toxic"], "#0a1a05", "#84cc16", 20],
  [["Solaire", "Solar"], "#3b1d00", "#fbbf24", 15],
  [["Néant", "Void"], "#050505", "#3f3f46", 10],
];

function background(i: number): DemoTrait {
  const [nm, a, b, w] = BG[i % BG.length]!;
  const name = tr(...nm);
  const rings = Array.from({ length: 7 }, (_, k) => `<circle cx="${C}" cy="${C + 120}" r="${120 + k * 110}" fill="none" stroke="${b}" stroke-opacity="${0.18 - k * 0.02}" stroke-width="2"/>`).join("");
  return {
    name,
    weight: w,
    svg: wrap(`<defs><radialGradient id="g" cx="50%" cy="62%" r="70%"><stop offset="0" stop-color="${b}" stop-opacity="0.9"/><stop offset="1" stop-color="${a}"/></radialGradient></defs><rect width="${S}" height="${S}" fill="${a}"/><rect width="${S}" height="${S}" fill="url(#g)"/>${rings}`),
  };
}

const BODY: [[string, string], string, string, number, Record<string, number>][] = [
  [["Acier", "Steel"], "#9ca3af", "#4b5563", 35, { armor: 10 }],
  [["Azur", "Azure"], "#38bdf8", "#0369a1", 25, { speed: 15 }],
  [["Carmin", "Crimson"], "#f43f5e", "#9f1239", 20, { firepower: 15 }],
  [["Jade", "Jade"], "#34d399", "#047857", 13, { speed: 5, armor: 5 }],
  [["Or", "Gold"], "#fcd34d", "#b45309", 7, { speed: 10, armor: 10, firepower: 10 }],
];

function body(i: number): DemoTrait {
  const [nm, light, dark, w, stats] = BODY[i % BODY.length]!;
  const name = tr(...nm);
  return {
    name,
    weight: w,
    stats,
    svg: wrap(`<defs><linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${light}"/><stop offset="1" stop-color="${dark}"/></linearGradient></defs>
      <path d="M ${C - 300} ${S} C ${C - 300} 760 ${C - 220} 700 ${C} 700 C ${C + 220} 700 ${C + 300} 760 ${C + 300} ${S} Z" fill="url(#b)"/>
      <rect x="${C - 230}" y="250" width="460" height="470" rx="200" fill="url(#b)"/>
      <rect x="${C - 230}" y="250" width="460" height="470" rx="200" fill="none" stroke="#000" stroke-opacity="0.35" stroke-width="10"/>
      <ellipse cx="${C - 90}" cy="340" rx="90" ry="40" fill="#fff" fill-opacity="0.25"/>`),
  };
}

const EYES: [string, string][] = [["Visière", "Visor"], ["Cyclope", "Cyclops"], ["Laser", "Laser"], ["Endormi", "Sleepy"], ["Pixel", "Pixel"]];
function eyes(i: number): DemoTrait {
  const k = i % EYES.length;
  const y = 450;
  let g = "";
  if (k === 0) g = `<rect x="${C - 190}" y="${y - 50}" width="380" height="100" rx="50" fill="#0b0b0b"/><rect x="${C - 170}" y="${y - 25}" width="340" height="30" rx="15" fill="#22d3ee"/>`;
  if (k === 1) g = `<circle cx="${C}" cy="${y}" r="95" fill="#fff"/><circle cx="${C}" cy="${y}" r="50" fill="#111"/><circle cx="${C + 18}" cy="${y - 18}" r="16" fill="#fff"/>`;
  if (k === 2) g = `<circle cx="${C - 90}" cy="${y}" r="45" fill="#ff2d55"/><circle cx="${C + 90}" cy="${y}" r="45" fill="#ff2d55"/><rect x="${C + 90}" y="${y - 8}" width="${S}" height="16" fill="#ff2d55" fill-opacity="0.8"/><rect x="0" y="${y - 8}" width="${C - 90}" height="16" fill="#ff2d55" fill-opacity="0.8"/>`;
  if (k === 3) g = `<path d="M ${C - 150} ${y} q 60 40 120 0" stroke="#111" stroke-width="18" fill="none" stroke-linecap="round"/><path d="M ${C + 30} ${y} q 60 40 120 0" stroke="#111" stroke-width="18" fill="none" stroke-linecap="round"/>`;
  if (k === 4) g = `<rect x="${C - 150}" y="${y - 40}" width="80" height="80" fill="#111"/><rect x="${C + 70}" y="${y - 40}" width="80" height="80" fill="#111"/><rect x="${C - 130}" y="${y - 30}" width="25" height="25" fill="#fff"/><rect x="${C + 90}" y="${y - 30}" width="25" height="25" fill="#fff"/>`;
  return { name: tr(...EYES[k]!), weight: [30, 15, 8, 25, 22][k]!, svg: wrap(g) };
}

const MOUTH: [string, string][] = [["Sourire", "Smile"], ["Grille", "Grill"], ["Neutre", "Neutral"], ["Crocs", "Fangs"]];
function mouth(i: number): DemoTrait {
  const k = i % MOUTH.length;
  const y = 600;
  let g = "";
  if (k === 0) g = `<path d="M ${C - 90} ${y} Q ${C} ${y + 80} ${C + 90} ${y}" stroke="#111" stroke-width="20" fill="none" stroke-linecap="round"/>`;
  if (k === 1) g = `<rect x="${C - 100}" y="${y - 25}" width="200" height="55" rx="10" fill="#111"/>${[0, 1, 2, 3].map((j) => `<rect x="${C - 85 + j * 45}" y="${y - 15}" width="30" height="35" fill="#a3a3a3"/>`).join("")}`;
  if (k === 2) g = `<rect x="${C - 70}" y="${y}" width="140" height="18" rx="9" fill="#111"/>`;
  if (k === 3) g = `<path d="M ${C - 100} ${y} L ${C + 100} ${y}" stroke="#111" stroke-width="18" stroke-linecap="round"/><path d="M ${C - 60} ${y} l 18 45 l 18 -45 Z M ${C + 24} ${y} l 18 45 l 18 -45 Z" fill="#fff" stroke="#111" stroke-width="6"/>`;
  return { name: tr(...MOUTH[k]!), weight: [35, 20, 30, 15][k]!, svg: wrap(g) };
}

const HEAD: [string, string][] = [["Antenne", "Antenna"], ["Couronne", "Crown"], ["Casque", "Helmet"], ["Halo", "Halo"]];
function head(i: number): DemoTrait {
  const k = i % HEAD.length;
  let g = "";
  if (k === 0) g = `<rect x="${C - 6}" y="140" width="12" height="120" fill="#111"/><circle cx="${C}" cy="130" r="30" fill="#ff5a1f"/>`;
  if (k === 1) g = `<path d="M ${C - 150} 270 L ${C - 150} 170 L ${C - 75} 220 L ${C} 140 L ${C + 75} 220 L ${C + 150} 170 L ${C + 150} 270 Z" fill="#fbbf24" stroke="#92400e" stroke-width="10"/>`;
  if (k === 2) g = `<path d="M ${C - 245} 400 C ${C - 245} 160 ${C + 245} 160 ${C + 245} 400 L ${C + 245} 330 C ${C + 200} 230 ${C - 200} 230 ${C - 245} 330 Z" fill="#1f2937" stroke="#000" stroke-width="10"/><rect x="${C - 20}" y="190" width="40" height="70" rx="10" fill="#ef4444"/>`;
  if (k === 3) g = `<ellipse cx="${C}" cy="190" rx="170" ry="40" fill="none" stroke="#fde68a" stroke-width="22"/>`;
  return { name: tr(...HEAD[k]!), weight: [30, 6, 20, 10][k]!, svg: wrap(g), stats: k === 2 ? { armor: 15 } : k === 1 ? { firepower: 5 } : undefined };
}

function generic(layer: string, i: number): DemoTrait {
  const hue = (i * 67) % 360;
  const n = 3 + i;
  const dots = Array.from({ length: n }, (_, j) => `<circle cx="${(S / (n + 1)) * (j + 1)}" cy="${C + Math.sin(j) * 120}" r="${50 + ((i + j) % 3) * 20}" fill="hsl(${(hue + j * 30) % 360},75%,55%)" fill-opacity="0.85"/>`).join("");
  return { name: `${layer} ${String.fromCharCode(65 + i)}`, weight: 10, svg: wrap(dots) };
}

export function demoTraitsFor(layerName: string, count = 5): DemoTrait[] {
  const n = layerName.toLowerCase();
  const pick = (f: (i: number) => DemoTrait, max: number) => Array.from({ length: Math.min(count, max) }, (_, i) => f(i));
  if (/(fond|back|bg|décor|decor)/.test(n)) return pick(background, 5);
  if (/(body|corps|peau|skin|hull|coque)/.test(n)) return pick(body, 5);
  if (/(eye|yeux|oeil|œil)/.test(n)) return pick(eyes, 5);
  if (/(mouth|bouche)/.test(n)) return pick(mouth, 4);
  if (/(head|hat|chapeau|tête|tete|casque)/.test(n)) return pick(head, 4);
  return Array.from({ length: count }, (_, i) => generic(layerName, i));
}

export const DEMO_KIT: { name: [string, string]; allowNone: boolean; noneWeight: number }[] = [
  { name: ["Fond", "Background"], allowNone: false, noneWeight: 0 },
  { name: ["Corps", "Body"], allowNone: false, noneWeight: 0 },
  { name: ["Yeux", "Eyes"], allowNone: false, noneWeight: 0 },
  { name: ["Bouche", "Mouth"], allowNone: false, noneWeight: 0 },
  { name: ["Tête", "Head"], allowNone: true, noneWeight: 45 },
];

export const DEMO_BASE_STATS = { speed: 50, armor: 50, firepower: 50 };
