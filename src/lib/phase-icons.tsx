import { Heart, Leaf, Moon, Sprout, type LucideIcon } from "lucide-react";
import type { RhythmPhase } from "@/lib/planner/rhythm-phase";
import { cn } from "@/lib/utils";

/** Single source of CareFlow phase icons: Plan leaf, Grow sprout, Care heart, Let go crescent moon. */
export const PHASE_ICONS: Record<RhythmPhase, LucideIcon> = { plan: Leaf, grow: Sprout, care: Heart, letgo: Moon };
export const GARDEN_PHASE_ICONS = { Plan: Leaf, Grow: Sprout, Care: Heart, "Let go": Moon } as const;

/** Round phase-colored badge (light tint fill, deep phase line icon). */
export function PhaseIcon({ phase, className, size = "md" }: { phase: RhythmPhase; className?: string; size?: "sm" | "md" }) {
  const Icon = PHASE_ICONS[phase];
  return (
    <span
      aria-hidden
      className={cn("inline-grid shrink-0 place-items-center rounded-full", size === "sm" ? "h-6 w-6" : "h-9 w-9", className)}
      style={{ background: `hsl(var(--rhythm-${phase}-tint))`, color: `hsl(var(--rhythm-${phase}-deep))` }}
    >
      <Icon className={size === "sm" ? "h-3.5 w-3.5" : "h-4.5 w-4.5"} strokeWidth={1.75} />
    </span>
  );
}
