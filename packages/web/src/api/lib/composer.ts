import sharp from "sharp";
import { getObjectBuffer } from "./s3";
import type { Picks, Snapshot, TraitTransform } from "../engine/types";

/** Small LRU on Map insertion order. */
class Lru<V> {
  private m = new Map<string, V>();
  constructor(private max: number) {}
  get(k: string) {
    const v = this.m.get(k);
    if (v !== undefined) {
      this.m.delete(k);
      this.m.set(k, v);
    }
    return v;
  }
  set(k: string, v: V) {
    this.m.delete(k);
    this.m.set(k, v);
    if (this.m.size > this.max) this.m.delete(this.m.keys().next().value!);
  }
}

const originals = new Lru<Promise<Buffer>>(300);
const prepared = new Lru<Promise<Buffer>>(600);
const renders = new Lru<Promise<Buffer>>(400);

function original(key: string) {
  let p = originals.get(key);
  if (!p) {
    p = getObjectBuffer(key);
    p.catch(() => originals.set(key, undefined as never));
    originals.set(key, p);
  }
  return p;
}

const BLENDS: Record<string, sharp.Blend> = {
  over: "over",
  multiply: "multiply",
  screen: "screen",
  overlay: "overlay",
  "soft-light": "soft-light",
  "hard-light": "hard-light",
  darken: "darken",
  lighten: "lighten",
  add: "add",
  difference: "difference",
};
export const BLEND_MODES = Object.keys(BLENDS);

const CLEAR = { r: 0, g: 0, b: 0, alpha: 0 };

/** Fit into w×h, then apply scale/offset; returns a w×h RGBA PNG buffer. */
async function placed(src: Buffer, w: number, h: number, tf?: TraitTransform) {
  if (!tf) return sharp(src).resize(w, h, { fit: "contain", background: CLEAR }).ensureAlpha().png({ compressionLevel: 1 }).toBuffer();
  const sw = Math.max(1, Math.round((w * tf.scale) / 100));
  const sh = Math.max(1, Math.round((h * tf.scale) / 100));
  const scaled = await sharp(src).resize(sw, sh, { fit: "contain", background: CLEAR }).ensureAlpha().png().toBuffer();
  const left = Math.round((w - sw) / 2 + (w * tf.x) / 100);
  const top = Math.round((h - sh) / 2 + (h * tf.y) / 100);
  // crop the part that lands inside the canvas
  const cx = Math.max(0, -left), cy = Math.max(0, -top);
  const cw = Math.min(sw - cx, w - Math.max(0, left)), chh = Math.min(sh - cy, h - Math.max(0, top));
  const base = sharp({ create: { width: w, height: h, channels: 4, background: CLEAR } });
  if (cw <= 0 || chh <= 0) return base.png({ compressionLevel: 1 }).toBuffer();
  const part = await sharp(scaled).extract({ left: cx, top: cy, width: cw, height: chh }).toBuffer();
  return base.composite([{ input: part, left: Math.max(0, left), top: Math.max(0, top) }]).png({ compressionLevel: 1 }).toBuffer();
}

async function preparedTrait(key: string, w: number, h: number, opacity: number, tf?: TraitTransform) {
  const ck = `${key}|${w}x${h}|${opacity}|${tf ? `${tf.x},${tf.y},${tf.scale}` : ""}`;
  let p = prepared.get(ck);
  if (!p) {
    p = (async () => {
      const src = await original(key);
      const img = sharp(await placed(src, w, h, tf)).ensureAlpha();
      if (opacity >= 100) return img.png({ compressionLevel: 1 }).toBuffer();
      const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
      const f = Math.max(0, opacity) / 100;
      for (let i = 3; i < data.length; i += 4) data[i] = Math.round(data[i]! * f);
      return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png({ compressionLevel: 1 }).toBuffer();
    })();
    prepared.set(ck, p);
  }
  return p;
}

/** Compose layers back→front into one PNG. */
export async function renderNft(snap: Snapshot, picks: Picks, w: number, h: number, opts: { cacheKey?: string; compression?: number } = {}) {
  const ck = opts.cacheKey ? `${opts.cacheKey}|${w}x${h}` : null;
  if (ck) {
    const hit = renders.get(ck);
    if (hit) return hit;
  }
  const job = (async () => {
    const layers: sharp.OverlayOptions[] = [];
    for (let li = 0; li < snap.layers.length; li++) {
      const idx = picks[li] ?? -1;
      if (idx < 0) continue;
      const layer = snap.layers[li]!;
      const t = layer.traits[idx];
      if (!t) continue;
      layers.push({ input: await preparedTrait(t.imageKey, w, h, layer.opacity, t.transform), blend: BLENDS[layer.blendMode] ?? "over" });
    }
    return sharp({ create: { width: w, height: h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite(layers)
      .png({ compressionLevel: opts.compression ?? 6 })
      .toBuffer();
  })();
  if (ck) {
    renders.set(ck, job);
    job.catch(() => renders.set(ck, undefined as never));
  }
  return job;
}

/** Normalize an uploaded/AI image: PNG RGBA, max side 2048. */
export async function normalizeImage(buf: Buffer) {
  const img = sharp(buf).rotate().ensureAlpha();
  const meta = await img.metadata();
  const big = Math.max(meta.width ?? 0, meta.height ?? 0) > 2048;
  return (big ? img.resize(2048, 2048, { fit: "inside" }) : img).png().toBuffer();
}

/** Chroma-key a solid green background to transparency (AI traits). */
export async function chromaKey(buf: Buffer) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]!, g = data[i + 1]!, b = data[i + 2]!;
    const dom = g - Math.max(r, b);
    if (g > 90 && dom > 60) data[i + 3] = 0;
    else if (g > 80 && dom > 25) {
      // soft edge + despill
      data[i + 3] = Math.round(data[i + 3]! * (1 - (dom - 25) / 35));
      data[i + 1] = Math.max(r, b);
    }
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}
