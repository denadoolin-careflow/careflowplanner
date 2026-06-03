import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Plus, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ResetItem } from "@/lib/reset-checklists";

interface Props {
  items: ResetItem[];
  onToggle: (id: string, done: boolean) => void;
  onAdd?: (title: string) => void;
  emptyLabel?: string;
  maxVisible?: number;
}

/** Compact, in-card checklist — no drag handles, no popovers. */
export function ChecklistInline({ items, onToggle, onAdd, emptyLabel = "Add a small step…", maxVisible }: Props) {
  const roots = items.filter(i => !i.parent_id).sort((a, b) => a.sort_order - b.sort_order);
  const visible = maxVisible ? roots.slice(0, maxVisible) : roots;
  const hidden = roots.length - visible.length;
  const [draft, setDraft] = useState("");

  return (
    <div className="space-y-1">
      {visible.length === 0 && (
        <p className="rounded-xl border border-dashed border-border/50 p-2 text-center text-[11px] text-muted-foreground">
          {emptyLabel}
        </p>
      )}
      <ul className="space-y-1">
        {visible.map(item => (
          <li
            key={item.id}
            className={cn(
              "flex items-center gap-2 rounded-lg bg-background/60 px-2 py-1 text-xs ring-1 ring-border/40",
              item.done && "opacity-60",
            )}
          >
            <Checkbox
              checked={item.done}
              onCheckedChange={(v) => onToggle(item.id, !!v)}
              className="h-3.5 w-3.5"
            />
            <span className={cn("flex-1 truncate", item.done && "line-through")}>{item.title}</span>
            {item.est_minutes ? (
              <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                <Clock className="h-2.5 w-2.5" />{item.est_minutes}m
              </span>
            ) : null}
          </li>
        ))}
      </ul>
      {hidden > 0 && (
        <p className="pl-1 text-[10px] uppercase tracking-wider text-muted-foreground">
          + {hidden} more
        </p>
      )}
      {onAdd && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const t = draft.trim();
            if (t) { onAdd(t); setDraft(""); }
          }}
          className="flex items-center gap-1 pt-1"
          onClick={(e) => e.stopPropagation()}
        >
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add…"
            className="h-7 text-[11px]"
          />
          <button
            type="submit"
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Add"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </form>
      )}
    </div>
  );
}