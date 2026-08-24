/**
 * Connections — the people side of the list. Tasks tagged with a connection
 * (check in, call back, respond) grouped by person, one-tap capture, and a
 * recent check-in history so long gaps are visible.
 */
import { useMemo, useState } from "react";
import { format, formatDistanceToNowStrict } from "date-fns";
import { Check, History, MessageCircleHeart, Plus } from "lucide-react";
import { DashCard, EmptyLine } from "@/components/today/dashboard/DashCard";
import { PersonAvatar } from "@/components/people/PersonPicker";
import { AddPersonPopover } from "@/components/people/AddPersonPopover";
import { usePeopleDirectory, type DirectoryPerson } from "@/lib/people-directory";
import { useCheckins, recordCheckin, lastReachedMap, daysSince } from "@/lib/connection-checkins";
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
  const { checkins } = useCheckins(40);
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

  const lastReached = useMemo(() => lastReachedMap(checkins), [checkins]);

  const groups = useMemo(() => {
    const map = new Map<string, typeof open>();
    for (const t of open) map.set(t.connectionId!, [...(map.get(t.connectionId!) ?? []), t]);
    return [...map.entries()].map(([id, tasks]) => ({
      person: people.find(p => p.id === id) ?? null,
      id,
      tasks,
    }));
  }, [open, people]);

  const complete = async (task: { id: string; title: string; done?: boolean; connectionId?: string; connectionKind?: string }, person: DirectoryPerson | null) => {
    const wasDone = task.done;
    if (!wasDone) haptics.success?.();
    await toggleTask(task.id);
    if (!wasDone && task.connectionId) {
      try {
        await recordCheckin({
          personId: task.connectionId,
          personKind: (task.connectionKind as "recipient" | "loved_one") ?? person?.kind ?? "recipient",
          personName: person?.name,
          taskId: task.id,
          note: task.title,
        });
      } catch { /* history is best-effort */ }
    }
  };

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

  const recent = checkins.slice(0, 4);

  return (
    <DashCard
      eyebrow="Connect"
      title="People to reach"
      className={className}
      footer={
        recent.length > 0 ? (
          <div className="space-y-1">
            <p className="inline-flex items-center gap-1 text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
              <History className="h-3 w-3" aria-hidden /> Recent
            </p>
            <ul className="flex flex-wrap gap-1.5">
              {recent.map(c => (
                <li
                  key={c.id}
                  className="rounded-full border border-border/50 bg-muted/30 px-2 py-0.5 text-[11px] text-muted-foreground"
                >
                  {c.personName ?? people.find(p => p.id === c.personId)?.name ?? "Someone"} ·{" "}
                  {formatDistanceToNowStrict(new Date(c.checkedInAt), { addSuffix: true })}
                </li>
              ))}
            </ul>
          </div>
        ) : undefined
      }
    >
      <div className="space-y-3">
        {groups.length === 0 && (
          <EmptyLine>No one waiting on you right now.</EmptyLine>
        )}

        {groups.map(g => {
          const gap = daysSince(lastReached[g.id]);
          return (
            <div key={g.id} className="space-y-1.5">
              <p className="flex items-center gap-1.5 text-[12px] font-medium">
                {g.person ? <PersonAvatar person={g.person} /> : <MessageCircleHeart className="h-4 w-4 text-muted-foreground" aria-hidden />}
                <span className="min-w-0 truncate">{g.person?.name ?? "Someone"}</span>
                <span className="ml-auto shrink-0 text-[10.5px] font-normal text-muted-foreground">
                  {gap === null ? "not yet reached" : gap === 0 ? "reached today" : `${gap}d ago`}
                </span>
              </p>
              <ul className="space-y-1.5 pl-1">
                {g.tasks.map(t => (
                  <li key={t.id} className="flex items-start gap-2 text-[12.5px]">
                    <button
                      type="button"
                      onClick={() => void complete(t, g.person)}
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
          );
        })}

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
            <AddPersonPopover
              label="Add friend"
              onAdded={(p) => { setAdding(p); setDraft(`Check in with ${p.name}`); }}
            />
          </div>
        )}
      </div>
    </DashCard>
  );
}
