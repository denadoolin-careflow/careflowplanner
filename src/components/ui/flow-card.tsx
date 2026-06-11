import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * FlowCard — shared card primitive for Cosmic / Carey / Today surfaces.
 * One radius, one border, one backdrop. Tone sets a soft top-gradient
 * sourced from the flow's accent.
 */
const flowCardVariants = cva(
  "relative overflow-hidden rounded-2xl border border-border/60 bg-card/70 backdrop-blur-sm text-card-foreground shadow-soft transition-colors",
  {
    variants: {
      tone: {
        default: "",
        cosmic: "before:bg-[radial-gradient(60%_80%_at_85%_0%,hsl(262_70%_60%/0.18),transparent_70%)]",
        carey: "before:bg-[radial-gradient(60%_80%_at_15%_0%,hsl(346_70%_60%/0.16),transparent_70%)]",
        today: "before:bg-[radial-gradient(60%_80%_at_85%_0%,hsl(var(--primary)/0.18),transparent_70%)]",
        calm: "before:bg-[radial-gradient(60%_80%_at_50%_0%,hsl(var(--accent)/0.14),transparent_70%)]",
      },
      size: {
        sm: "p-3",
        md: "p-4",
        lg: "p-6",
      },
      interactive: {
        true: "cursor-pointer hover:shadow-cozy hover:-translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        false: "",
      },
    },
    compoundVariants: [
      { tone: "cosmic", className: "before:pointer-events-none before:absolute before:inset-0 before:opacity-80" },
      { tone: "carey", className: "before:pointer-events-none before:absolute before:inset-0 before:opacity-80" },
      { tone: "today", className: "before:pointer-events-none before:absolute before:inset-0 before:opacity-80" },
      { tone: "calm", className: "before:pointer-events-none before:absolute before:inset-0 before:opacity-80" },
    ],
    defaultVariants: { tone: "default", size: "md", interactive: false },
  },
);

export interface FlowCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof flowCardVariants> {
  asChild?: boolean;
}

export const FlowCard = React.forwardRef<HTMLDivElement, FlowCardProps>(
  ({ className, tone, size, interactive, children, ...props }, ref) => (
    <div ref={ref} className={cn(flowCardVariants({ tone, size, interactive }), className)} {...props}>
      <div className="relative">{children}</div>
    </div>
  ),
);
FlowCard.displayName = "FlowCard";

export const FlowCardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-start justify-between gap-3", className)} {...props} />
  ),
);
FlowCardHeader.displayName = "FlowCardHeader";

export const FlowCardEyebrow = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn("text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground", className)}
      {...props}
    />
  ),
);
FlowCardEyebrow.displayName = "FlowCardEyebrow";

export const FlowCardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("font-display text-lg font-semibold leading-tight", className)} {...props} />
  ),
);
FlowCardTitle.displayName = "FlowCardTitle";

export const FlowCardActions = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex shrink-0 items-center gap-1", className)} {...props} />
  ),
);
FlowCardActions.displayName = "FlowCardActions";

export const FlowCardBody = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("mt-3 text-sm", className)} {...props} />,
);
FlowCardBody.displayName = "FlowCardBody";

export const FlowCardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("mt-4 flex items-center justify-between gap-2", className)} {...props} />
  ),
);
FlowCardFooter.displayName = "FlowCardFooter";