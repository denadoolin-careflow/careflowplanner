import { cn } from "@/lib/utils";

/**
 * CareFlow brand mark — line-icon style.
 * Crescent (Care) wrapping a small calendar (Plan) with a tiny growth leaf (Grow).
 * Uses currentColor for stroke so it inherits sidebar/atmosphere/light/dark theme.
 */
export function CareFlowMark({
  className,
  size = 22,
  strokeWidth = 1.5,
}: { className?: string; size?: number; strokeWidth?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role="img"
      aria-label="CareFlow"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(className)}
    >
      {/* Crescent — the gentle "care" hug */}
      <path d="M25.5 6.5a11 11 0 1 0 4 14 8.5 8.5 0 0 1-4-14z" />
      {/* Calendar — plan */}
      <rect x="8.5" y="10.5" width="11" height="10" rx="1.8" />
      <path d="M11 9v2.5M17 9v2.5M8.5 14h11" />
      {/* Heart in the calendar — care */}
      <path d="M14 16.4c0-.7.6-1.2 1.2-1.2.4 0 .7.2.9.5.2-.3.5-.5.9-.5.6 0 1.2.5 1.2 1.2 0 1-2.1 2.2-2.1 2.2s-2.1-1.2-2.1-2.2z" />
      {/* Sprout — grow */}
      <path d="M11.5 24c.8-1.6 2.4-2.4 4-2.4M11.5 24c-.6-1.2-.4-2.6.4-3.4" />
    </svg>
  );
}