/**
 * Connections — the people side of the list. Tasks tagged with a connection
 * (check in, call back, respond) grouped by person, one-tap capture, and a
 * full timestamped check-in history with totals and quick filters.
 */
import { useMemo, useState } from "react";
import { format, formatDistanceToNowStrict, subDays } from "date-fns";
import { Check, ChevronLeft, History, MessageCircleHeart, Plus } from "lucide-react";
import { DashCard, EmptyLine } from "@/components/today/dashboard/DashCard";
import { PersonAvatar } from "@/components/people/PersonPicker";
import { AddPersonPopover } from "@/components/people/AddPersonPopover";
import { usePeopleDirectory, type DirectoryPerson } from "@/lib/people-directory";
import { useCheckins, recordCheckin, lastReachedMap, daysSince } from "@/lib/connection-checkins";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";

type HistoryFilter = "today" | "week" | "month" | "all";

const FILTERS: { id: HistoryFilter; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "all", label: "All" },
];

export function ConnectionsCard({
  date, onTaskClick, className,
}: {
  date: Date;
  onTaskClick?: (id: string) => void;
  className?: string;
}) {
  const { state, toggleTask, addTask } = useStore();
  const people = usePeopleDirectory();
  const { checkins } = useCheckins(100);
  const iso = format(date, "yyyy-MM-dd");
  const [adding, setAdding] = useState<DirectoryPerson | null>(null);
  const [draft, setDraft] = useState("");
  const [view, setView] = useState<"reach" | "history">("reach");
  const [filter, setFilter] = useState<HistoryFilter>("week");

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

  // ----- history view data -----
  const filteredCheckins = useMemo(() => {
    const now = new Date();
    return checkins.filter(c => {
      const at = new Date(c.checkedInAt);
      switch (filter) {
        case "today": return format(at, "yyyy-MM-dd") === iso;
        case "week": return at >= subDays(now, 7);
        case "month": return at >= subDays(now, 30);
        case "all": default: return true;
      }
    });
  }, [checkins, filter, iso]);

  const totals = useMemo(() => {
    const now = new Date();
    const weekCount = checkins.filter(c => new Date(c.checkedInAt) >= subDays(now, 7)).length;
    const peopleCount = new Set(checkins.map(c => c.personId)).size;
    return { total: checkins.length, week: weekCount, people: peopleCount };
  }, [checkins]);

  const personName = (id: string, fallback?: string) =>
    fallback ?? people.find(p => p.id === id)?.name ?? "Someone";
  const personOf = (id: string) => people.find(p => p.id === id) ?? null;

  const recent = checkins.slice(0, 4);

  return (
    <DashCard
      eyebrow="Connect"
      title="People to reach"
      className={className}
      action={
        <button
          type="button"
          onClick={() => setView(v => (v === "reach" ? "history" : "reach"))}
          aria-pressed={view === "history"}
          className={cn(
            "inline-flex min-h-[28px] items-center gap-1 rounded-full border px-2 text-[10.5px] transition-colors",
            view === "history"
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-border/60 text-muted-foreground hover:text-foreground",
          )}
        >
          {view === "history" ? <ChevronLeft className="h-3 w-3" aria-hidden /> : <History className="h-3 w-3" aria-hidden />}
          {view === "history" ? "Back" : "History"}
        </button>
      }
      footer={
        view === "reach" && recent.length > 0 ? (
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
                  {personName(c.personId, c.personName)} ·{" "}
                  {formatDistanceToNowStrict(new Date(c.checkedInAt), { addSuffix: true })}
                </li>
              ))}
            </ul>
          </div>
        ) : undefined
      }
    >
      {view === "history" ? (
        <div className="space-y-3">
          <p className="text-[11.5px] text-muted-foreground">
            {totals.total} check-in{totals.total === 1 ? "" : "s"} · {totals.people} {totals.people === 1 ? "person" : "people"} · {totals.week} this week
          </p>
          <div className="flex flex-wrap gap-1" role="tablist" aria-label="History filter">
            {FILTERS.map(f => (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={filter === f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] transition-colors",
                  filter === f.id
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border/60 text-muted-foreground hover:text-foreground",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          {filteredCheckins.length === 0 ? (
            <EmptyLine>Nothing here yet — completed check-ins will land here.</EmptyLine>
          ) : (
            <ul className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
              {filteredCheckins.map(c => {
                const at = new Date(c.checkedInAt);
                const person = personOf(c.personId);
                return (
                  <li key={c.id} className="flex items-center gap-2 rounded-xl border border-border/40 bg-muted/20 px-2.5 py-1.5 text-[12.5px]">
                    {person
                      ? <PersonAvatar person={person} className="h-4 w-4 text-[9px]" />
                      : <MessageCircleHeart className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{personName(c.personId, c.personName)}</p>
                      {c.note && <p className="truncate text-[11px] text-muted-foreground">{c.note}</p>}
                    </div>
                    <span className="shrink-0 text-right text-[10.5px] text-muted-foreground">
                      {format(at, "MMM d")}
                      <br />
                      {format(at, "h:mm a")}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : (
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
      )}
    </DashCard>
  );
}
