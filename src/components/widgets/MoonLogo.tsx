import { cn } from "@/lib/utils";

/**
 * Hand-drawn crescent + star logo ported from Lunar Life Home. Pure SVG,
 * uses semantic tokens so it adapts to any theme. Animates with the
 * existing `animate-float` keyframe when present.
 */
export function MoonLogo({ className, size = 28 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      role="img"
      aria-label="Lunar"
      className={cn("animate-float", className)}
    >
      <defs>
        <radialGradient id="moonHalo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="hsl(var(--primary) / 0.35)" />
          <stop offset="100%" stopColor="hsl(var(--primary) / 0)" />
        </radialGradient>
      </defs>
      <circle cx="20" cy="20" r="18" fill="url(#moonHalo)" />
      <path
        d="M26 7a14 14 0 1 0 7 19 11 11 0 0 1-7-19z"
        fill="hsl(var(--card))"
        stroke="hsl(var(--primary))"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="11" r="0.9" fill="hsl(var(--primary))" />
      <circle cx="32" cy="31" r="0.7" fill="hsl(var(--primary))" />
    </svg>
  );
}