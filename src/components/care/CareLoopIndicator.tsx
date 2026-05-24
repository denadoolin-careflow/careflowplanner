import { Link } from "react-router-dom";
import { Inbox, Target, Repeat, Wind } from "lucide-react";
import { cn } from "@/lib/utils";

export type CarePhase = "capture" | "anchor" | "rhythm" | "exhale";

const PHASES: { id: CarePhase; label: string; icon: typeof Inbox; tint: string; href: string; hint: string }[] = [
  { id: "capture", label: "Capture", icon: Inbox,  tint: "from-sky-400/30 to-sky-300/10",       href: "/inbox",   hint: "Empty your head" },
  { id: "anchor",  label: "Anchor",  icon: Target, tint: "from-amber-400/30 to-amber-300/10",   href: "/today",   hint: "Choose what matters" },
  { id: "rhythm",  label: "Rhythm",  icon: Repeat, tint: "from-emerald-400/30 to-emerald-300/10", href: "/routines", hint: "Move through the day" },
  { id: "exhale",  label: "Exhale",  icon: Wind,   tint: "from-violet-400/30 to-violet-300/10", href: "/journal", hint: "Reflect and release" },
];

interface Props {
  active: CarePhase;
  className?: string;
  /** Compact variant — smaller padding and labels. */
  compact?: boolean;
}

/**
 * Visual CARE Loop progress indicator (Capture → Anchor → Rhythm → Exhale).
 * Used across Today, Journal, Review, and Reset so users feel their
 * current phase within the larger daily loop. Each phase links to the
 * primary page for that phase.
 */
export function CareLoopIndicator({ active, className, compact = false }: Props) {
  const activeIdx = PHASES.findIndex(p => p.id === active);
  return (
    <nav
      aria-label="CARE Loop progress"
      className={cn(
        "group/loop relative overflow-hidden rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm",
        compact ? "p-1.5" : "p-2 sm:p-3",
        className,
      )}
    >
      <ol className="relative flex items-stretch gap-0.5 sm:gap-2">
        {PHASES.map((p, i) => {
          const Icon = p.icon;
          const isActive = p.id === active;
          const isPast = i < activeIdx;
          const showConnector = i < PHASES.length - 1;
          const connectorActive = i < activeIdx;
          return (
            <li key={p.id} className="relative flex-1 basis-0 min-w-0">
              {showConnector && (
                <span
                  aria-hidden
                  className={cn(
                    "pointer-events-none absolute right-[-4px] top-1/2 hidden h-px w-2 -translate-y-1/2 sm:block",
                    connectorActive ? "bg-primary/40" : "bg-border/60",
                  )}
                />
              )}
              <Link
                to={p.href}
                aria-current={isActive ? "step" : undefined}
                className={cn(
                  "group/phase flex h-full min-w-0 items-center justify-center gap-1.5 rounded-xl px-1.5 py-1.5 transition-all sm:justify-start sm:gap-2 sm:px-2.5 sm:py-2",
                  "hover:bg-muted/50",
                  isActive && "bg-gradient-to-br shadow-[0_0_0_1px_hsl(var(--primary)/0.25),0_8px_24px_-12px_hsl(var(--primary)/0.4)]",
                  isActive && p.tint,
                )}
              >
                <span
                  className={cn(
                    "grid shrink-0 place-items-center rounded-full transition-all",
                    compact ? "h-6 w-6 sm:h-7 sm:w-7" : "h-6 w-6 sm:h-8 sm:w-8",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-[0_0_18px_-4px_hsl(var(--primary)/0.7)]"
                      : isPast
                        ? "bg-primary/20 text-primary"
                        : "bg-muted/60 text-muted-foreground",
                  )}
                >
                  <Icon className={cn(compact ? "h-3 w-3 sm:h-3.5 sm:w-3.5" : "h-3 w-3 sm:h-4 sm:w-4")} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn(
                    "block truncate text-[10px] font-semibold tracking-wide sm:text-xs",
                    isActive ? "text-foreground" : "text-muted-foreground",
                  )}>
                    {p.label}
                  </span>
                  {!compact && (
                    <span className="hidden truncate text-[10px] text-muted-foreground/80 sm:block">
                      {p.hint}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}