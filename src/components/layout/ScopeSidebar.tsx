import { useState } from "react";
import { ArrowDown, ArrowUp, GripVertical, PanelRightClose, PanelRightOpen, Plus, RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { CollapsibleWidget } from "@/components/today/CollapsibleWidget";
import { useCollapsedWidgets, useSidebarHidden } from "@/lib/today-view";
import { useSidebarOrder } from "@/lib/today-sidebar-order";
import { buildSidebarWidgetRegistry } from "@/components/today/widget-registry";

interface Props {
  /** Anchor date used by the per-day widgets. */
  date: Date;
  /** Scope namespace for persisted preferences (week, month, …). */
  scope?: "week" | "month";
  /** Optional task click handler (opens task editor). */
  onTaskClick?: (id: string) => void;
  /** Extra widgets/cards rendered above the shared rail (e.g. unscheduled tasks). */
  children?: React.ReactNode;
}

/**
 * Shared widgets rail for the Week and Month pages. Mirrors the Today
 * sidebar: customizable order, per-widget hide + restore, collapsible cards.
 */
export function ScopeSidebar({ date, scope = "week", onTaskClick, children }: Props) {
  const { collapsed, toggle: toggleCollapsed } = useCollapsedWidgets();
  const [reorderMode, setReorderMode] = useState(false);
  const [sidebarHidden, setSidebarHidden] = useSidebarHidden();

  // Shared registry — identical shape/options across Today, Week and Month.
  const registry = buildSidebarWidgetRegistry();
  const widgetOpts = { date, onTaskClick };
  const canonical = registry.map(w => w.id);
  const byId = new Map(registry.map(w => [w.id, w]));

  // Shared with Today via `careflow:today:sidebar-order:v1` so widget order
  // and per-widget hidden state stay in sync across Today / Week / Month.
  const { order, hidden, move, remove, restore, restoreAll, reset } = useSidebarOrder(canonical);

  return (
    <>
    {sidebarHidden ? (
      <button
        type="button"
        onClick={() => setSidebarHidden(false)}
        className="fixed right-0 top-24 z-40 hidden md:inline-flex items-center gap-1 rounded-l-full border border-r-0 border-border/60 bg-card/90 px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground shadow-sm backdrop-blur hover:text-foreground"
        title="Show widgets"
      >
        <PanelRightOpen className="h-3 w-3" />
        <span className="hidden lg:inline">Widgets</span>
      </button>
    ) : (
    <aside className="min-w-0 max-w-full space-y-3 md:sticky md:top-20 md:max-h-[calc(100vh-6rem)] md:w-[clamp(240px,28vw,340px)] md:self-start md:overflow-y-auto md:pr-1">
      <div className="flex items-center justify-between gap-2 px-1">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {reorderMode ? "Edit widgets" : "Widgets"}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setSidebarHidden(true)}
            className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-card/70 px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground backdrop-blur hover:text-foreground"
            title="Hide widgets"
          >
            <PanelRightClose className="h-2.5 w-2.5" /> Hide
          </button>
          {reorderMode && (
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              title="Reset to default order"
            >
              <RotateCcw className="h-2.5 w-2.5" /> Reset
            </button>
          )}
          <button
            type="button"
            onClick={() => setReorderMode(v => !v)}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider transition-colors",
              reorderMode
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
            )}
            title="Toggle reorder mode"
          >
            <GripVertical className="h-2.5 w-2.5" /> {reorderMode ? "Done" : "Edit"}
          </button>
        </div>
      </div>

      {children}

      <div className="space-y-3">
        {order.map((id, idx) => {
          const w = byId.get(id);
          if (!w) return null;
          if (hidden.has(id)) return null;
          const node = w.render(widgetOpts);
          if (!node) return null;
          if (!reorderMode) {
            return (
              <CollapsibleWidget
                key={id}
                id={id}
                title={w.label}
                collapsed={collapsed.has(id)}
                onToggle={() => toggleCollapsed(id)}
              >
                {node}
              </CollapsibleWidget>
            );
          }
          return (
            <div key={id} className="relative min-w-0">
              <div className="absolute -left-1 top-1 z-10 flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => move(id, -1)}
                  disabled={idx === 0}
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-background/90 text-muted-foreground shadow-sm ring-1 ring-border hover:text-foreground disabled:opacity-30"
                  aria-label={`Move ${w.label} up`}
                >
                  <ArrowUp className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => move(id, 1)}
                  disabled={idx === order.length - 1}
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-background/90 text-muted-foreground shadow-sm ring-1 ring-border hover:text-foreground disabled:opacity-30"
                  aria-label={`Move ${w.label} down`}
                >
                  <ArrowDown className="h-3 w-3" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => remove(id)}
                className="absolute -right-1 top-1 z-10 inline-flex h-5 w-5 items-center justify-center rounded-full bg-background/90 text-muted-foreground shadow-sm ring-1 ring-border hover:text-destructive"
                aria-label={`Remove ${w.label}`}
                title={`Remove ${w.label}`}
              >
                <X className="h-3 w-3" />
              </button>
              <div className="rounded-2xl ring-1 ring-dashed ring-primary/40">
                {node}
              </div>
            </div>
          );
        })}
      </div>

      {hidden.size > 0 && (
        <div className="mt-4 rounded-2xl border border-dashed border-border/60 bg-card/40 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Hidden ({hidden.size})
            </span>
            <button
              type="button"
              onClick={restoreAll}
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            >
              <RotateCcw className="h-2.5 w-2.5" /> Restore all
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {canonical.filter(id => hidden.has(id)).map(id => {
              const w = byId.get(id);
              if (!w) return null;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => restore(id)}
                  className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/80 px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
                  title={`Restore ${w.label}`}
                >
                  <Plus className="h-3 w-3" /> {w.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </aside>
    )}
    </>
  );
}