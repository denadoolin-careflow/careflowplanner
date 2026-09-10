import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { format, isSameDay } from "date-fns";
import { CalendarClock, CheckCircle2, ChevronDown, ChevronRight, Circle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import type { Note, PeriodKind } from "@/lib/notes";
import {
  PERIOD_LABEL, childrenKeys, fromISO, parentsOf, periodTitle, spanDates, spanFor,
} from "@/lib/notes/periods";
import { openPeriodNoteWithTemplate, readDefaultPeriodTemplate, usePeriodNoteMarks } from "@/lib/notes/daily";
import { buildCosmicCalendarIndex } from "@/lib/cosmic/calendar-feed";
import { plannerHref } from "@/lib/notes/date-refs";

/**
 * Where this note lives: its parent week/month, the days or weeks inside it,
 * and what the planner has scheduled across the same span (tasks, events,
 * cosmic events). Shown on daily / weekly / monthly note pages.
 */
export function PeriodContextPanel({ note, className }: { note: Note; className?: string }) {
  const kind = note.kind as PeriodKind;
  const key = note.date!;
  const navigate = useNavigate();
  const { state } = useStore();
  const [open, setOpen] = useState(true);

  const span = useMemo(() => spanFor(kind, key), [kind, key]);
  const dates = useMemo(() => spanDates(span), [span]);
  const parents = useMemo(() => parentsOf(kind, key), [kind, key]);
  const children = useMemo(() => childrenKeys(kind, key), [kind, key]);

  const parentKeys = parents.map(p => p.key);
  const weekMarks = usePeriodNoteMarks("weekly", [
    ...parents.filter(p => p.kind === "weekly").map(p => p.key),
    ...(children?.kind === "weekly" ? children.keys : []),
  ]);
  const monthMarks = usePeriodNoteMarks("monthly", parents.filter(p => p.kind === "monthly").map(p => p.key));
  const dayMarks = usePeriodNoteMarks("daily", children?.kind === "daily" ? children.keys : []);
  void parentKeys;

  const markFor = (k: PeriodKind, iso: string) =>
    k === "weekly" ? weekMarks.get(iso) : k === "monthly" ? monthMarks.get(iso) : dayMarks.get(iso);

  const openPeriod = async (k: PeriodKind, iso: string) => {
    try {
      const n = await openPeriodNoteWithTemplate(k, iso, readDefaultPeriodTemplate(k));
      navigate(`/notes/${n.id}`);
    } catch (e: any) { toast.error(e?.message ?? "Could not open the note"); }
  };

  // Planner context across the span, grouped by day.
  const dateSet = useMemo(() => new Set(dates), [dates]);
  const byDay = useMemo(() => {
    const m = new Map<string, { tasks: any[]; events: any[]; cosmic: { id: string; label: string }[] }>();
    const get = (iso: string) => { if (!m.has(iso)) m.set(iso, { tasks: [], events: [], cosmic: [] }); return m.get(iso)!; };
    for (const t of state.tasks ?? []) {
      const iso = (t as any).dueDate?.slice(0, 10);
      if (iso && dateSet.has(iso)) get(iso).tasks.push(t);
    }
    for (const a of state.appointments ?? []) {
      const iso = (a as any).date?.slice(0, 10);
      if (iso && dateSet.has(iso)) get(iso).events.push(a);
    }
    const cosmic = buildCosmicCalendarIndex(span.from, span.days);
    for (const [iso, list] of cosmic) get(iso).cosmic.push(...list.map(c => ({ id: c.id, label: c.label })));
    return m;
  }, [state.tasks, state.appointments, dateSet, span]);

  const totals = useMemo(() => {
    let tasks = 0, done = 0, events = 0, cosmic = 0;
    for (const v of byDay.values()) {
      tasks += v.tasks.length; done += v.tasks.filter((t: any) => t.done).length;
      events += v.events.length; cosmic += v.cosmic.length;
    }
    return { tasks, done, events, cosmic };
  }, [byDay]);

  const today = new Date();

  return (
    <section aria-label="Where this note lives" className={cn("rounded-2xl border border-border/60 bg-card/60 p-3", className)}>
      {/* Breadcrumb: month › week › day */}
      <nav aria-label="Note hierarchy" className="flex flex-wrap items-center gap-1 text-[11px]">
        {[...parents].reverse().map(p => {
          const mk = markFor(p.kind, p.key);
          return (
            <span key={p.key} className="flex items-center gap-1">
              <button type="button" onClick={() => void openPeriod(p.kind, p.key)}
                      className={cn("rounded-full px-2 py-0.5 hover:bg-muted", mk?.written ? "text-foreground" : "text-muted-foreground")}
                      title={mk?.written ? `Open ${PERIOD_LABEL[p.kind].toLowerCase()} note` : `Start ${PERIOD_LABEL[p.kind].toLowerCase()} note`}>
                {periodTitle(p.kind, p.key, { short: true })}{!mk?.written && <span className="ml-1 opacity-60">+</span>}
              </button>
              <ChevronRight className="h-3 w-3 text-muted-foreground/60" aria-hidden />
            </span>
          );
        })}
        <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-foreground">
          {periodTitle(kind, key, { short: true })}
        </span>
        <Link to={plannerHref(key)} className="ml-auto text-muted-foreground hover:text-foreground">Open in planner →</Link>
      </nav>

      {/* Children: days of the week, or weeks of the month */}
      {children && (
        <div className="mt-2 flex flex-wrap gap-1">
          {children.keys.map(k => {
            const mk = markFor(children.kind, k);
            const d = fromISO(k);
            const isToday = children.kind === "daily" && isSameDay(d, today);
            return (
              <button key={k} type="button" onClick={() => void openPeriod(children.kind, k)}
                      className={cn(
                        "rounded-full border px-2 py-1 text-[11px] transition",
                        mk?.written ? "border-primary/40 bg-primary/10 text-foreground" : "border-border/60 text-muted-foreground hover:bg-muted",
                        isToday && "ring-1 ring-primary/60",
                      )}
                      title={mk?.written ? "Open note" : "Start a note"}>
                {children.kind === "daily" ? format(d, "EEE d") : `Wk of ${format(d, "MMM d")}`}
              </button>
            );
          })}
        </div>
      )}

      {/* Planner context */}
      <button type="button" onClick={() => setOpen(o => !o)}
              className="mt-3 flex w-full items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
              aria-expanded={open}>
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        On the planner
        <span className="ml-1 font-normal normal-case tracking-normal">
          · {totals.done}/{totals.tasks} tasks · {totals.events} events{totals.cosmic ? ` · ${totals.cosmic} cosmic` : ""}
        </span>
      </button>
      {open && (
        <ul className="mt-2 space-y-2">
          {dates.map(iso => {
            const v = byDay.get(iso);
            if (!v || (v.tasks.length === 0 && v.events.length === 0 && v.cosmic.length === 0)) return null;
            const d = fromISO(iso);
            return (
              <li key={iso}>
                {kind !== "daily" && (
                  <div className="mb-0.5 flex items-center gap-2 text-[11px] font-medium">
                    <span>{format(d, "EEE, MMM d")}</span>
                    {dayMarks.get(iso)?.written && <span className="text-[10px] text-primary">note ✓</span>}
                  </div>
                )}
                <ul className="space-y-0.5 pl-1">
                  {v.events.map((a: any) => (
                    <li key={a.id} className="flex items-center gap-1.5 text-[11.5px]">
                      <CalendarClock className="h-3 w-3 shrink-0 text-violet-500" aria-hidden />
                      <span className="truncate">{a.title}</span>
                      {a.time && <span className="text-[10px] text-muted-foreground">{a.time}</span>}
                    </li>
                  ))}
                  {v.tasks.map((t: any) => (
                    <li key={t.id}>
                      <Link to={`/tasks/${t.id}`} className="flex items-center gap-1.5 text-[11.5px] hover:underline">
                        {t.done ? <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-500" aria-hidden /> : <Circle className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />}
                        <span className={cn("truncate", t.done && "text-muted-foreground")}>{t.title}</span>
                      </Link>
                    </li>
                  ))}
                  {v.cosmic.map(c => (
                    <li key={c.id} className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
                      <Sparkles className="h-3 w-3 shrink-0 text-amber-500" aria-hidden />
                      <span className="truncate">{c.label}</span>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
          {totals.tasks + totals.events + totals.cosmic === 0 && (
            <li className="text-[11.5px] text-muted-foreground">Nothing scheduled across this span yet.</li>
          )}
        </ul>
      )}
    </section>
  );
}
