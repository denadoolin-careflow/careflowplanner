import { cn } from "@/lib/utils";
import { getMoonData } from "@/lib/moon-providers";
import { getMoonSign } from "@/lib/zodiac";

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
  const sign = moon.sign ? { name: moon.sign, symbol: getMoonSign(date).symbol } : getMoonSign(date);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-card/95 px-2.5 py-1 text-[11px] font-medium text-card-foreground shadow-sm",
        "backdrop-blur-md transition-colors",
        className,
      )}
      title={`${moon.label} · Moon in ${sign.name}`}
      aria-label={`Moon phase: ${moon.label}, Moon in ${sign.name}`}
    >
      <span aria-hidden className="text-sm leading-none drop-shadow-[0_0_6px_hsl(var(--moon)/0.6)]">
        {moon.glyph}
      </span>
      {!iconOnly && (
        <>
          <span className="font-medium">{moon.label}</span>
          <span className="opacity-70" aria-hidden>·</span>
          <span aria-hidden className="leading-none">{sign.symbol}</span>
          <span className="font-normal opacity-80">{sign.name}</span>
        </>
      )}
    </span>
  );
}