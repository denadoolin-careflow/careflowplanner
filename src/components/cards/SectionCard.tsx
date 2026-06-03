import { ReactNode, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export function SectionCard({
  title, subtitle, action, children, className, accent, collapsibleId, defaultOpen = true, collapsedPreview,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  accent?: "warm" | "calm" | "sage" | "none";
  collapsibleId?: string;
  defaultOpen?: boolean;
  collapsedPreview?: ReactNode;
}) {
  const storageKey = collapsibleId ? `careflow:today-section:${collapsibleId}` : null;
  const [open, setOpen] = useState<boolean>(() => {
    if (!storageKey || typeof window === "undefined") return defaultOpen;
    try {
      const v = localStorage.getItem(storageKey);
      if (v === "1") return true;
      if (v === "0") return false;
    } catch {}
    return defaultOpen;
  });
  useEffect(() => {
    if (!storageKey) return;
    try { localStorage.setItem(storageKey, open ? "1" : "0"); } catch {}
  }, [storageKey, open]);

  if (collapsibleId) {
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
        <Collapsible open={open} onOpenChange={setOpen}>
          <header className="flex flex-col items-stretch gap-2 px-5 pt-5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
            <CollapsibleTrigger asChild>
              <button type="button" className="-mx-2 flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1 text-left transition-colors hover:bg-muted/30">
                <div className="min-w-0 flex-1">
                  {title && <h2 className="font-display text-lg font-semibold leading-tight">{title}</h2>}
                  {subtitle && <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>}
                </div>
                {collapsedPreview && !open && (
                  <span className="ml-2 hidden shrink-0 truncate text-xs text-muted-foreground sm:inline">{collapsedPreview}</span>
                )}
                <ChevronDown className={cn("ml-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
              </button>
            </CollapsibleTrigger>
            {action && open && <div className="flex w-full items-center gap-2 sm:w-auto sm:shrink-0">{action}</div>}
          </header>
          <CollapsibleContent>
            <div className="px-5 pb-5 pt-3">{children}</div>
          </CollapsibleContent>
        </Collapsible>
      </section>
    );
  }

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
