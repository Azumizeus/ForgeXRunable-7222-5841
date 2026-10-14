import type { Hono } from "hono";
import sharp from "sharp";
import { auth } from "../auth";
import { loadGen } from "./genCache";
import { loadTree, toSnapshot } from "./own";
import { getObjectBuffer } from "./s3";
import { renderNft } from "./composer";
import { db } from "../database";
import { collections } from "../database/schema";
import { eq } from "drizzle-orm";

const IMMUTABLE = "public, max-age=31536000, immutable";
const clampSize = (s: string | undefined, d: number) => Math.max(64, Math.min(1024, Number.parseInt(s ?? "", 10) || d));

async function asImage(png: Buffer, size: number) {
  if (size >= 1024) return { body: png, type: "image/png" };
  return { body: await sharp(png).webp({ quality: 86 }).toBuffer(), type: "image/webp" };
}

// biome-ignore lint/suspicious/noExplicitAny: Hono app generic from createApp
export function registerHttp(app: Hono<any>) {
  app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));

  /** Trait images (unguessable keys). */
  app.get("/api/file/*", async (c) => {
    const key = c.req.path.replace(/^\/api\/file\//, "");
    if (!/^traits(T)?\/[\w-]+\/[\w-]+\.png$/.test(key)) return c.json({ error: "not found" }, 404);
    try {
      const buf = await getObjectBuffer(key);
      return c.body(new Uint8Array(buf), 200, { "Content-Type": "image/png", "Cache-Control": IMMUTABLE });
    } catch {
      return c.json({ error: "not found" }, 404);
    }
  });

  /** Composed NFT from a frozen generation. */
  app.get("/api/render/:genId/:edition", async (c) => {
    const gen = await loadGen(c.req.param("genId"));
    const ed = Number.parseInt(c.req.param("edition"), 10);
    const picks = gen?.items[ed];
    if (!gen || !picks) return c.json({ error: "not found" }, 404);
    const size = clampSize(c.req.query("s"), 512);
    try {
      const png = await renderNft(gen.snap, picks, size, size, { cacheKey: `${gen.id}:${ed}`, compression: 3 });
      const img = await asImage(png, size);
      return c.body(new Uint8Array(img.body), 200, { "Content-Type": img.type, "Cache-Control": IMMUTABLE });
    } catch (e) {
      console.error("[render]", e);
      return c.json({ error: "render failed" }, 500);
    }
  });

  /** Live preview of arbitrary picks against the current layers (editor). */
  app.get("/api/preview/:collectionId", async (c) => {
    const id = c.req.param("collectionId");
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json({ error: "unauthorized" }, 401);
    const [col] = await db
      .select({ id: collections.id, userId: collections.userId, gameStats: collections.gameStats })
      .from(collections)
      .where(eq(collections.id, id));
    if (!col || col.userId !== session.user.id) return c.json({ error: "not found" }, 404);
    const picks = (c.req.query("p") ?? "").split(",").map((x) => Number.parseInt(x, 10)).map((n) => (Number.isFinite(n) ? n : -1));
    const size = clampSize(c.req.query("s"), 320);
    const snap = toSnapshot(await loadTree(col.id), col.gameStats);
    try {
      const png = await renderNft(snap, picks, size, size, { compression: 3 });
      const img = await asImage(png, size);
      return c.body(new Uint8Array(img.body), 200, { "Content-Type": img.type, "Cache-Control": "private, max-age=60" });
    } catch (e) {
      console.error("[preview]", e);
      return c.json({ error: "render failed" }, 500);
    }
  });
}
