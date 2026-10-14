import { ORPCError } from "@orpc/server";
import { base } from "../__core/app";
import { auth } from "../auth";
import { langFromHeaders, withLang } from "../lib/i18n";

/** Optional auth — `context.user` is the session user or null. */
export const withUser = base.use(async ({ context, next }) => {
  const session = await auth.api.getSession({ headers: context.headers });
  return withLang(langFromHeaders(context.headers), () =>
    next({
      context: { user: session?.user ?? null, session: session?.session ?? null },
    }),
  );
});

/** Protected procedures — rejects unauthenticated calls; `context.user` is non-null. */
export const authed = base.use(async ({ context, next }) => {
  const session = await auth.api.getSession({ headers: context.headers });
  const l = langFromHeaders(context.headers);
  if (!session) throw new ORPCError("UNAUTHORIZED", { message: l === "en" ? "Sign-in required" : "Connexion requise" });
  return withLang(l, () => next({ context: { user: session.user, session: session.session } }));
});
