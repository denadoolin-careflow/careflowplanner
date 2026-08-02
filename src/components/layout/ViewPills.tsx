import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ViewPillItem<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
}

/**
 * Shared rounded-pill view switcher used in PlanHeader's `views` slot by
 * Today, Week and Month so every planning page switches views the same way.
 * Scrolls horizontally on narrow screens instead of wrapping to a second row.
 */
export function ViewPills<T extends string>({
  items, value, onChange, ariaLabel = "View", className,
}: {
  items: ViewPillItem<T>[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex max-w-full shrink items-center gap-0.5 overflow-x-auto rounded-full border border-border/60 bg-card/70 p-0.5 text-[11px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {items.map((it) => {
        const Icon = it.icon;
        const active = value === it.value;
        return (
          <button
            key={it.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(it.value)}
            className={cn(
              "inline-flex min-h-[32px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 transition-colors",
              active ? "bg-primary/15 font-medium text-primary" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {Icon && <Icon className="h-3.5 w-3.5" />}
            {it.label}
          </button>
        );
      })}
    </div>
  );
}