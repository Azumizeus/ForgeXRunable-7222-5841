import { createAuthClient } from "better-auth/react";
import { managedAuthClient } from "@runablehq/managed-auth/client";

const config = {
  applicationId: import.meta.env.VITE_APPLICATION_ID,
  issuer: import.meta.env.VITE_RUNABLE_AUTH_ISSUER,
};

const TOKEN_KEY = "forgex_bearer";

/** Bearer from email/password sign-in (managed auth keeps its own). */
export const emailToken = {
  get: () => (typeof localStorage === "undefined" ? "" : (localStorage.getItem(TOKEN_KEY) ?? "")),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

let managedToken: () => string = () => "";

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_WEBSITE_URL ?? window.location.origin,
  basePath: "/api/auth",
  plugins: [managedAuthClient(config)],
  fetchOptions: {
    auth: { type: "Bearer", token: (): string => managedToken() || emailToken.get() },
    onSuccess: (ctx) => {
      const t = ctx.response.headers.get("set-auth-token");
      if (t) emailToken.set(t);
    },
  },
});

managedToken = () => authClient.managedAuth.getToken() ?? "";

export function currentToken(): string {
  return authClient.managedAuth.getToken() || emailToken.get();
}

export async function signOut() {
  emailToken.clear();
  await authClient.signOut();
}
