import { useMemo, useState, useEffect } from "react";
// Use legacy entry which still ships WidthProvider + Responsive HOC API
import { Responsive, WidthProvider, type Layout } from "react-grid-layout/legacy";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { useDashboardLayout, type PageKey, type GridItem } from "@/lib/dashboard-layouts";
import { WIDGET_REGISTRY } from "./WidgetRegistry";
import { WidgetFrame } from "./WidgetFrame";
import { AddWidgetSheet } from "./AddWidgetSheet";
import { Button } from "@/components/ui/button";
import { Pencil, Check, Plus, RotateCcw, Palette, Layers, Trash2, Wand2, Undo2, Redo2, LayoutGrid, Columns3, ListOrdered, Sparkles } from "lucide-react";
import { haptics } from "@/lib/haptics";
import { toast } from "sonner";
import { WidgetThemePicker } from "./WidgetThemePicker";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { compactLayout } from "@/lib/dashboard-pack";
import { AlternateLayout } from "./AlternateLayout";

const ResponsiveGridLayout = WidthProvider(Responsive);

/** Group widgets into themed sections for the mobile swipeable view. */
const MOBILE_SECTIONS: Array<{ id: string; label: string; types: string[] }> = [
  { id: "focus", label: "Today Focus", types: ["top3", "task-progress", "pomodoro", "rhythm"] },
  { id: "calendar", label: "Calendar", types: ["appointments-today", "weather", "moon", "holidays", "birthdays"] },
  { id: "meals", label: "Meals", types: ["meals-today"] },
  { id: "reset", label: "Weekly Reset", types: ["weekly-reset", "home-reset", "home-reset-checklist", "chore-today", "home-overdue"] },
  { id: "care", label: "Care & Health", types: ["habits-today", "health-checkin", "weight-trend", "movement-week", "care-checkins", "family-tasks"] },
  { id: "wealth", label: "Wealth", types: ["budget-summary", "upcoming-bills", "debt-progress"] },
  { id: "reflect", label: "Reflect", types: ["goals", "ideas", "journal-prompt", "soft-moment", "note", "mini-tasks"] },
];

/** Quick-add bus: WidgetFrame "+" buttons broadcast, QuickAddFab listens. */
function broadcastQuickAdd(event: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("careflow:quick-add", { detail: { tab: event } }));
}

interface Props {
  pageKey: PageKey;
  hero?: React.ReactNode;
  sectionTitle?: string;
}

export function CustomizableGrid({ pageKey, hero, sectionTitle }: Props) {
  const {
    data, loading, updateLayout, addWidget, removeWidget,
    hideWidget, updateWidgetProps, resetToDefault,
    setPageTheme, setWidgetTheme, toggleCollapsed,
    preset, presets, switchPreset, createPreset, deletePreset,
    undo, redo, canUndo, canRedo,
  } = useDashboardLayout(pageKey);
  const [editing, setEditing] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const isMobile = useIsMobile();
  const [activeSection, setActiveSection] = useState(MOBILE_SECTIONS[0].id);

  // Layout mode: freeform Grid (default), Kanban columns, or Timeline stack.
  type LayoutMode = "grid" | "kanban" | "timeline";
  const MODE_KEY = `careflow:layout-mode:${pageKey}`;
  const [mode, setMode] = useState<LayoutMode>(() => {
    if (typeof window === "undefined") return "grid";
    return (window.localStorage.getItem(MODE_KEY) as LayoutMode) || "grid";
  });
  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem(MODE_KEY, mode);
  }, [MODE_KEY, mode]);

  // Inject minimal CSS to taste the grid handles
  useEffect(() => {
    if (document.getElementById("rgl-custom-css")) return;
    const s = document.createElement("style");
    s.id = "rgl-custom-css";
    s.textContent = `
      .react-grid-item.react-grid-placeholder { background: hsl(var(--primary) / 0.18); border-radius: 1rem; }
      .react-grid-item > .react-resizable-handle { z-index: 30; }
    `;
    document.head.appendChild(s);
  }, []);

  // Global undo/redo shortcuts (only while in edit mode to avoid stealing focus).
  useEffect(() => {
    if (!editing) return;
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement | null)?.isContentEditable) return;
      if (e.key === "z" && !e.shiftKey) {
        if (canUndo) { e.preventDefault(); undo(); haptics.tap(); toast("Undid last change."); }
      } else if ((e.key === "z" && e.shiftKey) || e.key === "y") {
        if (canRedo) { e.preventDefault(); redo(); haptics.tap(); toast("Redid change."); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editing, canUndo, canRedo, undo, redo]);

  /** Heuristic AI-style preset suggestion based on the current hour + day. */
  const suggestPreset = () => {
    const h = new Date().getHours();
    const day = new Date().getDay();
    let name = "Focus";
    let blurb = "Deep-work widgets up top.";
    if (h < 10)              { name = "Morning Routine";  blurb = "Rhythm, moon guidance, and today's focus."; }
    else if (h < 14)         { name = "Focus";            blurb = "Pomodoro + top 3 for midday work."; }
    else if (h < 18)         { name = "Afternoon Care";   blurb = "Care check-ins and family tasks."; }
    else                     { name = "Evening Wind-down"; blurb = "Reflection, journal, moon."; }
    if (day === 0 || day === 6) { name = "Weekly Planning"; blurb = "Weekly reset + upcoming events."; }

    if (!presets.includes(name)) {
      createPreset(name, true);
      toast.success(`Suggested "${name}" — ${blurb}`);
    } else {
      switchPreset(name);
      toast(`Switched to "${name}" — ${blurb}`);
    }
    haptics.snap();
  };

  const visibleWidgets = useMemo(
    () => (data?.widgets ?? []).filter((w) => !w.hidden),
    [data],
  );

  const visibleLayout = useMemo<GridItem[]>(() => {
    if (!data) return [];
    const ids = new Set(visibleWidgets.map((w) => w.id));
    return data.layout.filter((l) => ids.has(l.i));
  }, [data, visibleWidgets]);

  /** Clamp x/w to fit a breakpoint's column count so widgets never overflow
   *  or leave gaps at narrow widths. react-grid-layout will vertically
   *  compact the result, so items always snap into place. */
  const fitToCols = (items: GridItem[], cols: number): GridItem[] =>
    items.map((it) => {
      const w = Math.min(Math.max(1, it.w), cols);
      const x = Math.min(Math.max(0, it.x), cols - w);
      return { ...it, x, w };
    });

  const responsiveLayouts = useMemo(() => ({
    lg:  fitToCols(visibleLayout, 12),
    md:  fitToCols(visibleLayout, 12),
    sm:  fitToCols(visibleLayout, 6),
    xs:  fitToCols(visibleLayout, 4),
    xxs: fitToCols(visibleLayout, 1),
  }), [visibleLayout]);

  const autoArrange = () => {
    if (!data) return;
    const cols = window.innerWidth >= 996 ? 12 : window.innerWidth >= 768 ? 6 : window.innerWidth >= 480 ? 4 : 1;
    const packed = compactLayout(visibleLayout, cols);
    // merge packed positions back into the full layout (hidden items untouched)
    const map = new Map(packed.map((x) => [x.i, x]));
    const merged = data.layout.map((it) => {
      const u = map.get(it.i);
      return u ? { ...it, x: u.x, y: u.y, w: u.w, h: u.h } : it;
    });
    updateLayout(merged as GridItem[]);
    haptics.snap();
    toast.success("Widgets snapped into place.");
  };

  // Group widgets by mobile section for the swipeable layout.
  const mobileGrouped = useMemo(() => {
    const order = new Map(MOBILE_SECTIONS.map((s, i) => [s.id, i] as const));
    const sections = MOBILE_SECTIONS.map((s) => ({
      ...s,
      widgets: visibleWidgets.filter((w) => s.types.includes(w.type)),
    }));
    const claimed = new Set(sections.flatMap((s) => s.widgets.map((w) => w.id)));
    const leftovers = visibleWidgets.filter((w) => !claimed.has(w.id));
    if (leftovers.length) sections.push({ id: "more", label: "More", types: [], widgets: leftovers });
    return sections.filter((s) => s.widgets.length).sort(
      (a, b) => (order.get(a.id) ?? 99) - (order.get(b.id) ?? 99),
    );
  }, [visibleWidgets]);

  if (loading || !data) {
    return <div className="grid place-items-center py-20 text-sm text-muted-foreground">Loading layout…</div>;
  }

  return (
    <div>
      {hero ? <div className="mb-4">{hero}</div> : null}

      {sectionTitle && (
        <div className="mb-3 flex items-end justify-between">
          <h2 className="font-display text-xl font-semibold tracking-tight">{sectionTitle}</h2>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
        {/* Layout mode toggle */}
        <div className="inline-flex rounded-md border border-border/60 bg-card/60 p-0.5">
          {([
            { id: "grid", label: "Grid", icon: LayoutGrid },
            { id: "kanban", label: "Kanban", icon: Columns3 },
            { id: "timeline", label: "Timeline", icon: ListOrdered },
          ] as const).map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => { setMode(m.id); haptics.tap(); }}
              className={cn(
                "inline-flex items-center gap-1 rounded-[5px] px-2 py-1 text-xs font-medium transition-colors",
                mode === m.id ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground",
              )}
              title={`${m.label} view`}
            >
              <m.icon className="h-3.5 w-3.5" /> {m.label}
            </button>
          ))}
        </div>

        <Button variant="outline" size="sm" onClick={suggestPreset} title="AI-suggest a layout for right now">
          <Sparkles className="mr-1 h-4 w-4" /> Suggest
        </Button>

        <Button variant="outline" size="sm" onClick={autoArrange} title="Snap widgets into a clean grid">
          <Wand2 className="mr-1 h-4 w-4" /> Auto-arrange
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="font-medium">
              <Layers className="mr-1 h-4 w-4" /> {preset}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Layout presets</DropdownMenuLabel>
            {presets.map((name) => (
              <DropdownMenuItem
                key={name}
                onClick={() => { switchPreset(name); haptics.tap(); }}
                className={name === preset ? "bg-muted/60" : ""}
              >
                <Layers className="mr-2 h-3.5 w-3.5 opacity-60" />
                <span className="flex-1">{name}</span>
                {name !== "Default" && (
                  <Trash2
                    className="ml-2 h-3.5 w-3.5 text-destructive opacity-70 hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete preset "${name}"?`)) {
                        deletePreset(name);
                        haptics.delete();
                        toast("Preset deleted.");
                      }
                    }}
                  />
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                const name = prompt("Name this preset (e.g. Recovery day, Workday):");
                if (name?.trim()) {
                  createPreset(name.trim(), true);
                  haptics.snap();
                  toast.success(`Saved preset "${name.trim()}".`);
                }
              }}
            >
              <Plus className="mr-2 h-3.5 w-3.5" /> Save current as new preset…
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <WidgetThemePicker
          value={data.pageTheme}
          onChange={(t) => { setPageTheme(t); haptics.tap(); }}
          trigger={
            <Button variant="outline" size="sm">
              <Palette className="mr-1 h-4 w-4" /> Page theme
            </Button>
          }
        />

        {editing && (
          <>
            <Button
              variant="ghost"
              size="sm"
              disabled={!canUndo}
              onClick={() => { undo(); haptics.tap(); }}
              title="Undo (⌘Z)"
            >
              <Undo2 className="mr-1 h-4 w-4" /> Undo
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={!canRedo}
              onClick={() => { redo(); haptics.tap(); }}
              title="Redo (⌘⇧Z)"
            >
              <Redo2 className="mr-1 h-4 w-4" /> Redo
            </Button>
            <Button variant="outline" size="sm" onClick={() => { setAddOpen(true); haptics.tap(); }}>
              <Plus className="mr-1 h-4 w-4" /> Add widget
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (confirm("Reset this page's layout to default?")) {
                  resetToDefault();
                  toast.success("Layout reset.");
                }
              }}
            >
              <RotateCcw className="mr-1 h-4 w-4" /> Reset
            </Button>
          </>
        )}
        <Button
          variant={editing ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setEditing((e) => !e);
            haptics.pickup();
          }}
        >
          {editing ? <><Check className="mr-1 h-4 w-4" /> Done</> : <><Pencil className="mr-1 h-4 w-4" /> Edit layout</>}
        </Button>
      </div>

      {/* Kanban & Timeline modes short-circuit the freeform grid. */}
      {!isMobile && mode !== "grid" ? (
        <AlternateLayout
          mode={mode}
          widgets={visibleWidgets}
          pageTheme={data.pageTheme}
          onHide={(id) => { hideWidget(id, true); haptics.tap(); }}
          onRemove={(id) => { removeWidget(id); haptics.delete(); }}
          onToggleCollapse={(id) => { toggleCollapsed(id); haptics.tap(); }}
          onUpdateProps={updateWidgetProps}
          onQuickAdd={broadcastQuickAdd}
          editing={editing}
        />
      ) : isMobile ? (
        <div className="space-y-3">
          {/* Section pills */}
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {mobileGrouped.map((s) => (
              <button
                key={s.id}
                onClick={() => { setActiveSection(s.id); haptics.tap(); document.getElementById(`mob-section-${s.id}`)?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" }); }}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-all",
                  activeSection === s.id
                    ? "border-primary/40 bg-primary/15 text-primary shadow-[0_0_12px_-2px_hsl(var(--primary)/0.5)]"
                    : "border-border/60 bg-card/60 text-muted-foreground",
                )}
              >
                {s.label}
                <span className="ml-1 opacity-60">{s.widgets.length}</span>
              </button>
            ))}
          </div>
          {/* Swipeable sections — horizontal scroll-snap, single column inside */}
          <div
            className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            onScroll={(e) => {
              const el = e.currentTarget;
              const idx = Math.round(el.scrollLeft / el.clientWidth);
              const id = mobileGrouped[idx]?.id;
              if (id && id !== activeSection) setActiveSection(id);
            }}
          >
            {mobileGrouped.map((s) => (
              <section
                id={`mob-section-${s.id}`}
                key={s.id}
                className="w-full shrink-0 snap-start space-y-3"
                style={{ minWidth: "100%" }}
              >
                {s.widgets.map((w) => {
                  const spec = WIDGET_REGISTRY[w.type];
                  if (!spec) return null;
                  const Comp = spec.Component;
                  return (
                    <div key={w.id} className="min-h-[260px]">
                      <WidgetFrame
                        title={spec.title}
                        icon={spec.icon}
                        editing={false}
                        bare={spec.bare}
                        pageTheme={data.pageTheme}
                        widgetTheme={w.theme}
                        pageHref={spec.pageHref}
                        onQuickAdd={spec.quickAddEvent ? () => { broadcastQuickAdd(spec.quickAddEvent!); haptics.tap(); } : undefined}
                        collapsed={!spec.bare && !!w.collapsed}
                        onToggleCollapse={spec.bare ? undefined : () => { toggleCollapsed(w.id); haptics.tap(); }}
                        onHide={() => { hideWidget(w.id, true); }}
                        onRemove={() => { removeWidget(w.id); }}
                      >
                        <Comp props={w.props} onChange={(next: Record<string, any>) => updateWidgetProps(w.id, next)} />
                      </WidgetFrame>
                    </div>
                  );
                })}
              </section>
            ))}
          </div>
        </div>
      ) : (
      <ResponsiveGridLayout
        className="layout"
        layouts={responsiveLayouts as unknown as { [k: string]: Layout }}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 12, sm: 6, xs: 4, xxs: 1 }}
        rowHeight={64}
        margin={[16, 16]}
        containerPadding={[0, 0]}
        compactType="vertical"
        preventCollision={false}
        isDraggable={editing}
        isResizable={editing}
        draggableHandle=".drag-handle"
        onLayoutChange={(l: any[]) => {
          if (!editing) return;
          // merge new positions back into full layout (preserve hidden item positions)
          const map = new Map(l.map((x: any) => [x.i, x]));
          const merged = data.layout.map((it) => {
            const u = map.get(it.i);
            return u ? { ...it, x: u.x, y: u.y, w: u.w, h: u.h } : it;
          });
          updateLayout(merged as GridItem[]);
        }}
        onDragStart={() => haptics.pickup()}
        onDragStop={() => haptics.snap()}
        onResizeStop={() => haptics.snap()}
      >
        {visibleWidgets.map((w) => {
          const spec = WIDGET_REGISTRY[w.type];
          if (!spec) return <div key={w.id} />;
          const Comp = spec.Component;
          return (
            <div key={w.id}>
              <WidgetFrame
                title={spec.title}
                icon={spec.icon}
                editing={editing}
                bare={spec.bare}
                pageTheme={data.pageTheme}
                widgetTheme={w.theme}
                onThemeChange={spec.bare ? undefined : (t) => { setWidgetTheme(w.id, t); haptics.tap(); }}
                collapsed={!spec.bare && !!w.collapsed}
                onToggleCollapse={spec.bare ? undefined : () => { toggleCollapsed(w.id); haptics.tap(); }}
                pageHref={spec.pageHref}
                onQuickAdd={spec.quickAddEvent ? () => { broadcastQuickAdd(spec.quickAddEvent!); haptics.tap(); } : undefined}
                onHide={() => { hideWidget(w.id, true); haptics.tap(); toast("Hidden — find it in Add widget."); setTimeout(autoArrange, 0); }}
                onRemove={() => { removeWidget(w.id); haptics.delete(); toast("Widget removed."); setTimeout(autoArrange, 0); }}
              >
                <Comp props={w.props} onChange={(next: Record<string, any>) => updateWidgetProps(w.id, next)} />
              </WidgetFrame>
            </div>
          );
        })}
      </ResponsiveGridLayout>
      )}

      <AddWidgetSheet
        open={addOpen}
        onOpenChange={setAddOpen}
        hiddenWidgets={data.widgets.filter((w) => w.hidden)}
        onUnhide={(id) => { hideWidget(id, false); haptics.tap(); setTimeout(autoArrange, 0); }}
        onAdd={(type) => {
          const spec = WIDGET_REGISTRY[type];
          addWidget(type, spec.defaultSize);
          haptics.snap();
          toast.success(`${spec.title} added.`);
          setTimeout(autoArrange, 0);
        }}
      />
    </div>
  );
}