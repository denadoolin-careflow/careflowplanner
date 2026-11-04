import type { RhythmPhase } from "@/lib/planner/rhythm-phase";
import { cn } from "@/lib/utils";

/** Small phase-tinted progress ring with the percentage inside. */
export function ProgressRing({ pct, phase, size = 40, className }: { pct: number; phase: RhythmPhase; size?: number; className?: string }) {
  const sw = size > 60 ? 5 : 3.5;
  const r = (size - sw) / 2;
  const c = 2 * Math.PI * r;
  return (
    <span className={cn("relative inline-grid shrink-0 place-items-center", className)} style={{ width: size, height: size }} aria-label={`${pct}% done`}>
      <svg className="absolute inset-0 -rotate-90" width={size} height={size} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`hsl(var(--rhythm-${phase}-tint))`} strokeWidth={sw} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`hsl(var(--rhythm-${phase}-deep))`} strokeWidth={sw} strokeLinecap="round"
          strokeDasharray={`${(c * pct) / 100} ${c}`} />
      </svg>
      <span className={cn("font-bold tabular-nums", size > 60 ? "text-lg" : "text-[11px]")} style={{ color: `hsl(var(--rhythm-${phase}-deep))` }}>{pct}</span>
    </span>
  );
}

/** Rounded due-date / label pill in a phase tint. */
export function PhasePill({ phase, children, className }: { phase: RhythmPhase; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 font-display text-xs", className)}
      style={{ background: `hsl(var(--rhythm-${phase}-tint))`, color: `hsl(var(--rhythm-${phase}-deep))` }}>{children}</span>
  );
}

/** Slim page header shared by Dashboard and Projects. */
export function SlimHeader({ title, subtitle, actions }: { title: string; subtitle: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <header className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-display text-3xl leading-tight text-foreground">{title}</h1>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-sm text-muted-foreground">{subtitle}</div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
    </header>
  );
}
