import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { format, isSameDay } from "date-fns";
import { CalendarDays, ChevronDown, ChevronRight, Send } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Note, PeriodKind } from "@/lib/notes";
import {
  PERIOD_LABEL, childrenKeys, fromISO, parentsOf, periodTitle, spanDates, spanFor, toISO,
} from "@/lib/notes/periods";
import { openPeriodNoteWithTemplate, readDefaultPeriodTemplate, usePeriodNoteMarks } from "@/lib/notes/daily";
import { plannerHref } from "@/lib/notes/date-refs";
import { useDayPlans } from "@/lib/planner/day-plan";
import { PeriodDayPlan } from "./PeriodDayPlan";

/**
 * Where this note lives: its parent week/month, the days or weeks inside it,
 * and what the planner has scheduled across the same span (tasks, events,
 * meals, cosmic events). Shown on daily / weekly / monthly note pages.
 */
export function PeriodContextPanel({ note, className, onSendUnchecked, dueDate, onDueDateChange }: {
  note: Note;
  className?: string;
  /** Promotes every unchecked checkbox in the note into planner tasks. */
  onSendUnchecked?: () => void;
  /** Day promoted tasks land on; editable here so it stays in sync with the page. */
  dueDate?: string | null;
  onDueDateChange?: (iso: string | null) => void;
}) {
  const kind = note.kind as PeriodKind;
  const key = note.date!;
  const navigate = useNavigate();
  const [open, setOpen] = useState(kind !== "monthly");

  const span = useMemo(() => spanFor(kind, key), [kind, key]);
  const dates = useMemo(() => spanDates(span), [span]);
  const parents = useMemo(() => parentsOf(kind, key), [kind, key]);
  const children = useMemo(() => childrenKeys(kind, key), [kind, key]);
  const today = new Date();
  const todayISO = toISO(today);

  // Which days are unfolded in a week/month note. Today starts open.
  const [openDays, setOpenDays] = useState<Set<string>>(() => new Set(dates.includes(todayISO) ? [todayISO] : dates.slice(0, 1)));
  const toggleDay = (iso: string) => setOpenDays(s => { const n = new Set(s); n.has(iso) ? n.delete(iso) : n.add(iso); return n; });
  const allOpen = dates.every(d => openDays.has(d));

  const weekMarks = usePeriodNoteMarks("weekly", [
    ...parents.filter(p => p.kind === "weekly").map(p => p.key),
    ...(children?.kind === "weekly" ? children.keys : []),
  ]);
  const monthMarks = usePeriodNoteMarks("monthly", parents.filter(p => p.kind === "monthly").map(p => p.key));
  const dayMarks = usePeriodNoteMarks("daily", children?.kind === "daily" ? children.keys : []);

  const markFor = (k: PeriodKind, iso: string) =>
    k === "weekly" ? weekMarks.get(iso) : k === "monthly" ? monthMarks.get(iso) : dayMarks.get(iso);

  const openPeriod = async (k: PeriodKind, iso: string) => {
    try {
      const n = await openPeriodNoteWithTemplate(k, iso, readDefaultPeriodTemplate(k));
      navigate(`/notes/${n.id}`);
    } catch (e: any) { toast.error(e?.message ?? "Could not open the note"); }
  };

  const plans = useDayPlans(dates);

  const totals = useMemo(() => {
    let tasks = 0, done = 0, events = 0, cosmic = 0, meals = 0;
    for (const v of plans.values()) {
      tasks += v.tasks.length; done += v.tasks.filter(t => t.done).length;
      events += v.events.length; cosmic += v.cosmic.length; meals += v.meals.length;
    }
    return { tasks, done, events, cosmic, meals };
  }, [plans]);

  const minISO = toISO(span.from), maxISO = toISO(span.to);

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
          · {totals.done}/{totals.tasks} tasks · {totals.events} events{totals.meals ? ` · ${totals.meals} meals` : ""}{totals.cosmic ? ` · ${totals.cosmic} cosmic` : ""}
        </span>
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          {onSendUnchecked && (
            <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-dashed border-border/60 px-2 py-1.5">
              <button type="button" onClick={onSendUnchecked}
                      className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-primary/20">
                <Send className="h-3 w-3" /> Send unchecked boxes to planner
              </button>
              <label className="ml-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <CalendarDays className="h-3 w-3" aria-hidden /> on
                <input
                  type="date"
                  value={dueDate ?? ""}
                  min={minISO}
                  max={maxISO}
                  onChange={e => onDueDateChange?.(e.target.value || null)}
                  className="rounded-md border border-border/60 bg-background px-1.5 py-0.5 text-[11px] text-foreground"
                  aria-label="Day promoted tasks are scheduled on"
                />
              </label>
            </div>
          )}
          {kind !== "daily" && (
            <div className="flex justify-end">
              <button type="button" className="text-[10px] text-muted-foreground hover:text-foreground"
                      onClick={() => setOpenDays(allOpen ? new Set() : new Set(dates))}>
                {allOpen ? "Collapse all days" : "Expand all days"}
              </button>
            </div>
          )}
          {dates.map(iso => {
            const plan = plans.get(iso);
            if (!plan) return null;
            const d = fromISO(iso);
            if (kind === "daily") return <PeriodDayPlan key={iso} plan={plan} noteId={note.id} />;
            const expanded = openDays.has(iso);
            const done = plan.tasks.filter(t => t.done).length;
            const isToday = iso === todayISO;
            return (
              <div key={iso} className={cn("rounded-xl border border-border/50", expanded && "bg-background/50", isToday && "border-primary/40")}>
                <button type="button" onClick={() => toggleDay(iso)} aria-expanded={expanded}
                        className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-[11.5px] hover:bg-muted/50">
                  <ChevronRight className={cn("h-3 w-3 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-90")} aria-hidden />
                  <span className={cn("font-medium", isToday && "text-primary")}>{format(d, "EEE, MMM d")}</span>
                  {isToday && <span className="rounded-full bg-primary/10 px-1.5 text-[9px] font-semibold uppercase tracking-wider text-primary">Today</span>}
                  {dayMarks.get(iso)?.written && <span className="text-[10px] text-primary">note ✓</span>}
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    {plan.tasks.length ? `${done}/${plan.tasks.length} tasks` : "no tasks"}
                    {plan.events.length ? ` · ${plan.events.length} ev` : ""}
                    {plan.meals.length ? ` · ${plan.meals.length} meals` : ""}
                  </span>
                </button>
                {expanded && (
                  <div className="animate-fade-in px-2 pb-2">
                    <PeriodDayPlan plan={plan} noteId={note.id} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
