import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SectionCard({
  title, subtitle, action, children, className, accent,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  accent?: "warm" | "calm" | "sage" | "none";
}) {
  return (
    <section className={cn("cozy-card cozy-card-hover overflow-hidden", className)}>
      {(accent && accent !== "none") && (
        <div className={cn(
          "h-1 w-full",
          accent === "warm" && "bg-accent",
          accent === "calm" && "bg-primary",
          accent === "sage" && "bg-secondary",
        )} />
      )}
      {(title || action) && (
        <header className="flex flex-col items-start gap-2 px-5 pt-5 sm:flex-row sm:justify-between sm:gap-3">
          <div className="min-w-0">
            {title && <h2 className="font-display text-lg font-semibold leading-tight">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          {action && <div className="flex w-full items-center gap-2 sm:w-auto sm:shrink-0">{action}</div>}
        </header>
      )}
      <div className="px-5 pb-5 pt-3">{children}</div>
    </section>
  );
}
