import { cn } from "@/lib/utils";

/**
 * CareFlow brand mark rendered as a scalable SVG: a seasonal-gradient
 * teardrop enclosing a heart with a checkmark. Inherits the seasonal
 * gradient regardless of theme. Use this anywhere the brand mark needs
 * to be crisp, tinted, or animated (empty states, splash, dialog headers,
 * hero flourishes).
 */
export function SeasonalDropIcon({
  size = 48,
  className,
  monochrome = false,
  animated = false,
  ariaLabel,
}: {
  size?: number;
  className?: string;
  /** Render in a single forest tone instead of the seasonal gradient. */
  monochrome?: boolean;
  /** Gentle float animation. */
  animated?: boolean;
  ariaLabel?: string;
}) {
  const gradId = "cf-drop-grad";
  return (
    <svg
      role={ariaLabel ? "img" : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
      width={size}
      height={size}
      viewBox="0 0 100 120"
      className={cn(animated && "animate-float", className)}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6BA28A" />
          <stop offset="18%" stopColor="#2FB3A5" />
          <stop offset="36%" stopColor="#3B7DD8" />
          <stop offset="55%" stopColor="#7B4FB8" />
          <stop offset="72%" stopColor="#E07A5F" />
          <stop offset="88%" stopColor="#E85D2C" />
          <stop offset="100%" stopColor="#F4A72B" />
        </linearGradient>
      </defs>
      {/* Outer teardrop */}
      <path
        d="M50 6 C68 34 90 52 90 78 A40 40 0 0 1 10 78 C10 52 32 34 50 6 Z"
        fill="none"
        stroke={monochrome ? "hsl(var(--primary))" : `url(#${gradId})`}
        strokeWidth="7"
        strokeLinejoin="round"
      />
      {/* Heart */}
      <path
        d="M50 92 C36 82 28 74 28 64 A10 10 0 0 1 50 60 A10 10 0 0 1 72 64 C72 74 64 82 50 92 Z"
        fill="none"
        stroke={monochrome ? "hsl(var(--primary))" : `url(#${gradId})`}
        strokeWidth="5.5"
        strokeLinejoin="round"
      />
      {/* Check */}
      <path
        d="M40 72 L48 80 L62 66"
        fill="none"
        stroke={monochrome ? "hsl(var(--primary))" : `url(#${gradId})`}
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}