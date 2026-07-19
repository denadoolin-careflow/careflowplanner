import { ReactNode } from "react";
import { SeasonalDropIcon } from "./SeasonalDropIcon";
import { cn } from "@/lib/utils";

/**
 * Unified brand empty state. Centered seasonal drop mark with a soft
 * halo, Nunito Sans heading, muted body copy, optional CTA.
 */
export function BrandEmptyState({
  title,
  description,
  action,
  className,
  compact = false,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative mx-auto flex w-full max-w-md flex-col items-center justify-center text-center",
        compact ? "gap-3 py-8" : "gap-4 py-14",
        className,
      )}
    >
      <div className="relative">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 rounded-full blur-2xl"
          style={{ background: "radial-gradient(closest-side, hsl(var(--primary) / 0.18), transparent 70%)" }}
        />
        <SeasonalDropIcon size={compact ? 56 : 84} className="opacity-90" animated />
      </div>
      <h3 className="font-brand text-lg font-bold text-foreground sm:text-xl">{title}</h3>
      {description && (
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}