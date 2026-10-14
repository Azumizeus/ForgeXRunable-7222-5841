import { Link } from "wouter";
import { cn } from "../lib/utils";

export function Logo({ className, to = "/" }: { className?: string; to?: string }) {
  return (
    <Link to={to} className={cn("group inline-flex shrink-0 items-center gap-2.5 whitespace-nowrap", className)}>
      <span className="relative grid size-8 place-items-center rounded-[7px] bg-primary text-primary-foreground shadow-[0_0_24px_-4px_rgba(255,90,31,0.7)]">
        <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="square">
          <path d="M5 5l14 14M19 5L5 19" />
          <path d="M3 12h4M17 12h4" strokeWidth="2" />
        </svg>
      </span>
      <span className="font-display text-[19px] font-extrabold tracking-[-0.04em]">
        Forge<span className="text-primary">-X</span>
      </span>
    </Link>
  );
}

export const inIframe = () => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
};
