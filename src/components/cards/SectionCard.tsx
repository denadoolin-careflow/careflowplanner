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
        <header className="flex flex-col gap-3 px-5 pt-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            {title && <h2 className="font-display text-lg font-semibold leading-tight">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          {action && <div className="-mx-1 flex max-w-full items-center gap-2 overflow-x-auto px-1 sm:mx-0 sm:px-0">{action}</div>}
        </header>
      )}
      <div className="px-5 pb-5 pt-3">{children}</div>
    </section>
  );
}
