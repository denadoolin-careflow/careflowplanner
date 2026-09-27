/** Per-day Top 3 priorities shown at the top of each week-view column. */
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Flag, Plus, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { usePriorities, MAX_PRIORITIES } from "@/lib/planner/use-priorities";
import { openTaskEditor } from "@/lib/open-task-editor";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function DayPriorities({ iso }: { iso: string }) {
  const date = useMemo(() => new Date(`${iso}T12:00:00`), [iso]);
  const { state, toggleTask, addTask } = useStore() as any;
  const { items, pin, unpin, full } = usePriorities(date, "day");
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");

  const add = async () => {
    const title = text.trim();
    if (!title) { setAdding(false); return; }
    if (full) { toast("Three priorities is the sweet spot."); return; }
    const created: any = await addTask({ title, area: "Personal", priority: "high", done: false, isTopThree: true, dueDate: iso, inbox: false } as any);
    const id = typeof created === "string" ? created : created?.id;
    if (id) await pin({ type: "task", id, title });
    setText(""); setAdding(false);
  };

  return (
    <div className="space-y-0.5">
      {items.map((r, i) => {
        const t = r.item_type === "task" ? (state.tasks ?? []).find((x: any) => x.id === r.item_id) : null;
        const done = !!t?.done;
        return (
          <div key={r.id} className={cn("group flex min-h-[22px] items-center gap-1 rounded-md border border-primary/30 bg-primary/5 px-1 text-[10px]", done && "opacity-50")}>
            <button type="button" onClick={() => t && toggleTask(t.id)} aria-label={`Toggle ${r.item_title}`}
              className={cn("grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full border border-primary/60 text-[8px] font-semibold", done && "bg-primary text-primary-foreground")}>
              {i + 1}
            </button>
            <button type="button" onClick={() => t && openTaskEditor(t.id)} className={cn("min-w-0 flex-1 truncate text-left", done && "line-through")} title={t?.title ?? r.item_title}>
              {t?.title ?? r.item_title}
            </button>
            <button type="button" onClick={() => unpin(r.id)} aria-label="Unpin priority" className="opacity-0 group-hover:opacity-100 focus:opacity-100">
              <X className="h-2.5 w-2.5" />
            </button>
          </div>
        );
      })}
      {items.length < MAX_PRIORITIES && (adding ? (
        <input autoFocus value={text} onChange={e => setText(e.target.value)} onBlur={add}
          onKeyDown={e => { if (e.key === "Enter") void add(); if (e.key === "Escape") { setText(""); setAdding(false); } }}
          placeholder="Priority…" aria-label={`Add priority for ${iso}`}
          className="h-[22px] w-full rounded-md border border-border/60 bg-background px-1 text-[10px] outline-none focus:border-primary" />
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="flex h-[20px] w-full items-center gap-0.5 rounded-md px-1 text-[9.5px] text-muted-foreground hover:bg-muted">
          <Plus className="h-2.5 w-2.5" /> {items.length ? "Add" : "Top 3"}
        </button>
      ))}
    </div>
  );
}

export function PlannerDayPrioritiesRow({ days, colTemplate }: { days: Date[]; colTemplate: string }) {
  return (
    <div className="grid border-b border-border/40 bg-background/40" style={{ gridTemplateColumns: colTemplate }}>
      <div className="sticky left-0 z-30 flex items-center justify-end gap-0.5 border-r border-border/50 bg-card/95 pr-1 text-[9px] uppercase tracking-wider text-muted-foreground/70 backdrop-blur">
        <Flag className="h-2.5 w-2.5" aria-hidden /> Top 3
      </div>
      {days.map((d, i) => {
        const iso = format(d, "yyyy-MM-dd");
        return <div key={iso} className={cn("min-w-0 px-1 py-1", i > 0 && "border-l border-border/40")}><DayPriorities iso={iso} /></div>;
      })}
    </div>
  );
}
