import { Home, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import { useResetChecklists } from "@/lib/reset-checklists";

/**
 * Compact "Home Reset" widget for the Today sidebar.
 * Surfaces the next few unchecked items across the user's current reset
 * checklists, with one-tap completion and a link into the full Reset page.
 */
export function HomeResetWidget() {
  const { lists, updateItem } = useResetChecklists();
  const items = lists
    .flatMap(l => l.items.map(i => ({ ...i, listName: l.name })))
    .filter(i => !i.done)
    .slice(0, 4);
  const total = lists.reduce((n, l) => n + l.items.length, 0);
  const done = lists.reduce((n, l) => n + l.items.filter(i => i.done).length, 0);

  return (
    <section className="cozy-card overflow-hidden p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1.5">
          <Home className="h-3.5 w-3.5 text-primary" />
          <h3 className="font-display text-sm font-semibold text-foreground">Home Reset</h3>
        </div>
        <Link to="/reset" className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground">
          Open <ArrowRight className="h-2.5 w-2.5" />
        </Link>
      </div>
      {total === 0 ? (
        <p className="rounded-lg border border-dashed border-border/50 px-2 py-3 text-center text-xs text-muted-foreground">
          No reset checklists yet.
        </p>
      ) : items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border/50 px-2 py-3 text-center text-xs text-muted-foreground">
          Reset complete — {done}/{total} done.
        </p>
      ) : (
        <ul className="space-y-1">
          {items.map(i => (
            <li key={i.id} className="flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-muted/40">
              <Checkbox
                checked={i.done}
                onCheckedChange={() => void updateItem(i.id, { done: !i.done })}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs text-foreground">{i.label}</div>
                <div className="truncate text-[10px] text-muted-foreground">{i.listName}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}