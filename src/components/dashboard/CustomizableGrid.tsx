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
import { Pencil, Check, Plus, RotateCcw, Palette, Layers, Trash2 } from "lucide-react";
import { haptics } from "@/lib/haptics";
import { toast } from "sonner";
import { WidgetThemePicker } from "./WidgetThemePicker";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

const ResponsiveGridLayout = WidthProvider(Responsive);

interface Props {
  pageKey: PageKey;
}

export function CustomizableGrid({ pageKey }: Props) {
  const {
    data, loading, updateLayout, addWidget, removeWidget,
    hideWidget, updateWidgetProps, resetToDefault,
    setPageTheme, setWidgetTheme, toggleCollapsed,
    preset, presets, switchPreset, createPreset, deletePreset,
  } = useDashboardLayout(pageKey);
  const [editing, setEditing] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

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

  const visibleWidgets = useMemo(
    () => (data?.widgets ?? []).filter((w) => !w.hidden),
    [data],
  );

  const visibleLayout = useMemo<GridItem[]>(() => {
    if (!data) return [];
    const ids = new Set(visibleWidgets.map((w) => w.id));
    return data.layout.filter((l) => ids.has(l.i));
  }, [data, visibleWidgets]);

  if (loading || !data) {
    return <div className="grid place-items-center py-20 text-sm text-muted-foreground">Loading layout…</div>;
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
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

      <ResponsiveGridLayout
        className="layout"
        layouts={{
          lg: visibleLayout as unknown as Layout,
          md: visibleLayout as unknown as Layout,
          sm: visibleLayout as unknown as Layout,
          xs: visibleLayout as unknown as Layout,
          xxs: visibleLayout as unknown as Layout,
        }}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 12, sm: 6, xs: 4, xxs: 1 }}
        rowHeight={64}
        margin={[16, 16]}
        containerPadding={[0, 0]}
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
                onHide={() => { hideWidget(w.id, true); haptics.tap(); toast("Hidden — find it in Add widget."); }}
                onRemove={() => { removeWidget(w.id); haptics.delete(); toast("Widget removed."); }}
              >
                <Comp props={w.props} onChange={(next: Record<string, any>) => updateWidgetProps(w.id, next)} />
              </WidgetFrame>
            </div>
          );
        })}
      </ResponsiveGridLayout>

      <AddWidgetSheet
        open={addOpen}
        onOpenChange={setAddOpen}
        hiddenWidgets={data.widgets.filter((w) => w.hidden)}
        onUnhide={(id) => { hideWidget(id, false); haptics.tap(); }}
        onAdd={(type) => {
          const spec = WIDGET_REGISTRY[type];
          addWidget(type, spec.defaultSize);
          haptics.snap();
          toast.success(`${spec.title} added.`);
        }}
      />
    </div>
  );
}