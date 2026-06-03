import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

const KEY = (id: string) => `careflow:today-section:${id}`;

export function CollapsibleSection({
  id,
  title,
  subtitle,
  icon,
  preview,
  accent,
  defaultOpen = true,
  className,
  children,
}: {
  id: string;
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  preview?: ReactNode;
  accent?: "warm" | "calm" | "sage" | "none";
  defaultOpen?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return defaultOpen;
    try {
      const v = localStorage.getItem(KEY(id));
      if (v === "1") return true;
      if (v === "0") return false;
    } catch {}
    return defaultOpen;
  });

  useEffect(() => {
    try { localStorage.setItem(KEY(id), open ? "1" : "0"); } catch {}
  }, [id, open]);

  return (
    <section className={cn("cozy-card overflow-hidden", className)}>
      {accent && accent !== "none" && (
        <div
          className={cn(
            "h-1 w-full",
            accent === "warm" && "bg-accent",
            accent === "calm" && "bg-primary",
            accent === "sage" && "bg-secondary",
          )}
        />
      )}
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-muted/30"
          >
            {icon && <div className="shrink-0">{icon}</div>}
            <div className="min-w-0 flex-1">
              <div className="font-display text-base font-semibold leading-tight">{title}</div>
              {subtitle && (
                <div className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</div>
              )}
            </div>
            {preview && !open && (
              <div className="ml-2 hidden min-w-0 shrink-0 truncate text-xs text-muted-foreground sm:block">
                {preview}
              </div>
            )}
            <ChevronDown
              className={cn(
                "ml-2 h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                open && "rotate-180",
              )}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
          <div className="px-5 pb-5 pt-1">{children}</div>
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
}