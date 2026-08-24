import { useMemo, useState } from "react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/lib/store";
import { DashCard, EmptyLine } from "@/components/today/dashboard/DashCard";
import { Check, ChevronRight, Clock3, Pill, Plus, StickyNote } from "lucide-react";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";
import type { CareRecipient } from "@/lib/types";

/**
 * One card per person you care for: their tasks for the day, appointments,
 * meds and the latest care note — all actionable without leaving Today.
 */
export function PersonCareCard({
  person, date, onTaskClick,
}: {
  person: CareRecipient;
  date: Date;
  onTaskClick?: (id: string) => void;
}) {
  const { state, toggleTask, addTask } = useStore();
  const navigate = useNavigate();
  const iso = format(date, "yyyy-MM-dd");
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);

  const tasks = useMemo(
    () => state.tasks
      .filter(t => t.recipientId === person.id && !t.parentTaskId && (t.dueDate === iso || (!t.done && !t.dueDate)))
      .slice(0, 5),
    [state.tasks, person.id, iso],
  );

  const appts = useMemo(
    () => state.appointments.filter(a => a.recipientId === person.id && a.date === iso),
    [state.appointments, person.id, iso],
  );

  const note = useMemo(
    () => [...state.careNotes]
      .filter(n => n.recipientId === person.id)
      .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))[0],
    [state.careNotes, person.id],
  );

  const meds = person.meds ?? [];

  const submit = async () => {
    const title = draft.trim();
    if (!title) return;
    setDraft("");
    setAdding(false);
    await addTask({ title, recipientId: person.id, dueDate: iso });
    haptics.tap?.();
  };

  return (
    <DashCard
      eyebrow="Care"
      title={
        <span className="flex items-center gap-2">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-care-capture-soft text-[11px] font-semibold text-care-capture">
            {person.name.slice(0, 1).toUpperCase()}
          </span>
          <span className="truncate">{person.name}</span>
        </span>
      }
      action={
        <button
          type="button"
          onClick={() => navigate(`/care/${person.id}`)}
          aria-label={`Open ${person.name}'s care page`}
          className="inline-flex items-center text-[11px] text-muted-foreground hover:text-foreground"
        >
          Open <ChevronRight className="h-3 w-3" aria-hidden />
        </button>
      }
    >
      <div className="space-y-2.5">
        {appts.length > 0 && (
          <ul className="space-y-1">
            {appts.map(a => (
              <li key={a.id} className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
                <Clock3 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="min-w-0 flex-1 truncate text-foreground">{a.title}</span>
                {a.startTime && <span className="text-[11px]">{a.startTime}</span>}
              </li>
            ))}
          </ul>
        )}

        {tasks.length === 0 ? (
          <EmptyLine>Nothing on {person.name}'s list today.</EmptyLine>
        ) : (
          <ul className="space-y-1.5">
            {tasks.map(t => (
              <li key={t.id} className="flex items-start gap-2 text-[12.5px]">
                <button
                  type="button"
                  onClick={() => { if (!t.done) haptics.success?.(); void toggleTask(t.id); }}
                  aria-label={t.done ? `Mark ${t.title} not done` : `Mark ${t.title} done`}
                  className={cn(
                    "mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border transition-all active:scale-125",
                    t.done ? "border-primary bg-primary text-primary-foreground" : "border-border text-transparent hover:bg-muted",
                  )}
                >
                  <Check className="h-2.5 w-2.5" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => onTaskClick?.(t.id)}
                  className={cn(
                    "min-w-0 flex-1 text-left [overflow-wrap:anywhere]",
                    t.done && "text-muted-foreground line-through",
                  )}
                >
                  {t.title}
                </button>
              </li>
            ))}
          </ul>
        )}

        {meds.length > 0 && (
          <p className="flex items-start gap-1.5 text-[11.5px] text-muted-foreground">
            <Pill className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="[overflow-wrap:anywhere]">
              {meds.slice(0, 3).map(m => [m.name, m.schedule].filter(Boolean).join(" · ")).join(" • ")}
            </span>
          </p>
        )}

        {note && (
          <p className="flex items-start gap-1.5 text-[11.5px] text-muted-foreground">
            <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="line-clamp-2 [overflow-wrap:anywhere]">{note.body}</span>
          </p>
        )}

        {adding ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={submit}
            onKeyDown={(e) => {
              if (e.key === "Enter") void submit();
              if (e.key === "Escape") { setDraft(""); setAdding(false); }
            }}
            placeholder={`Add for ${person.name}…`}
            aria-label={`Add a task for ${person.name}`}
            className="w-full rounded-xl border border-border/50 bg-background/50 px-3 py-2 text-[12.5px] outline-none focus:border-primary/50"
          />
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex min-h-[32px] items-center gap-1 text-[11.5px] text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden /> Add for {person.name}
          </button>
        )}
      </div>
    </DashCard>
  );
}
