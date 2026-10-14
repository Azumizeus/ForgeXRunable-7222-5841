import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import type { AppRouterClient } from "../../api";
import { currentToken } from "./auth";
import { getLang, tr } from "./i18n";

const link = new RPCLink({
  url: `${window.location.origin}/api/rpc`,
  headers: () => {
    const token = currentToken();
    const h: Record<string, string> = { "x-lang": getLang() };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  },
});

/** Direct typed client: await client.ping() */
export const client: AppRouterClient = createORPCClient(link);

/** TanStack Query helpers: useQuery(orpc.ping.queryOptions()) */
export const orpc = createTanstackQueryUtils(client);

/** Human message from an oRPC error. */
export function errMsg(e: unknown) {
  if (e && typeof e === "object" && "message" in e) return String((e as { message: string }).message);
  return tr("Une erreur est survenue", "Something went wrong");
}
export function isQuotaError(e: unknown) {
  return !!(e && typeof e === "object" && "data" in e && (e as { data?: { code?: string } }).data?.code === "QUOTA");
}
