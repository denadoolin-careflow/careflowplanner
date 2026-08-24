/**
 * Connections — the people side of the list. Tasks tagged with a connection
 * (check in, call back, respond) grouped by person, plus one-tap capture.
 */
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Check, MessageCircleHeart, Plus } from "lucide-react";
import { DashCard, EmptyLine } from "@/components/today/dashboard/DashCard";
import { PersonAvatar } from "@/components/people/PersonPicker";
import { usePeopleDirectory, type DirectoryPerson } from "@/lib/people-directory";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";

export function ConnectionsCard({
  date, onTaskClick, className,
}: {
  date: Date;
  onTaskClick?: (id: string) => void;
  className?: string;
}) {
  const { state, toggleTask, addTask } = useStore();
  const people = usePeopleDirectory();
  const iso = format(date, "yyyy-MM-dd");
  const [adding, setAdding] = useState<DirectoryPerson | null>(null);
  const [draft, setDraft] = useState("");

  const open = useMemo(
    () => state.tasks.filter(t =>
      t.connectionId && !t.parentTaskId &&
      (!t.done || t.dueDate === iso) &&
      (!t.dueDate || t.dueDate <= iso)),
    [state.tasks, iso],
  );

  const groups = useMemo(() => {
    const map = new Map<string, typeof open>();
    for (const t of open) map.set(t.connectionId!, [...(map.get(t.connectionId!) ?? []), t]);
    return [...map.entries()].map(([id, tasks]) => ({
      person: people.find(p => p.id === id) ?? null,
      id,
      tasks,
    }));
  }, [open, people]);

  const submit = async () => {
    const person = adding;
    const title = draft.trim();
    setDraft("");
    setAdding(null);
    if (!person || !title) return;
    await addTask({
      title,
      dueDate: iso,
      connectionId: person.id,
      connectionKind: person.kind,
      ...(person.kind === "recipient" ? { recipientId: person.id } : {}),
    });
    haptics.tap?.();
  };

  return (
    <DashCard
      eyebrow="Connect"
      title="People to reach"
      className={className}
    >
      <div className="space-y-3">
        {groups.length === 0 && (
          <EmptyLine>No one waiting on you right now.</EmptyLine>
        )}

        {groups.map(g => (
          <div key={g.id} className="space-y-1.5">
            <p className="flex items-center gap-1.5 text-[12px] font-medium">
              {g.person ? <PersonAvatar person={g.person} /> : <MessageCircleHeart className="h-4 w-4 text-muted-foreground" aria-hidden />}
              <span className="min-w-0 truncate">{g.person?.name ?? "Someone"}</span>
            </p>
            <ul className="space-y-1.5 pl-1">
              {g.tasks.map(t => (
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
                    className={cn("min-w-0 flex-1 text-left [overflow-wrap:anywhere]", t.done && "text-muted-foreground line-through")}
                  >
                    {t.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {adding ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={submit}
            onKeyDown={(e) => {
              if (e.key === "Enter") void submit();
              if (e.key === "Escape") { setDraft(""); setAdding(null); }
            }}
            placeholder={`Reach out to ${adding.name}…`}
            aria-label={`Add a connection task for ${adding.name}`}
            className="w-full rounded-xl border border-border/50 bg-background/50 px-3 py-2 text-[12.5px] outline-none focus:border-primary/50"
          />
        ) : people.length === 0 ? (
          <EmptyLine>Add loved ones or care recipients to start tracking check-ins.</EmptyLine>
        ) : (
          <div className="flex flex-wrap gap-1.5 border-t border-border/40 pt-2.5">
            {people.slice(0, 6).map(p => (
              <button
                key={`${p.kind}:${p.id}`}
                type="button"
                onClick={() => { setAdding(p); setDraft(`Check in with ${p.name}`); }}
                aria-label={`Add a check-in with ${p.name}`}
                className="inline-flex min-h-[30px] items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-2.5 text-[11.5px] hover:bg-muted"
              >
                <Plus className="h-3 w-3" aria-hidden />
                <PersonAvatar person={p} className="h-4 w-4 text-[9px]" />
                <span className="max-w-[7rem] truncate">{p.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </DashCard>
  );
}
