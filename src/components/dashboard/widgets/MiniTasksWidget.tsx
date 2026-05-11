import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Item {
  id: string;
  text: string;
  done: boolean;
}

interface Props {
  props?: { title?: string; items?: Item[] };
  onChange?: (next: Record<string, any>) => void;
}

const uid = () => Math.random().toString(36).slice(2);

export function MiniTasksWidget({ props, onChange }: Props) {
  const [title, setTitle] = useState(props?.title ?? "Quick list");
  const [items, setItems] = useState<Item[]>(props?.items ?? []);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    const id = setTimeout(() => onChange?.({ title, items }), 400);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, items]);

  const add = () => {
    if (!draft.trim()) return;
    setItems((p) => [...p, { id: uid(), text: draft.trim(), done: false }]);
    setDraft("");
  };

  return (
    <div className="flex h-full flex-col gap-2">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="h-8 border-none bg-transparent px-0 text-base font-display font-semibold focus-visible:ring-0"
      />
      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        <ul className="space-y-1">
          {items.map((it) => (
            <li key={it.id} className="group flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-muted/40">
              <input
                type="checkbox"
                checked={it.done}
                onChange={() =>
                  setItems((p) => p.map((x) => (x.id === it.id ? { ...x, done: !x.done } : x)))
                }
                className="h-4 w-4 rounded accent-primary"
              />
              <span className={cn("flex-1 text-sm", it.done && "text-muted-foreground line-through")}>
                {it.text}
              </span>
              <button
                onClick={() => setItems((p) => p.filter((x) => x.id !== it.id))}
                className="opacity-0 transition-opacity group-hover:opacity-100"
                aria-label="Remove"
              >
                <Trash2 className="h-3 w-3 text-muted-foreground" />
              </button>
            </li>
          ))}
          {items.length === 0 && (
            <p className="px-1.5 py-1 text-xs text-muted-foreground">Empty list — add something below.</p>
          )}
        </ul>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
        className="flex gap-1"
      >
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add item…"
          className="h-8 text-sm"
        />
        <Button type="submit" size="sm" variant="ghost" className="h-8 px-2">
          <Plus className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}