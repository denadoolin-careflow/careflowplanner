import { cn } from "@/lib/utils";

/**
 * CareFlow brand mark — transparent line-art emblem.
 * Circle frame (the gentle sweep of care) holding a calendar (plan),
 * a leaf sprig (grow), and a caregiver embracing a child with a heart.
 * Pure currentColor strokes — inherits any atmosphere/light/dark theme.
 */
export function CareFlowMark({
  className,
  size = 22,
  strokeWidth,
  compact = false,
}: {
  className?: string;
  size?: number;
  strokeWidth?: number;
  /** Bumps stroke weight for ≤16px use (favicon). */
  compact?: boolean;
}) {
  const sw = strokeWidth ?? (compact ? 2.4 : 1.6);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="CareFlow"
      fill="none"
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(className)}
    >
      {/* Outer ring — open at top-right to suggest a crescent sweep */}
      <path d="M52 18a26 26 0 1 1-9.5-9.5" />
      {/* Calendar (upper-left quadrant) */}
      <rect x="17" y="18" width="20" height="17" rx="2.5" />
      <path d="M22 16v4M32 16v4M17 24h20" />
      {/* Tiny heart in the center cell */}
      <path d="M26.4 29.2c0-1 .8-1.7 1.7-1.7.55 0 1.05.27 1.35.7.3-.43.8-.7 1.35-.7.9 0 1.7.7 1.7 1.7 0 1.5-3.05 3.3-3.05 3.3s-3.05-1.8-3.05-3.3z" />
      {/* Leaf sprig (lower-left) — stem + 4 leaves */}
      <path d="M16 50c2-6 6-10 12-11.5" />
      <path d="M18.5 44c1.6.2 3 1.3 3.5 2.8-1.6-.2-3-1.3-3.5-2.8z" />
      <path d="M21.5 40c1.6.2 3 1.3 3.5 2.8-1.6-.2-3-1.3-3.5-2.8z" />
      <path d="M25 37c1.6.2 3 1.3 3.5 2.8-1.6-.2-3-1.3-3.5-2.8z" />
      <path d="M28.5 35c1.6.2 3 1.3 3.5 2.8-1.6-.2-3-1.3-3.5-2.8z" />
      {/* Caregiver + child (lower-right) — embracing arc */}
      <circle cx="44" cy="38" r="2.6" />
      <path d="M37 53c0-4.4 3.6-8 8-8s8 3.6 8 8" />
      <path d="M40 50c1.2-3 3.5-4.5 5.5-4.5" />
      {/* Heart at the child's chest */}
      <path d="M42.4 48.6c0-1 .8-1.7 1.7-1.7.55 0 1.05.27 1.35.7.3-.43.8-.7 1.35-.7.9 0 1.7.7 1.7 1.7 0 1.5-3.05 3.3-3.05 3.3s-3.05-1.8-3.05-3.3z" />
    </svg>
  );
}