import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Persisted collapsible wrapper for planning-header sections.
 * The `storageKey` is shared across Day/Week/Month so the user's
 * minimize preference carries across those pages.
 */
export function CollapsibleSection({
  storageKey,
  title,
  eyebrow,
  defaultCollapsed = true,
  children,
}: {
  storageKey: string;
  title: string;
  eyebrow?: string;
  defaultCollapsed?: boolean;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem(storageKey);
      if (v === "1") return true;
      if (v === "0") return false;
    } catch {}
    return defaultCollapsed;
  });
  useEffect(() => {
    try { localStorage.setItem(storageKey, collapsed ? "1" : "0"); } catch {}
  }, [storageKey, collapsed]);

  return (
    <section className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm">
      <button
        type="button"
        onClick={() => setCollapsed(c => !c)}
        aria-expanded={!collapsed}
        className="flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-2.5 text-left transition hover:bg-muted/40"
      >
        <span className="min-w-0">
          {eyebrow && (
            <span className="block text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              {eyebrow}
            </span>
          )}
          <span className="block truncate text-sm font-medium text-foreground">{title}</span>
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            !collapsed && "rotate-180",
          )}
        />
      </button>
      {!collapsed && <div className="px-1 pb-1 sm:px-2 sm:pb-2">{children}</div>}
    </section>
  );
}