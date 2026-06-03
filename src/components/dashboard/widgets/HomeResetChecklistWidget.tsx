import { useMemo, useState } from "react";
import { useResetChecklists } from "@/lib/reset-checklists";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Sparkle } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";

/**
 * Inline interactive Home Reset checklist for the dashboard.
 * Shows the user's first non-template checklist with check, quick add and link out.
 */
export function HomeResetChecklistWidget() {
  const reset = useResetChecklists({});
  const lists = useMemo(() => reset.lists.filter((l) => !l.is_template), [reset.lists]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const list = lists.find((l) => l.id === activeId) ?? lists[0];
  const [draft, setDraft] = useState("");

  if (reset.loading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  if (!list) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-muted-foreground">No reset checklist yet.</p>
        <Button asChild size="sm" variant="outline" className="rounded-full">
          <Link to="/home-reset"><Plus className="mr-1 h-4 w-4" /> Create one</Link>
        </Button>
      </div>
    );
  }

  const roots = list.items.filter((i) => !i.parent_id).sort((a, b) => a.sort_order - b.sort_order);
  const done = roots.filter((r) => r.done).length;

  const submit = () => {
    const t = draft.trim();
    if (!t) return;
    reset.addItem(list.id, { title: t });
    setDraft("");
    haptics.tap();
  };

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        {lists.length > 1 ? (
          <select
            className="rounded-lg border border-border/60 bg-card/80 px-2 py-1 text-xs"
            value={list.id}
            onChange={(e) => setActiveId(e.target.value)}
          >
            {lists.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        ) : (
          <span />
        )}
        <span className="ml-auto text-xs tabular-nums text-muted-foreground">
          {done} / {roots.length}
        </span>
      </div>

      <ul className="flex-1 space-y-1.5 overflow-y-auto pr-1">
        {roots.map((it) => (
          <li key={it.id} className="group flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-muted/40">
            <Checkbox
              checked={it.done}
              onCheckedChange={(v) => { reset.updateItem(it.id, { done: !!v }); haptics.tap(); }}
            />
            <span className={cn("flex-1 truncate text-sm", it.done && "text-muted-foreground line-through")}>
              {it.title}
            </span>
            <Sparkle className="h-3 w-3 shrink-0 text-secondary-foreground/60" />
          </li>
        ))}
        {roots.length === 0 && (
          <li className="px-1 text-xs text-muted-foreground">Nothing here yet — add one below.</li>
        )}
      </ul>

      <form
        onSubmit={(e) => { e.preventDefault(); submit(); }}
        className="flex items-center gap-1.5"
      >
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a reset task…"
          className="h-8 text-sm"
        />
        <Button type="submit" size="sm" className="h-8 px-2">
          <Plus className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
