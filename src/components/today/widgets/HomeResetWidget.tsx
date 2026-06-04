import { useState } from "react";
import { Home, ArrowRight, Plus, Pencil, Check, X } from "lucide-react";
import { Link } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useResetChecklists } from "@/lib/reset-checklists";

/**
 * Compact "Home Reset" widget for the Today sidebar.
 * Surfaces the next few unchecked items across the user's current reset
 * checklists, with one-tap completion and a link into the full Reset page.
 */
export function HomeResetWidget() {
  const { lists, updateItem, addItem } = useResetChecklists();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const items = lists
    .flatMap(l => l.items.map(i => ({ ...i, listName: l.name })))
    .filter(i => !i.done)
    .slice(0, 4);
  const total = lists.reduce((n, l) => n + l.items.length, 0);
  const done = lists.reduce((n, l) => n + l.items.filter(i => i.done).length, 0);
  const targetList = lists[0];

  const beginEdit = (id: string, title: string) => {
    setEditingId(id);
    setEditingTitle(title);
  };
  const commitEdit = async () => {
    if (editingId && editingTitle.trim()) {
      await updateItem(editingId, { title: editingTitle.trim() });
    }
    setEditingId(null);
  };
  const commitAdd = async () => {
    const t = newTitle.trim();
    if (t && targetList) await addItem(targetList.id, { title: t });
    setNewTitle("");
    setAdding(false);
  };

  return (
    <section className="cozy-card overflow-hidden p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1.5">
          <Home className="h-3.5 w-3.5 text-primary" />
          <h3 className="font-display text-sm font-semibold text-foreground">Home Reset</h3>
        </div>
        <div className="inline-flex items-center gap-2">
          {targetList && (
            <button
              type="button"
              onClick={() => setAdding(v => !v)}
              className="inline-flex items-center gap-0.5 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
              aria-label="Add reset item"
            >
              <Plus className="h-3 w-3" /> Add
            </button>
          )}
          <Link to="/reset" className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground">
            Open <ArrowRight className="h-2.5 w-2.5" />
          </Link>
        </div>
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
            <li key={i.id} className="group flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-muted/40">
              <Checkbox
                checked={i.done}
                onCheckedChange={() => void updateItem(i.id, { done: !i.done })}
              />
              {editingId === i.id ? (
                <div className="flex flex-1 items-center gap-1">
                  <Input
                    autoFocus
                    value={editingTitle}
                    onChange={e => setEditingTitle(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter") void commitEdit();
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    className="h-7 text-xs"
                  />
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => void commitEdit()}>
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditingId(null)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <>
                  <div className="min-w-0 flex-1" style={{ overflowWrap: "anywhere" }}>
                    <div className="whitespace-normal break-words text-xs leading-snug text-foreground">{i.title}</div>
                    <div className="whitespace-normal break-words text-[10px] text-muted-foreground">{i.listName}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => beginEdit(i.id, i.title)}
                    className="opacity-0 transition-opacity group-hover:opacity-100 text-muted-foreground hover:text-foreground"
                    aria-label="Edit"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      {adding && targetList && (
        <div className="mt-2 flex items-center gap-1">
          <Input
            autoFocus
            placeholder={`Add to ${targetList.name}…`}
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") void commitAdd();
              if (e.key === "Escape") { setAdding(false); setNewTitle(""); }
            }}
            className="h-7 text-xs"
          />
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => void commitAdd()}>
            <Check className="h-3 w-3" />
          </Button>
        </div>
      )}
    </section>
  );
}