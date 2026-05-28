import { cn } from "@/lib/utils";
import type { GrowthStage } from "@/lib/habit-consistency";

interface Props {
  stage: GrowthStage;
  size?: number;
  className?: string;
}

// Hand-drawn SVG plants tied to growth stage. Uses currentColor for foliage
// and a muted soil tone so the sage theme stays cohesive.
export function HabitPlant({ stage, size = 96, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={cn("text-primary", className)}
      aria-hidden
    >
      {/* Pot */}
      <path
        d="M28 78 L72 78 L68 94 L32 94 Z"
        className="fill-muted-foreground/30"
      />
      <ellipse cx="50" cy="78" rx="22" ry="3" className="fill-muted-foreground/40" />
      {/* Soil */}
      <ellipse cx="50" cy="77" rx="20" ry="2.5" className="fill-foreground/40" />

      {stage === "seed" && (
        <g>
          <ellipse cx="50" cy="76" rx="4" ry="2.5" className="fill-foreground/60" />
          <path d="M50 74 Q50 70 50 68" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </g>
      )}

      {stage === "sprout" && (
        <g>
          <path d="M50 76 Q50 65 50 58" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M50 64 Q44 60 42 56" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
          <ellipse cx="46" cy="58" rx="5" ry="3" transform="rotate(-30 46 58)" className="fill-current" />
          <ellipse cx="54" cy="56" rx="5" ry="3" transform="rotate(30 54 56)" className="fill-current" />
        </g>
      )}

      {stage === "sapling" && (
        <g>
          <path d="M50 76 L50 44" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M50 60 Q42 56 38 50" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M50 54 Q58 50 62 44" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
          <ellipse cx="38" cy="48" rx="7" ry="4" transform="rotate(-35 38 48)" className="fill-current" />
          <ellipse cx="62" cy="42" rx="7" ry="4" transform="rotate(35 62 42)" className="fill-current" />
          <ellipse cx="50" cy="40" rx="6" ry="4" className="fill-current" />
        </g>
      )}

      {stage === "bloom" && (
        <g>
          <path d="M50 76 L50 38" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <ellipse cx="38" cy="50" rx="8" ry="4.5" transform="rotate(-35 38 50)" className="fill-current" />
          <ellipse cx="62" cy="46" rx="8" ry="4.5" transform="rotate(35 62 46)" className="fill-current" />
          <ellipse cx="50" cy="36" rx="8" ry="5" className="fill-current" />
          {/* Flowers */}
          <circle cx="36" cy="42" r="3" className="fill-accent" />
          <circle cx="64" cy="38" r="3" className="fill-accent" />
          <circle cx="48" cy="28" r="3.5" className="fill-accent" />
          <circle cx="48" cy="28" r="1.2" className="fill-foreground/60" />
        </g>
      )}

      {stage === "tree" && (
        <g>
          <path d="M50 76 L50 50" stroke="currentColor" strokeWidth="3.5" fill="none" strokeLinecap="round" />
          <circle cx="50" cy="36" r="18" className="fill-current opacity-90" />
          <circle cx="36" cy="44" r="11" className="fill-current opacity-90" />
          <circle cx="64" cy="44" r="11" className="fill-current opacity-90" />
          <circle cx="42" cy="30" r="8" className="fill-current opacity-95" />
          <circle cx="58" cy="30" r="8" className="fill-current opacity-95" />
          {/* Subtle highlights */}
          <circle cx="44" cy="32" r="2" className="fill-background/40" />
          <circle cx="60" cy="40" r="1.5" className="fill-background/40" />
        </g>
      )}
    </svg>
  );
}
