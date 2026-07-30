import { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Shared calm card shell for the Today dashboard. */
export function DashCard({
  title, eyebrow, action, children, className, footer,
}: {
  title?: ReactNode;
  eyebrow?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
  footer?: ReactNode;
}) {
  return (
    <section className={cn(
      "rounded-3xl border border-border/40 bg-card/60 p-5 shadow-soft backdrop-blur-xl",
      className,
    )}>
      {(title || eyebrow || action) && (
        <header className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {eyebrow && (
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{eyebrow}</p>
            )}
            {title && <h3 className="font-display text-base font-semibold leading-tight">{title}</h3>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      {children}
      {footer && <div className="mt-3 border-t border-border/40 pt-3">{footer}</div>}
    </section>
  );
}

export function EmptyLine({ children }: { children: ReactNode }) {
  return <p className="text-[12px] leading-relaxed text-muted-foreground">{children}</p>;
}