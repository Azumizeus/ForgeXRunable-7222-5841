import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export * from "./auth-schema";

const now = () => new Date();

export const collections = sqliteTable("collections", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  symbol: text("symbol").notNull().default("NFT"),
  description: text("description").notNull().default(""),
  externalUrl: text("external_url").notNull().default(""),
  size: integer("size").notNull().default(100),
  network: text("network").notNull().default("devnet"),
  width: integer("width").notNull().default(1024),
  height: integer("height").notNull().default(1024),
  royaltyBps: integer("royalty_bps").notNull().default(500),
  /** JSON [{address, share}] */
  creators: text("creators").notNull().default("[]"),
  seed: text("seed").notNull().default(""),
  /** JSON {base: {stat: value}} — per-trait bonuses live on traits.stats */
  gameStats: text("game_stats").notNull().default('{"base":{}}'),
  /** JSON {price, treasury, goLiveDate, tokenStandard, isSequential} */
  candy: text("candy").notNull().default("{}"),
  status: text("status").notNull().default("draft"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(now),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(now),
});

export const layers = sqliteTable("layers", {
  id: text("id").primaryKey(),
  collectionId: text("collection_id").notNull(),
  name: text("name").notNull(),
  position: integer("position").notNull().default(0),
  allowNone: integer("allow_none", { mode: "boolean" }).notNull().default(false),
  noneWeight: integer("none_weight").notNull().default(50),
  blendMode: text("blend_mode").notNull().default("over"),
  opacity: integer("opacity").notNull().default(100),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(now),
});

export const traits = sqliteTable("traits", {
  id: text("id").primaryKey(),
  layerId: text("layer_id").notNull(),
  collectionId: text("collection_id").notNull(),
  name: text("name").notNull(),
  weight: integer("weight").notNull().default(10),
  imageKey: text("image_key").notNull(),
  source: text("source").notNull().default("upload"),
  /** JSON {stat: bonus} */
  stats: text("stats").notNull().default("{}"),
  /** JSON {x, y, scale} — offset in % of canvas, scale in % */
  transform: text("transform").notNull().default("{}"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(now),
});

export const generations = sqliteTable("generations", {
  id: text("id").primaryKey(),
  collectionId: text("collection_id").notNull(),
  seed: text("seed").notNull(),
  requested: integer("requested").notNull(),
  generated: integer("generated").notNull(),
  duplicates: integer("duplicates").notNull().default(0),
  filled: integer("filled").notNull().default(0),
  elapsedMs: integer("elapsed_ms").notNull().default(0),
  /** JSON snapshot of layers/traits used */
  snapshot: text("snapshot").notNull(),
  /** JSON number[][] — per NFT, trait index per layer (-1 = none) */
  items: text("items").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(now),
});

export const exportsTable = sqliteTable("exports", {
  id: text("id").primaryKey(),
  collectionId: text("collection_id").notNull(),
  generationId: text("generation_id").notNull(),
  userId: text("user_id").notNull(),
  status: text("status").notNull().default("queued"),
  progress: integer("progress").notNull().default(0),
  total: integer("total").notNull().default(0),
  fileKey: text("file_key"),
  sizeBytes: real("size_bytes"),
  error: text("error"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(now),
  finishedAt: integer("finished_at", { mode: "timestamp" }),
});

export const actionPlans = sqliteTable("action_plans", {
  collectionId: text("collection_id").primaryKey(),
  content: text("content").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(now),
});
