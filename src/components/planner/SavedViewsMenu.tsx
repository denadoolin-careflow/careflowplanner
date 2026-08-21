/**
 * Saved views — save the current filters + layout as a named, re-runnable view
 * (Tana-style live search). Pinned views show first.
 */
import { useState } from "react";
import { Bookmark, Pin, PinOff, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { useSavedViews, type SavedViewLayout, type SavedViewScope } from "@/lib/saved-views";
import { useWeekFilters } from "@/lib/planner/week-filters";
import { countActive } from "@/lib/planner/week-filters";

interface Props {
  layout: SavedViewLayout;
  scope: SavedViewScope;
  onApplyLayout?: (layout: SavedViewLayout, scope: SavedViewScope) => void;
}

export function SavedViewsMenu({ layout, scope, onApplyLayout }: Props) {
  const { views, add, update, remove } = useSavedViews();
  const { filters, patch } = useWeekFilters();
  const [name, setName] = useState("");
  const [open, setOpen] = useState(false);

  const sorted = [...views].sort((a, b) => Number(b.pinned) - Number(a.pinned) || a.name.localeCompare(b.name));

  const saveCurrent = async () => {
    if (!name.trim()) return;
    try {
      await add({ name, layout, scope, filters });
      setName("");
      toast.success("View saved");
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't save view");
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline" className="h-8 shrink-0 rounded-full text-xs" aria-label="Saved views">
          <Bookmark className="mr-1.5 h-3.5 w-3.5" /> Views
          {sorted.length > 0 && <span className="ml-1.5 rounded-full bg-primary/15 px-1.5 text-[10px]">{sorted.length}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-3 p-3">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Saved views</p>

        {sorted.length === 0 && (
          <p className="text-[11px] text-muted-foreground">Save the filters you use often so you can jump back with one tap.</p>
        )}

        <div className="max-h-56 space-y-1 overflow-y-auto">
          {sorted.map(v => (
            <div key={v.id} className="flex items-center gap-1 rounded-lg border border-border/50 bg-card/60 p-1.5">
              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={() => {
                  patch(v.filters);
                  onApplyLayout?.(v.layout, v.scope);
                  setOpen(false);
                }}
              >
                <span className="block truncate text-xs font-medium">{v.name}</span>
                <span className="block text-[10px] capitalize text-muted-foreground">
                  {v.scope} · {v.layout} · {countActive(v.filters)} filter{countActive(v.filters) === 1 ? "" : "s"}
                </span>
              </button>
              <Button
                size="icon" variant="ghost" className="h-7 w-7"
                aria-label={v.pinned ? `Unpin ${v.name}` : `Pin ${v.name}`}
                onClick={() => void update(v.id, { pinned: !v.pinned })}
              >
                {v.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
              </Button>
              <Button
                size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:bg-destructive/10"
                aria-label={`Delete ${v.name}`}
                onClick={() => void remove(v.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 border-t border-border/50 pt-2">
          <Input
            className="h-8 flex-1 text-xs"
            placeholder="Name this view…"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); void saveCurrent(); } }}
          />
          <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Save current view" onClick={saveCurrent}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
