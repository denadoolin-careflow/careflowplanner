import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ALL_WIDGET_TYPES, WIDGET_REGISTRY } from "./WidgetRegistry";
import type { WidgetInstance, WidgetType } from "@/lib/dashboard-layouts";
import { Eye } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  hiddenWidgets: WidgetInstance[];
  onAdd: (type: WidgetType) => void;
  onUnhide: (id: string) => void;
}

export function AddWidgetSheet({ open, onOpenChange, hiddenWidgets, onAdd, onUnhide }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Add a widget</SheetTitle>
          <SheetDescription>Pick something useful. Notes & lists can be added more than once.</SheetDescription>
        </SheetHeader>

        {hiddenWidgets.length > 0 && (
          <div className="mt-6">
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

        <div className="mt-6">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">All widgets</h3>
          <div className="grid grid-cols-2 gap-2">
            {ALL_WIDGET_TYPES.map((t) => {
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
      </SheetContent>
    </Sheet>
  );
}