import { cn } from "@/lib/utils";

type Rounded = "md" | "lg" | "xl";

const roundedMap: Record<Rounded, string> = {
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-[22%]",
};

/**
 * CareFlow brand mark — a themable SVG yin-yang with a leafy stem,
 * a heart medallion (yin) and a calendar medallion (yang). Every
 * fill/stroke uses semantic atmosphere tokens so the mark recolors
 * automatically per atmosphere and inverts cleanly in dark mode.
 */
export function CareFlowMark({
  size = 36,
  className,
  rounded = "xl",
  decorative = true,
}: {
  size?: number;
  className?: string;
  rounded?: Rounded;
  decorative?: boolean;
}) {
  return (
    <span
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : "CareFlow"}
      aria-hidden={decorative || undefined}
      className={cn(
        "relative inline-grid shrink-0 place-items-center overflow-hidden shadow-sm ring-1 ring-border/60",
        roundedMap[rounded],
        className,
      )}
      style={{ width: size, height: size, background: "hsl(var(--card))" }}
    >
      <svg
        viewBox="0 0 100 100"
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
        className="block"
      >
        <defs>
          <filter id="cf-soft" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="0.4" />
          </filter>
        </defs>

        {/* Outer rounded plate — already provided by the span background.
            We draw an inner highlight ring for the embossed feel. */}
        <rect
          x="2" y="2" width="96" height="96" rx="22"
          fill="none"
          stroke="hsl(var(--border))"
          strokeOpacity="0.55"
          strokeWidth="0.8"
        />

        {/* Yin (light) half — left, filled with background token */}
        <path
          d="M50 8
             A42 42 0 0 0 50 92
             A21 21 0 0 1 50 50
             A21 21 0 0 0 50 8 Z"
          fill="hsl(var(--background))"
          stroke="hsl(var(--border))"
          strokeOpacity="0.6"
          strokeWidth="0.8"
        />
        {/* Yang (dark) half — right, filled with primary token */}
        <path
          d="M50 8
             A42 42 0 0 1 50 92
             A21 21 0 0 0 50 50
             A21 21 0 0 1 50 8 Z"
          fill="hsl(var(--primary))"
        />

        {/* Leafy stem flowing along the yin curve */}
        <g
          fill="hsl(var(--primary) / 0.45)"
          stroke="hsl(var(--primary) / 0.85)"
          strokeWidth="0.9"
          strokeLinejoin="round"
        >
          <path
            d="M40 78 Q 38 62 44 50 Q 50 38 52 22"
            fill="none"
          />
          {/* lower leaf */}
          <path d="M40 76 Q 33 74 31 68 Q 38 67 42 72 Z" />
          {/* middle leaf */}
          <path d="M40 60 Q 32 56 32 48 Q 40 49 44 56 Z" />
          {/* upper leaf (crosses into yang) */}
          <path
            d="M52 40 Q 62 36 70 40 Q 64 48 54 48 Z"
            fill="hsl(var(--primary-soft, var(--background)) / 0.85)"
            stroke="hsl(var(--background) / 0.7)"
          />
          <path
            d="M62 32 Q 70 28 78 32 Q 72 40 62 40 Z"
            fill="hsl(var(--primary-soft, var(--background)) / 0.85)"
            stroke="hsl(var(--background) / 0.7)"
          />
        </g>

        {/* Heart medallion (top, on yang side near the curve) */}
        <g>
          <circle
            cx="52" cy="30" r="10"
            fill="hsl(var(--primary))"
            stroke="hsl(var(--background) / 0.9)"
            strokeWidth="1.2"
          />
          <path
            d="M52 35
               C 49 32 46.5 30.2 46.5 27.8
               C 46.5 26.2 47.8 25 49.4 25
               C 50.5 25 51.5 25.6 52 26.5
               C 52.5 25.6 53.5 25 54.6 25
               C 56.2 25 57.5 26.2 57.5 27.8
               C 57.5 30.2 55 32 52 35 Z"
            fill="hsl(var(--accent))"
          />
        </g>

        {/* Calendar medallion (bottom, on yang side) */}
        <g>
          <circle
            cx="58" cy="72" r="11"
            fill="hsl(var(--background))"
            stroke="hsl(var(--border))"
            strokeOpacity="0.7"
            strokeWidth="0.8"
          />
          <g
            stroke="hsl(var(--primary))"
            strokeWidth="1"
            strokeLinecap="round"
            fill="none"
          >
            <rect x="52" y="68" width="12" height="9" rx="1.2" />
            <path d="M54.5 67v2 M61.5 67v2 M52 71h12" />
          </g>
          <path
            d="M58 76
               C 56.6 74.7 55.4 73.9 55.4 72.8
               C 55.4 72.1 55.95 71.6 56.65 71.6
               C 57.15 71.6 57.6 71.85 58 72.25
               C 58.4 71.85 58.85 71.6 59.35 71.6
               C 60.05 71.6 60.6 72.1 60.6 72.8
               C 60.6 73.9 59.4 74.7 58 76 Z"
            fill="hsl(var(--accent))"
          />
        </g>

        {/* Inner highlight along plate edge for the embossed feel */}
        <rect
          x="4" y="4" width="92" height="92" rx="20"
          fill="none"
          stroke="hsl(var(--background))"
          strokeOpacity="0.25"
          strokeWidth="0.6"
        />
      </svg>
    </span>
  );
}