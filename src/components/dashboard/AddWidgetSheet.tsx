import { useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { ALL_WIDGET_TYPES, WIDGET_REGISTRY } from "./WidgetRegistry";
import type { WidgetInstance, WidgetType } from "@/lib/dashboard-layouts";
import { Eye, Search } from "lucide-react";

/** Category buckets so the dock feels curated rather than a wall of tiles. */
const CATEGORY_ORDER = ["Focus", "Calendar", "Meals & pantry", "Home", "Care & health", "Wealth", "Cosmic", "Reflect", "Utilities"] as const;
type Category = typeof CATEGORY_ORDER[number];
const CATEGORY_OF: Record<WidgetType, Category> = {
  top3: "Focus", "task-progress": "Focus", pomodoro: "Focus", rhythm: "Focus", "todays-focus": "Focus", "who-needs-me": "Focus", "mental-load-dump": "Focus", "mom-checkin": "Focus",
  "appointments-today": "Calendar", "upcoming-snapshot": "Calendar", birthdays: "Calendar", holidays: "Calendar", weather: "Calendar",
  "meals-today": "Meals & pantry", "whats-for-dinner": "Meals & pantry", "pantry-status": "Meals & pantry", "grocery-list-mini": "Meals & pantry", "low-stock": "Meals & pantry",
  "home-reset": "Home", "home-reset-checklist": "Home", "weekly-reset": "Home", "chore-today": "Home", "home-overdue": "Home", "home-reset-quick": "Home", "family-tasks": "Home",
  "care-checkins": "Care & health", "habits-today": "Care & health", "health-checkin": "Care & health", "weight-trend": "Care & health", "movement-week": "Care & health", cycle: "Care & health",
  "budget-summary": "Wealth", "upcoming-bills": "Wealth", "debt-progress": "Wealth",
  moon: "Cosmic", "moon-guidance-hero": "Cosmic", "rhythm-forecast": "Cosmic", "transits-today": "Cosmic", "lunar-planner": "Cosmic", "carey-snapshot": "Cosmic", "transit-remember": "Cosmic",
  goals: "Reflect", ideas: "Reflect", "journal-prompt": "Reflect", "soft-moment": "Reflect",
  note: "Utilities", "mini-tasks": "Utilities",
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  hiddenWidgets: WidgetInstance[];
  onAdd: (type: WidgetType) => void;
  onUnhide: (id: string) => void;
}

export function AddWidgetSheet({ open, onOpenChange, hiddenWidgets, onAdd, onUnhide }: Props) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ALL_WIDGET_TYPES.filter((t) => !q || WIDGET_REGISTRY[t].title.toLowerCase().includes(q));
  }, [query]);

  const grouped = useMemo(() => {
    const map = new Map<Category, WidgetType[]>();
    for (const t of filtered) {
      const cat = CATEGORY_OF[t] ?? "Utilities";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(t);
    }
    return CATEGORY_ORDER.filter((c) => map.has(c)).map((c) => ({ cat: c, items: map.get(c)! }));
  }, [filtered]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-hidden sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Widget dock</SheetTitle>
          <SheetDescription>Search or browse by category. Notes & lists can be added more than once.</SheetDescription>
        </SheetHeader>

        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search widgets…"
            className="pl-9"
            autoFocus
          />
        </div>

        <div className="mt-4 flex-1 space-y-6 overflow-y-auto pb-8 pr-1">
        {hiddenWidgets.length > 0 && !query && (
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Hidden on this page</h3>
            <div className="space-y-1.5">
              {hiddenWidgets.map((w) => {
                const spec = WIDGET_REGISTRY[w.type];
                if (!spec) return null;
                const Icon = spec.icon;
                return (
                  <button
                    key={w.id}
                    onClick={() => onUnhide(w.id)}
                    className="flex w-full items-center gap-3 rounded-xl border border-border/60 bg-card p-3 text-left transition-colors hover:bg-muted/40"
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1 text-sm font-medium">{spec.title}</span>
                    <Eye className="h-4 w-4 text-primary" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {grouped.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">No widgets match "{query}".</p>
        )}
        {grouped.map(({ cat, items }) => (
          <div key={cat}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{cat}</h3>
            <div className="grid grid-cols-2 gap-2">
              {items.map((t) => {
                const spec = WIDGET_REGISTRY[t];
                const Icon = spec.icon;
                return (
                  <button
                    key={t}
                    onClick={() => { onAdd(t); onOpenChange(false); }}
                    className="flex flex-col items-start gap-2 rounded-xl border border-border/60 bg-card p-3 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-muted/40 hover:shadow"
                  >
                    <Icon className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium leading-tight">{spec.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}