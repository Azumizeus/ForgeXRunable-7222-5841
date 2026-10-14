import { useSyncExternalStore } from "react";
import { cn } from "./utils";

export type Lang = "fr" | "en";

const KEY = "forgex.lang";
const listeners = new Set<() => void>();

function detect(): Lang {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "fr" || saved === "en") return saved;
  } catch {
    /* storage unavailable */
  }
  const nav = typeof navigator !== "undefined" ? navigator.language || "" : "";
  return nav.toLowerCase().startsWith("fr") ? "fr" : "en";
}

const TITLE = { fr: "Forge-X — Générateur de collections NFT Solana", en: "Forge-X — Solana NFT collection generator" };
function applyDoc(l: Lang) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = l;
  if (document.title.startsWith("Forge-X")) document.title = TITLE[l];
}

let current: Lang = detect();
applyDoc(current);

export function getLang(): Lang {
  return current;
}

export function setLang(l: Lang) {
  if (l === current) return;
  current = l;
  try {
    localStorage.setItem(KEY, l);
  } catch {
    /* ignore */
  }
  applyDoc(l);
  for (const fn of listeners) fn();
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useLang(): Lang {
  return useSyncExternalStore(subscribe, getLang, getLang);
}

/** Bilingual string picker: t("Bonjour", "Hello"). */
export type T = (fr: string, en: string) => string;

export function tr(fr: string, en: string, lang: Lang = current) {
  return lang === "en" ? en : fr;
}

export function useT(): T {
  const lang = useLang();
  return (fr, en) => (lang === "en" ? en : fr);
}

/** Locale string for Intl APIs. */
export function locale(lang: Lang = current) {
  return lang === "en" ? "en-US" : "fr-FR";
}

export function LangSwitch({ className }: { className?: string }) {
  const lang = useLang();
  return (
    <div className={cn("inline-flex items-center rounded-full border border-border p-0.5 font-mono text-[10px] font-bold uppercase", className)}>
      {(["fr", "en"] as const).map((l) => (
        <button
          key={l}
          type="button"
          aria-label={l === "fr" ? "Français" : "English"}
          onClick={() => setLang(l)}
          className={cn("rounded-full px-2 py-0.5 tracking-wider transition", lang === l ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
