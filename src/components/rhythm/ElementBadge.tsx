import { Flame, Wind, Droplet, Mountain, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { getElementMeta, useRecommendationTone, type ElementMeta, type RecommendationTone } from "@/lib/rhythm-forecast";

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
  const [tone, setTone] = useRecommendationTone();
  const recommendation = TONE_RECOMMENDATIONS[tone][meta.id];

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
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Icon className={cn("h-4 w-4", meta.accent.text)} />
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Today's element
            </span>
          </div>
          <div className="flex rounded-full border border-border/60 bg-background/60 p-0.5 text-[9px] uppercase tracking-wider">
            {(["gentle", "actionable"] as RecommendationTone[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={(e) => { e.stopPropagation(); setTone(t); }}
                className={cn(
                  "rounded-full px-2 py-0.5 transition-colors",
                  tone === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
                aria-pressed={tone === t}
                title={t === "gentle" ? "Gentle recommendations" : "More actionable recommendations"}
              >
                {t === "gentle" ? "Gentle" : "Active"}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-1 font-display text-sm">
          {meta.label} · <span className="text-muted-foreground">{meta.verb}</span>
        </p>
        <p className="mt-0.5 text-[11.5px] text-foreground/80">{recommendation}</p>
      </div>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-card/95 px-2.5 py-1 text-[11px] font-medium text-card-foreground shadow-sm backdrop-blur-md",
        className,
      )}
      title={recommendation}
      aria-label={`Today's element: ${meta.label} — ${meta.verb}`}
    >
      <Icon className={cn("h-3.5 w-3.5", meta.accent.text)} />
      <span>{meta.label}</span>
      <span className="text-muted-foreground">· {meta.verb}</span>
    </span>
  );
}

// Local mirror of tone copy — keeps badge self-contained without re-fetching.
const TONE_RECOMMENDATIONS: Record<RecommendationTone, Record<ElementMeta["id"], string>> = {
  gentle: {
    fire:  "Pick one small spark — momentum beats a long list.",
    earth: "Tend home, body, routine. Steady wins today.",
    air:   "Send the message, ask the question, write the list.",
    water: "Reflect, release, soften. Rest counts as progress.",
  },
  actionable: {
    fire:  "Ship one thing in 25 min. Start the call, send the pitch, move first.",
    earth: "Block 2 routine tasks back-to-back: meal prep, laundry, or one home reset.",
    air:   "Send 3 messages you've been delaying and write tomorrow's top 3.",
    water: "Close 1 loop: tidy inbox, journal 5 lines, or release one open task.",
  },
};
