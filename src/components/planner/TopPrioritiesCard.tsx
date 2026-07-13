import { useState } from "react";
import { useStore } from "@/lib/store";
import { Plus, X, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { openTaskEditor } from "@/lib/open-task-editor";
import { format } from "date-fns";
import { toast } from "sonner";

export function TopPrioritiesCard({ date }: { date: Date }) {
  const { state, updateTask, addTask } = useStore();
  const priorities = state.tasks.filter(t => !t.done && t.isTopThree).slice(0, 3);
  const [text, setText] = useState("");

  const add = async () => {
    const title = text.trim();
    if (!title) return;
    if (priorities.length >= 3) { toast("Three priorities is the sweet spot."); return; }
    await addTask({
      title,
      area: "Personal",
      priority: "high",
      done: false,
      isTopThree: true,
      dueDate: format(date, "yyyy-MM-dd"),
      inbox: false,
    } as any);
    setText("");
  };

  return (
    <section className="rounded-2xl border border-border/60 bg-card/50 p-3">
      <header className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Top Priorities</span>
        <span className="text-[10px] text-muted-foreground">{priorities.length}/3</span>
      </header>
      {priorities.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">Nothing pinned. Add up to three priorities for today.</p>
      ) : (
        <ol className="space-y-1">
          {priorities.map((t, i) => (
            <li key={t.id}
              onClick={() => openTaskEditor(t.id)}
              className="group flex items-start gap-2 rounded-md px-2 py-1.5 text-[12px] hover:bg-muted/60 cursor-pointer">
              <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary">{i + 1}</span>
              <span className="min-w-0 flex-1 line-clamp-2 [overflow-wrap:anywhere]">{t.title}</span>
              <button
                onClick={(e) => { e.stopPropagation(); void updateTask(t.id, { isTopThree: false }); }}
                aria-label="Remove priority"
                className="opacity-0 transition-opacity group-hover:opacity-100"
              >
                <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
              </button>
            </li>
          ))}
        </ol>
      )}
      {priorities.length < 3 && (
        <div className="mt-2 flex items-center gap-1">
          <Plus className="h-3 w-3 text-muted-foreground" />
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void add(); } }}
            placeholder="Add priority"
            className="h-7 border-none bg-transparent px-1 text-xs shadow-none focus-visible:ring-0"
          />
        </div>
      )}
    </section>
  );
}