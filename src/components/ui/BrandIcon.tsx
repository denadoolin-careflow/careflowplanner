import * as React from "react";
import { cn } from "@/lib/utils";
import type { LucideIcon, LucideProps } from "lucide-react";

type Tone = "default" | "forest" | "seasonal" | "sage" | "autumn";

export interface BrandIconProps extends Omit<LucideProps, "ref"> {
  icon: LucideIcon;
  tone?: Tone;
}

const toneClass: Record<Tone, string> = {
  default: "text-foreground",
  forest: "text-primary",
  seasonal: "text-transparent",
  sage: "text-secondary-foreground",
  autumn: "text-accent",
};

/**
 * CareFlow brand icon wrapper. Applies consistent rounded strokes and an
 * optional seasonal gradient. Use for surface-level nav/section icons.
 */
export const BrandIcon = React.forwardRef<SVGSVGElement, BrandIconProps>(
  ({ icon: Icon, tone = "forest", className, strokeWidth = 1.75, ...props }, ref) => {
    if (tone === "seasonal") {
      return (
        <span className={cn("inline-grid place-items-center", className)}>
          <svg width={0} height={0} className="absolute" aria-hidden>
            <defs>
              <linearGradient id="cf-seasonal" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%"   stopColor="hsl(var(--season-autumn))" />
                <stop offset="35%"  stopColor="hsl(var(--season-summer))" />
                <stop offset="55%"  stopColor="hsl(var(--season-spring))" />
                <stop offset="75%"  stopColor="hsl(var(--season-winter))" />
                <stop offset="100%" stopColor="hsl(var(--season-purple))" />
              </linearGradient>
            </defs>
          </svg>
          <Icon
            ref={ref}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            stroke="url(#cf-seasonal)"
            {...props}
          />
        </span>
      );
    }
    return (
      <Icon
        ref={ref}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn(toneClass[tone], className)}
        {...props}
      />
    );
  },
);
BrandIcon.displayName = "BrandIcon";