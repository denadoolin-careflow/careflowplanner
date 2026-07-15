import { cn } from "@/lib/utils";
import { CareFlowMark } from "./CareFlowMark";

type Rounded = "md" | "lg" | "xl";

/**
 * CareFlow brand logo. Renders the themable SVG mark; optionally
 * pairs it with the wordmark and "Plan · Care · Grow" tagline.
 */
export function CareFlowLogo({
  size = 28,
  className,
  rounded = "xl",
  showTagline = false,
  showWordmark = false,
}: {
  size?: number;
  className?: string;
  /** Legacy prop, ignored. Kept for call-site compatibility. */
  tint?: "primary" | "accent" | "auto";
  rounded?: Rounded;
  showTagline?: boolean;
  showWordmark?: boolean;
}) {
  if (!showWordmark && !showTagline) {
    return (
      <CareFlowMark size={size} rounded={rounded} className={className} decorative={false} />
    );
  }
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <CareFlowMark size={size} rounded={rounded} decorative={false} />
      <span className="min-w-0 leading-tight">
        {showWordmark && (
          <span className="block font-brand text-[16px] font-extrabold tracking-tight text-primary">
            CareFlow
          </span>
        )}
        {showTagline && (
          <span className="block text-[9.5px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Plan · Care · Grow
          </span>
        )}
      </span>
    </span>
  );
}