import { useMemo, useState } from "react";
import { Plus, Link2, Unlink, ListTodo } from "lucide-react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TaskRow } from "@/components/cards/TaskRow";
import { toast } from "sonner";

type Props = { recipientId: string; recipientName: string };

/**
 * Panel for the Caregiving "Care time block" — lists tasks linked to a
 * specific care recipient, lets the user quick-add a new linked task, or
 * link existing tasks to this person.
 */
export function CareTasksPanel({ recipientId, recipientName }: Props) {
  const { state, addTask, updateTask } = useStore();
  const [draft, setDraft] = useState("");
  const [linkOpen, setLinkOpen] = useState(false);
  const [q, setQ] = useState("");

  const linked = useMemo(
    () => (state.tasks ?? []).filter(t => t.recipientId === recipientId && !t.parentTaskId)
      .sort((a, b) => Number(a.done) - Number(b.done)),
    [state.tasks, recipientId],
  );
  const open = linked.filter(t => !t.done).length;
  const done = linked.length - open;

  const unlinked = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (state.tasks ?? [])
      .filter(t => !t.recipientId && !t.done && !t.parentTaskId)
      .filter(t => !needle || t.title.toLowerCase().includes(needle))
      .slice(0, 30);
  }, [state.tasks, q]);

  const quickAdd = async () => {
    const title = draft.trim();
    if (!title) return;
    await addTask({ title, recipientId, area: "Caregiving" });
    setDraft("");
    toast.success("Linked to " + recipientName);
  };

  const link = async (id: string) => {
    await updateTask(id, { recipientId });
    toast.success("Linked to " + recipientName);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void quickAdd(); } }}
          placeholder={`Add a task for ${recipientName}…`}
          className="h-9 flex-1 text-sm"
        />
        <Button onClick={quickAdd} size="sm" className="h-9 shrink-0 gap-1">
          <Plus className="h-3.5 w-3.5" /> Add
        </Button>
        <Popover open={linkOpen} onOpenChange={setLinkOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 shrink-0 gap-1">
              <Link2 className="h-3.5 w-3.5" /> Link
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 p-2">
            <Input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search tasks…"
              className="h-8 text-sm"
            />
            <div className="mt-2 max-h-64 space-y-0.5 overflow-y-auto">
              {unlinked.length === 0 && (
                <p className="px-2 py-3 text-xs text-muted-foreground">No unlinked tasks.</p>
              )}
              {unlinked.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={async () => { await link(t.id); setLinkOpen(false); setQ(""); }}
                  className="block w-full truncate rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted"
                >
                  {t.title}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {linked.length > 0 && (
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <ListTodo className="h-3 w-3" />
          {open} open · {done} done
        </div>
      )}

      <div className="space-y-1">
        {linked.length === 0 ? (
          <p className="text-sm text-muted-foreground">No care tasks yet — add the next small step.</p>
        ) : (
          linked.map(t => (
            <div key={t.id} className="group relative">
              <TaskRow task={t} showArea={false} />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => updateTask(t.id, { recipientId: undefined })}
                className="absolute right-1 top-1 hidden h-6 w-6 text-muted-foreground hover:text-foreground group-hover:inline-flex"
                aria-label="Unlink from this person"
                title="Unlink"
              >
                <Unlink className="h-3 w-3" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}