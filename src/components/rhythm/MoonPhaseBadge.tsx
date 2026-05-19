import { cn } from "@/lib/utils";
import { getMoonData } from "@/lib/moon-providers";

interface Props {
  date?: Date;
  className?: string;
  /** When true, shows only the glyph (icon-only chip). */
  iconOnly?: boolean;
}

/**
 * Compact moon-phase chip — glyph + short label. Pairs visually with
 * <ElementBadge /> on dashboard / calendar / reset surfaces so users
 * see the day's rhythm at a glance.
 */
export function MoonPhaseBadge({ date = new Date(), className, iconOnly = false }: Props) {
  const moon = getMoonData(date);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-moon-soft/60 px-2.5 py-1 text-[11px] text-moon-foreground shadow-sm",
        "backdrop-blur-sm transition-colors",
        className,
      )}
      title={`${moon.label} — moon phase`}
      aria-label={`Moon phase: ${moon.label}`}
    >
      <span aria-hidden className="text-sm leading-none drop-shadow-[0_0_6px_hsl(var(--moon)/0.6)]">
        {moon.glyph}
      </span>
      {!iconOnly && <span className="font-medium">{moon.label}</span>}
    </span>
  );
}