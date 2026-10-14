import { createHash } from "node:crypto";

/** Seeded PRNG (sfc32) from any string seed — reproducible generations. */
export function makeRng(seed: string): () => number {
  const h = createHash("sha256").update(seed).digest();
  let a = h.readUInt32LE(0), b = h.readUInt32LE(4), c = h.readUInt32LE(8), d = h.readUInt32LE(12);
  const next = () => {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    let t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    t = (t + d) | 0;
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
  for (let i = 0; i < 15; i++) next();
  return next;
}

export function dnaOf(names: [string, string | null][]): string {
  const raw = names
    .filter(([, v]) => v !== null)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([l, v]) => `${l}=${v}`)
    .join(";");
  return createHash("sha256").update(raw).digest("hex");
}
