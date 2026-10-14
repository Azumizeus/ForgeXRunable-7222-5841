import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";
import { locale, useT } from "../../lib/i18n";

export function StepHeader({ n, title, desc, children }: { n: string; title: string; desc?: string; children?: React.ReactNode }) {
  const t = useT();
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="eyebrow">{t("Étape", "Step")} {n}</p>
        <h1 className="mt-2 text-4xl font-extrabold">{title}</h1>
        {desc && <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{desc}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean }) {
  const t = useT();
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
          <motion.div
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 8, opacity: 0 }}
            onMouseDown={(e) => e.stopPropagation()}
            className={cn("panel max-h-[90vh] w-full overflow-y-auto bg-raised shadow-2xl", wide ? "max-w-4xl" : "max-w-lg")}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
              <h3 className="text-lg font-bold">{title}</h3>
              <button type="button" aria-label={t("Fermer", "Close")} onClick={onClose} className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground">
                <X className="size-4" />
              </button>
            </div>
            <div className="p-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="inline-flex items-center gap-2.5 text-sm">
      <span className={cn("relative h-5 w-9 rounded-full transition", checked ? "bg-primary" : "bg-input")}>
        <span className={cn("absolute top-0.5 size-4 rounded-full bg-foreground transition-all", checked ? "left-[18px]" : "left-0.5")} />
      </span>
      {label}
    </button>
  );
}

export function Range({ value, onChange, min, max, step = 1, className, label }: { value: number; onChange: (v: number) => void; min: number; max: number; step?: number; className?: string; label?: string }) {
  const pct = ((value - min) / (max - min || 1)) * 100;
  return (
    <input aria-label={label ?? "Slider"}
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className={cn(
        "h-1.5 w-full cursor-pointer appearance-none rounded-full bg-input [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:shadow [&::-moz-range-thumb]:size-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-foreground",
        className,
      )}
      style={{ background: `linear-gradient(to right, #ff5a1f ${pct}%, #2f2821 ${pct}%)` }}
    />
  );
}

/** Local draft that commits after `delay` ms of inactivity (or on blur via returned flush). */
export function useDraft<T>(value: T, commit: (v: T) => void, delay = 500) {
  const [draft, setDraft] = useState(value);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(value);
  const key = JSON.stringify(value);
  const [seen, setSeen] = useState(key);
  if (seen !== key) {
    // external change (server refetch): resync unless the user is mid-edit
    setSeen(key);
    latest.current = value;
    if (!t.current) setDraft(value);
  }
  const set = (v: T) => {
    setDraft(v);
    if (t.current) clearTimeout(t.current);
    t.current = setTimeout(() => {
      t.current = null;
      if (JSON.stringify(v) !== JSON.stringify(latest.current)) commit(v);
    }, delay);
  };
  return [draft, set] as const;
}

export function Stat({ label, value, tone }: { label: string; value: React.ReactNode; tone?: "primary" | "gold" | "ok" | "bad" }) {
  return (
    <div className="panel px-4 py-3">
      <p className="eyebrow text-[10px]">{label}</p>
      <p className={cn("mt-1 font-display text-2xl font-extrabold", tone === "primary" && "text-primary", tone === "gold" && "text-gold", tone === "ok" && "text-ok", tone === "bad" && "text-destructive")}>{value}</p>
    </div>
  );
}

export function CodeBlock({ code, filename }: { code: string; filename: string }) {
  const [copied, setCopied] = useState(false);
  const t = useT();
  return (
    <div className="overflow-hidden rounded-[10px] border border-border bg-[#0a0807]">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <span className="font-mono text-xs text-muted-foreground">{filename}</span>
        <button
          type="button"
          className="font-mono text-[11px] text-muted-foreground hover:text-primary"
          onClick={() => {
            navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          }}
        >
          {copied ? t("copié ✓", "copied ✓") : t("copier", "copy")}
        </button>
      </div>
      <pre className="max-h-[420px] overflow-auto p-4 font-mono text-[12px] leading-5 text-foreground/80">{code}</pre>
    </div>
  );
}

export const fmt = (n: number) => n.toLocaleString(locale());
