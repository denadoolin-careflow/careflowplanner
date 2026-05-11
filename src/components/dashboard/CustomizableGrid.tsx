import { useMemo, useState, useEffect } from "react";
import { Responsive, WidthProvider, Layout } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { useDashboardLayout, type PageKey, type GridItem } from "@/lib/dashboard-layouts";
import { WIDGET_REGISTRY } from "./WidgetRegistry";
import { WidgetFrame } from "./WidgetFrame";
import { AddWidgetSheet } from "./AddWidgetSheet";
import { Button } from "@/components/ui/button";
import { Pencil, Check, Plus, RotateCcw } from "lucide-react";
import { haptics } from "@/lib/haptics";
import { toast } from "sonner";

const ResponsiveGridLayout = WidthProvider(Responsive);

interface Props {
  pageKey: PageKey;
}

export function CustomizableGrid({ pageKey }: Props) {
  const {
    data, loading, updateLayout, addWidget, removeWidget,
    hideWidget, updateWidgetProps, resetToDefault,
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
        layouts={{ lg: visibleLayout as Layout[], md: visibleLayout as Layout[], sm: visibleLayout as Layout[], xs: visibleLayout as Layout[], xxs: visibleLayout as Layout[] }}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 12, sm: 6, xs: 4, xxs: 1 }}
        rowHeight={64}
        margin={[16, 16]}
        containerPadding={[0, 0]}
        isDraggable={editing}
        isResizable={editing}
        draggableHandle=".drag-handle"
        onLayoutChange={(l) => {
          if (!editing) return;
          // merge new positions back into full layout (preserve hidden item positions)
          const map = new Map(l.map((x) => [x.i, x]));
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