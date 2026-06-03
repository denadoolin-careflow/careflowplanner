import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * CareFlow brand mark — gradient line-icon style.
 * Yin-yang circle hugging a calendar+heart (Plan/Care) on one side and a
 * caregiver cradling a heart with a leafy sprig (Care/Grow) on the other.
 * Stroke uses a per-instance linear gradient built from semantic tokens, so
 * it retints automatically across light/dark + atmosphere presets.
 */
export function CareFlowMark({
  className,
  size = 22,
  strokeWidth = 1.4,
  gradient = true,
}: { className?: string; size?: number; strokeWidth?: number; gradient?: boolean }) {
  const gid = useId().replace(/:/g, "");
  const strokeAttr = gradient ? `url(#cf-grad-${gid})` : "currentColor";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label="CareFlow"
      fill="none"
      stroke={strokeAttr}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(className)}
    >
      {gradient && (
        <defs>
          <linearGradient id={`cf-grad-${gid}`} x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="55%" stopColor="hsl(var(--accent, var(--primary)))" />
            <stop offset="100%" stopColor="hsl(var(--primary-glow, var(--primary)))" />
          </linearGradient>
        </defs>
      )}

      {/* Outer circle */}
      <circle cx="24" cy="24" r="21" />

      {/* Yin-yang S-divider */}
      <path d="M24 3 C 14 12 34 24 24 45" />

      {/* ── Left lobe: calendar + heart ───────────────── */}
      <rect x="9" y="14" width="13" height="11" rx="1.6" />
      <path d="M12 13v2.4M19 13v2.4M9 17.4h13" />
      {/* tiny heart in grid */}
      <path d="M14.4 20.4c0-.7.55-1.2 1.15-1.2.42 0 .78.22 1 .55.22-.33.58-.55 1-.55.6 0 1.15.5 1.15 1.2 0 1.05-2.15 2.3-2.15 2.3s-2.15-1.25-2.15-2.3z" />
      {/* leafy sprig under calendar */}
      <path d="M11 31 C 13 28 16 27 19 27" />
      <path d="M12.4 29.6c-.9-.2-1.6-.9-1.8-1.8.9.2 1.6.9 1.8 1.8z" />
      <path d="M14.6 28.4c-.7-.5-1-1.4-.8-2.3.7.5 1 1.4.8 2.3z" />
      <path d="M17 27.6c-.4-.7-.3-1.7.3-2.4.4.7.3 1.7-.3 2.4z" />

      {/* ── Right lobe: caregiver cradling heart ───────── */}
      {/* head */}
      <circle cx="33.5" cy="22" r="2.4" />
      {/* shoulders/body cradle */}
      <path d="M27.5 33 C 27.5 28 30.2 25.4 33.5 25.4 C 36.8 25.4 39.5 28 39.5 32" />
      {/* inner cradle arc */}
      <path d="M29.6 33 C 29.8 30.4 31.6 28.8 33.7 28.8" />
      {/* heart held inside */}
      <path d="M31.6 32.4c0-1 .8-1.7 1.65-1.7.6 0 1.1.32 1.4.8.3-.48.8-.8 1.4-.8.85 0 1.65.7 1.65 1.7 0 1.5-3.05 3.3-3.05 3.3s-3.05-1.8-3.05-3.3z" />
    </svg>
  );
}