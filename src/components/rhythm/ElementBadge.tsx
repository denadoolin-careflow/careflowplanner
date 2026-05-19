import { Flame, Wind, Droplet, Mountain, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { getElementMeta, type ElementMeta } from "@/lib/rhythm-forecast";

const ICONS: Record<ElementMeta["iconName"], LucideIcon> = {
  Flame, Wind, Droplet, Mountain,
};

interface Props {
  date?: Date;
  /** "chip" = compact pill (default), "tile" = stacked w/ recommendation */
  variant?: "chip" | "tile";
  className?: string;
}

/**
 * Lightweight elemental indicator used across Today, Week, and dashboard
 * widgets. Maps the day's sun-sign element → icon + tone.
 */
export function ElementBadge({ date = new Date(), variant = "chip", className }: Props) {
  const meta = getElementMeta(date);
  const Icon = ICONS[meta.iconName];

  if (variant === "tile") {
    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-xl border border-border/60 p-3",
          meta.accent.bg,
          className,
        )}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{ background: `radial-gradient(ellipse at top right, ${meta.accent.glow}, transparent 70%)` }}
        />
        <div className="flex items-center gap-2">
          <Icon className={cn("h-4 w-4", meta.accent.text)} />
          <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Today's element
          </span>
        </div>
        <p className="mt-1 font-display text-sm">
          {meta.label} · <span className="text-muted-foreground">{meta.verb}</span>
        </p>
        <p className="mt-0.5 text-[11.5px] text-foreground/80">{meta.recommendation}</p>
      </div>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border/60 px-2.5 py-1 text-[11px]",
        meta.accent.bg,
        className,
      )}
      title={meta.recommendation}
      aria-label={`Today's element: ${meta.label} — ${meta.verb}`}
    >
      <Icon className={cn("h-3.5 w-3.5", meta.accent.text)} />
      <span className="font-medium">{meta.label}</span>
      <span className="text-muted-foreground">· {meta.verb}</span>
    </span>
  );
}
