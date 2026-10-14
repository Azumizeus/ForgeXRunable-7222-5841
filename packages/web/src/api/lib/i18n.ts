import { AsyncLocalStorage } from "node:async_hooks";

export type Lang = "fr" | "en";
const store = new AsyncLocalStorage<Lang>();

export function langFromHeaders(h: Headers): Lang {
  const x = (h.get("x-lang") || "").toLowerCase();
  if (x === "fr" || x === "en") return x;
  return (h.get("accept-language") || "").toLowerCase().startsWith("fr") ? "fr" : "en";
}

/** Runs `fn` with the request language bound for every nested `tr()` call (incl. background work it spawns). */
export function withLang<R>(lang: Lang, fn: () => R): R {
  return store.run(lang, fn);
}

export const lang = (): Lang => store.getStore() ?? "en";
export const tr = (fr: string, en: string) => (lang() === "en" ? en : fr);
export const nf = (n: number) => n.toLocaleString(lang() === "en" ? "en-US" : "fr-FR");
