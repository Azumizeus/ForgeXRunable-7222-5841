import type { RouterClient } from "@orpc/server";
import { createApp } from "./__core/app";
import { ping } from "./routes/ping";
import { collections } from "./routes/collections";
import { layers } from "./routes/layers";
import { traits } from "./routes/traits";
import { generate } from "./routes/generate";
import { exports } from "./routes/exports";
import { plan } from "./routes/plan";
import { billing } from "./routes/billing";
import { candy } from "./routes/candy";
import { registerHttp } from "./lib/http";

export const router = {
  ping,
  collections,
  layers,
  traits,
  generate,
  exports,
  plan,
  billing,
  candy,
};

export type AppRouter = typeof router;
/** Typed client for the router — used by the web and mobile api clients. */
export type AppRouterClient = RouterClient<AppRouter>;

const app = createApp(router);
// Plain HTTP: Better Auth handler, image endpoints (raw binary responses)
registerHttp(app);

export default app;
