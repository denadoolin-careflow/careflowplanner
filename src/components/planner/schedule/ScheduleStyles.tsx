import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { addDays, format, isSameDay, startOfWeek } from "date-fns";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { Check, Clock } from "lucide-react";
import { PHASE_ICONS } from "@/lib/phase-icons";
import type { RhythmPhase } from "@/lib/planner/rhythm-phase";
import { PHASE_ORDER, PHASE_WINDOW, currentPhase, parseInline, phaseOfAppointment, phaseOfTodayTask, pinPhase, readApptDone, readPhasePins, toggleApptDone } from "@/lib/today-phase-items";
import { cn } from "@/lib/utils";
import { ScheduleDayMoon } from "./ScheduleDayMoon";
import { supabase } from "@/integrations/supabase/client";
import { mealsOnCareDate } from "@/lib/bedside-plan";
import { doseSlots, useMedications } from "@/lib/medications";
import { phaseForTime } from "@/lib/today-phase-items";
import { PHASE_HOURS, durOf, isBlock, phaseBookedOpen, toMin } from "./schedule-time";
import { createContext, useContext } from "react";

/** Planner schedule styles (Day + Week) over real tasks and appointments, in the soft-tint phase language. */

export type Kind = "task" | "appt" | "meal" | "care";
export interface Item { id: string; title: string; time?: string; end?: string; kind: Kind; done?: boolean; phase: RhythmPhase }
interface WeekDay { day: string; date: string; iso: string; d: Date; items: Item[] }

const PHASE_LABEL: Record<RhythmPhase, string> = { plan: "Plan", grow: "Grow", care: "Care", letgo: "Let go" };
const KIND_LABEL: Record<Kind, string> = { task: "Task", appt: "Event", meal: "Meal", care: "Dose" };

/* ============ Phase icon styles ============ */

const ICON_STYLES = [
  { id: "filled", name: "Filled circle" },
  { id: "tint", name: "Soft tint" },
  { id: "ring", name: "Outline ring" },
  { id: "tile", name: "Rounded tile" },
  { id: "pill", name: "Pill chip" },
  { id: "arc", name: "Moon arc" },
] as const;
type IconStyle = (typeof ICON_STYLES)[number]["id"];
const IconStyleCtx = createContext<IconStyle>("tint");
const ARC: Record<RhythmPhase, number> = { plan: 0.25, grow: 0.5, care: 0.75, letgo: 1 };

/** Same four icons; only the badge around them changes with the chosen style. */
function Glyph({ phase, className }: { phase: RhythmPhase; className?: string }) {
  const I = PHASE_ICONS[phase];
  return <I aria-hidden className={className} strokeWidth={1.75} />;
}

function PB({ phase: p, big, now }: { phase: RhythmPhase; big?: boolean; now?: boolean }) {
  const v = useContext(IconStyleCtx);
  const box = big ? "h-9 w-9" : "h-6 w-6";
  const ic = big ? "h-4 w-4" : "h-3.5 w-3.5";
  const on = "hsl(var(--rhythm-on))";
  const nowRing = now ? { boxShadow: `0 0 0 2px hsl(var(--card)), 0 0 0 4px ${main(p)}` } : {};
  if (v === "pill") {
    return (
      <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full font-semibold", big ? "h-8 px-2.5 text-sm" : "h-6 px-1.5 text-xs")}
        style={{ background: now ? main(p) : tint(p, 0.9), color: now ? on : deep(p) }}>
        <Glyph phase={p} className={ic} />{big && PHASE_LABEL[p]}
      </span>
    );
  }
  if (v === "arc") {
    const r = big ? 16 : 10.5, c = 2 * Math.PI * r, sz = big ? 36 : 24;
    return (
      <span className={cn("relative grid shrink-0 place-items-center rounded-full", box)} style={{ background: tint(p, now ? 1 : 0.8), color: deep(p) }}>
        <svg aria-hidden className="absolute inset-0 -rotate-90" width={sz} height={sz} viewBox={`0 0 ${sz} ${sz}`}>
          <circle cx={sz / 2} cy={sz / 2} r={r} fill="none" stroke={main(p)} strokeOpacity={0.25} strokeWidth={2} />
          <circle cx={sz / 2} cy={sz / 2} r={r} fill="none" stroke={deep(p)} strokeWidth={2} strokeLinecap="round" strokeDasharray={`${c * ARC[p]} ${c}`} />
        </svg>
        <Glyph phase={p} className={ic} />
      </span>
    );
  }
  const style =
    v === "filled" ? { background: main(p), color: on }
    : v === "tint" ? { background: now ? main(p) : tint(p, 1), color: now ? on : deep(p) }
    : v === "ring" ? { border: `2px solid ${main(p)}`, background: now ? tint(p, 1) : "transparent", color: deep(p) }
    : { background: now ? main(p) : tint(p, 1), color: now ? on : deep(p) };
  return (
    <span className={cn("grid shrink-0 place-items-center", box, v === "tile" ? (big ? "rounded-xl" : "rounded-lg") : "rounded-full")}
      style={{ ...style, ...(v !== "ring" ? nowRing : {}) }}>
      <Glyph phase={p} className={ic} />
    </span>
  );
}

/* ============ Real data ============ */

interface Sched {
  date: Date; day: Item[]; week: WeekDay[]; todayIdx: number; nowPhase: RhythmPhase | null;
  toggle: (id: string) => void; openDay: (d: Date) => void; add: (phase: RhythmPhase, text: string, iso: string) => Promise<void>;
}
const SchedCtx = createContext<Sched | null>(null);
const useSched = () => useContext(SchedCtx)!;
const PHASE_DAYPART = { plan: "Morning", grow: "Afternoon", care: "Afternoon", letgo: "Evening" } as const;
const MEAL_TIME: Record<string, string> = { Breakfast: "07:30", Lunch: "12:00", Dinner: "18:00", Snack: "15:00", Drink: "10:00" };
const PHASE_DEFAULT_TIME: Record<RhythmPhase, string> = { plan: "09:00", grow: "13:00", care: "16:00", letgo: "19:00" };

export function useSchedData(date: Date, openDay: (d: Date) => void): Sched {
  const { state, toggleTask, addTask, addAppointment } = useStore();
  const [pins, setPins] = useState(readPhasePins);
  const [apptDone, setApptDone] = useState(readApptDone);
  const { medications } = useMedications();
  const iso0 = format(date, "yyyy-MM-dd");
  const wsIso = format(startOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const weIso = format(addDays(startOfWeek(date, { weekStartsOn: 1 }), 6), "yyyy-MM-dd");
  // Meal check-offs and dose logs for the visible week (shared synced tables).
  const [mealDone, setMealDone] = useState<Set<string>>(new Set());
  const [doseTaken, setDoseTaken] = useState<Set<string>>(new Set());
  const [rev, setRev] = useState(0);
  useEffect(() => {
    let live = true;
    void supabase.from("meal_completion_logs").select("meal_id,scheduled_date,done").gte("scheduled_date", wsIso).lte("scheduled_date", weIso)
      .then(({ data }) => { if (live) setMealDone(new Set((data ?? []).filter(r => r.done).map(r => `${r.meal_id}@${r.scheduled_date}`))); });
    void supabase.from("medication_logs").select("medication_id,scheduled_date,scheduled_time,status").gte("scheduled_date", wsIso).lte("scheduled_date", weIso)
      .then(({ data }) => { if (live) setDoseTaken(new Set((data ?? []).filter((r: any) => r.status === "taken").map((r: any) => `${r.medication_id}|${String(r.scheduled_time).slice(0, 5)}@${r.scheduled_date}`))); });
    return () => { live = false; };
  }, [wsIso, weIso, rev]);
  useEffect(() => {
    const sync = () => setPins(readPhasePins());
    window.addEventListener("careflow:phase-pins-change", sync);
    return () => window.removeEventListener("careflow:phase-pins-change", sync);
  }, []);
  useEffect(() => {
    const bump = () => setRev(r => r + 1);
    window.addEventListener("careflow:medication-logs-changed", bump);
    window.addEventListener("careflow:meals-done-change", bump);
    return () => { window.removeEventListener("careflow:medication-logs-changed", bump); window.removeEventListener("careflow:meals-done-change", bump); };
  }, []);
  const itemsFor = (iso: string): Item[] => {
    const ts: Item[] = state.tasks.filter(t => t.dueDate === iso).map(t => {
      const p = phaseOfTodayTask(t, pins);
      return { id: `t:${t.id}`, title: t.title, time: t.startTime ?? undefined, end: t.endTime ?? undefined, kind: "task" as Kind, done: t.done, phase: p };
    });
    const as: Item[] = state.appointments.filter(a => a.date === iso).map(a => ({
      id: `a:${a.id}`, title: a.title, time: a.time ?? undefined, end: a.endTime ?? undefined, kind: "appt" as Kind, done: apptDone.has(`${a.id}@${iso}`) || apptDone.has(a.id), phase: phaseOfAppointment(a, pins),
    }));
    const ms: Item[] = mealsOnCareDate(state.meals ?? [], iso).filter(m => m.name).map(m => {
      const time = MEAL_TIME[m.slot] ?? "15:00";
      return { id: `m:${m.id}@${iso}`, title: `${m.slot}: ${m.name}`, time, kind: "meal" as Kind, done: mealDone.has(`${m.id}@${iso}`), phase: phaseForTime(time) ?? "grow" };
    });
    const ds: Item[] = doseSlots(medications).map(d => {
      const time = d.time.slice(0, 5).padStart(5, "0");
      return { id: `d:${d.med.id}|${time}@${iso}`, title: d.med.name, time, kind: "care" as Kind, done: doseTaken.has(`${d.med.id}|${time}@${iso}`), phase: phaseForTime(time) ?? "plan" };
    });
    return [...ts, ...as, ...ms, ...ds].sort((x, y) => (x.time ?? PHASE_DEFAULT_TIME[x.phase]).localeCompare(y.time ?? PHASE_DEFAULT_TIME[y.phase]));
  };
  const iso = iso0;
  const day = useMemo(() => itemsFor(iso), [state.tasks, state.appointments, state.meals, medications, mealDone, doseTaken, pins, apptDone, iso]); // eslint-disable-line react-hooks/exhaustive-deps
  const week = useMemo(() => {
    const ws = startOfWeek(date, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => { const d = addDays(ws, i); const di = format(d, "yyyy-MM-dd");
      return { day: format(d, "EEE"), date: format(d, "d"), iso: di, d, items: itemsFor(di) }; });
  }, [state.tasks, state.appointments, state.meals, medications, mealDone, doseTaken, pins, apptDone, iso]); // eslint-disable-line react-hooks/exhaustive-deps
  const now = new Date();
  const todayIdx = week.findIndex(w => isSameDay(w.d, now));
  const toggle = (id: string) => {
    const [k, raw] = [id.slice(0, 1), id.slice(2)];
    if (k === "t") void toggleTask(raw);
    else if (k === "m" || k === "d") void toggleCareItem(k, raw);
    else { const a = state.appointments.find(x => x.id === raw); setApptDone(toggleApptDone(raw, a?.date ?? iso)); }
  };
  const toggleCareItem = async (k: string, raw: string) => {
    const [ref, dIso] = raw.split("@");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (k === "m") {
      const next = !mealDone.has(raw);
      const { error } = await supabase.from("meal_completion_logs").upsert({ user_id: user.id, meal_id: ref, scheduled_date: dIso, done: next, updated_at: new Date().toISOString() });
      if (error) { toast.error("Couldn't save meal check-off"); return; }
      window.dispatchEvent(new Event("careflow:meals-done-change"));
    } else {
      const [medId, t] = ref.split("|");
      const taken = doseTaken.has(raw);
      const q = taken
        ? supabase.from("medication_logs").delete().eq("medication_id", medId).eq("scheduled_date", dIso).eq("scheduled_time", `${t}:00`)
        : supabase.from("medication_logs").upsert({ user_id: user.id, medication_id: medId, scheduled_date: dIso, scheduled_time: `${t}:00`, status: "taken", taken_at: new Date().toISOString() } as any, { onConflict: "medication_id,scheduled_date,scheduled_time" } as any);
      const { error } = await q;
      if (error) { toast.error("Couldn't save dose"); return; }
      window.dispatchEvent(new Event("careflow:medication-logs-changed"));
    }
  };
  const add = async (phase: RhythmPhase, text: string, dIso: string) => {
    const parsed = parseInline(text, dIso);
    let id: string | undefined;
    if (parsed.kind === "appointment") id = (await addAppointment({ title: parsed.title, date: parsed.date, time: parsed.time }))?.id;
    else id = await addTask({ title: parsed.title, dueDate: parsed.date, startTime: parsed.time, dayPart: parsed.time ? undefined : PHASE_DAYPART[phase] });
    if (!id) return;
    if (!parsed.time) { pinPhase(id, phase); setPins(readPhasePins()); }
    if (parsed.date !== dIso) toast.success(`Added for ${parsed.date}`);
  };
  return { date, day, week, todayIdx, nowPhase: isSameDay(date, now) ? currentPhase(now) : null, toggle, openDay, add };
}

/** Inline NLP add at the bottom of a phase ("call mom 3pm"). */
function AddToPhase({ p, label, iso }: { p: RhythmPhase; label?: string; iso?: string }) {
  const { add, date } = useSched();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  const dIso = iso ?? format(date, "yyyy-MM-dd");
  if (!open) return (
    <button onClick={() => { setOpen(true); setTimeout(() => ref.current?.focus(), 0); }} className="mt-auto min-h-11 w-full rounded-xl border border-dashed px-3 text-left text-sm" style={{ borderColor: main(p), color: deep(p) }}>
      {label ?? `+ Add to ${PHASE_LABEL[p]}`}
    </button>
  );
  return (
    <form className="mt-auto flex gap-2" onSubmit={async e => { e.preventDefault(); if (!text.trim()) return; await add(p, text.trim(), dIso); setText(""); ref.current?.focus(); }}>
      <label className="sr-only" htmlFor={`add-${p}-${dIso}`}>Add to {PHASE_LABEL[p]}</label>
      <input id={`add-${p}-${dIso}`} ref={ref} value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Escape" && setOpen(false)}
        placeholder="Task or event, e.g. call mom 3pm" className="min-h-11 min-w-0 flex-1 rounded-xl border border-border bg-card px-3 text-[15px]" />
      <button type="submit" className="min-h-11 rounded-xl px-3 text-sm font-semibold" style={{ background: main(p), color: "hsl(var(--rhythm-on))" }}>Add</button>
    </form>
  );
}

const tint = (p: RhythmPhase, a = 0.4) => `hsl(var(--rhythm-${p}-tint) / ${a})`;
const deep = (p: RhythmPhase) => `hsl(var(--rhythm-${p}-deep))`;
const main = (p: RhythmPhase) => `hsl(var(--rhythm-${p}))`;
const phaseOf = (it: Item): RhythmPhase => it.phase;
const fmt = (t?: string) => {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ap = h >= 12 ? "pm" : "am";
  return `${h % 12 || 12}${m ? `:${String(m).padStart(2, "0")}` : ""} ${ap}`;
};

/** Shared item card: rounded, soft shadow, phase edge, big tap target. */
function ItemCard({ it, phase, dense }: { it: Item; phase: RhythmPhase; dense?: boolean }) {
  const { toggle } = useSched();
  return (
    <li
      className={cn(
        "flex items-start gap-2.5 rounded-xl border border-border/40 bg-card shadow-sm",
        dense ? "min-h-11 px-2.5 py-2" : "min-h-11 px-3 py-2",
        it.done && "opacity-60",
      )}
    >
      <span aria-hidden className="w-1 shrink-0 self-stretch rounded-full" style={{ background: main(phase) }} />
      <button
        onClick={() => toggle(it.id)}
        aria-label={it.done ? `Mark ${it.title} not done` : `Mark ${it.title} done`}
        className={cn(
          "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition-colors",
          it.done ? "border-transparent" : "border-muted-foreground/40",
        )}
        style={it.done ? { background: main(phase), borderColor: main(phase) } : undefined}
      >
        {it.done && <Check className="h-3 w-3 text-primary-foreground" />}
      </button>
      <span className="min-w-0 flex-1">
        <span className="block text-xs text-muted-foreground">
          {it.time ? fmt(it.time) : "Anytime"}{it.end ? ` – ${fmt(it.end)}` : ""} · {KIND_LABEL[it.kind]}
        </span>
        <span className={cn("block whitespace-normal break-words text-[15px] leading-snug [overflow-wrap:anywhere]", it.done && "line-through")}>{it.title}</span>
      </span>
    </li>
  );
}

/* ============ Concept 1 — Phase Timeline ============ */

function PhaseTimelineDay() {
  const S = useSched();
  const { nowPhase } = useSched();
  return (
    <div className="planner-card overflow-hidden border border-border/40">
      {PHASE_ORDER.map((p, i) => {
        const items = S.day.filter(it => phaseOf(it) === p);
        const isNow = p === nowPhase;
        return (
          <section
            key={p}
            aria-current={isNow ? "true" : undefined}
            className={cn("px-4 py-3", i > 0 && "border-t border-border/30")}
            style={{ background: tint(p, isNow ? 0.55 : 0.3) }}
          >
            <header className="flex items-center gap-2">
              <PB phase={p} />
              <h3 className="font-serif text-base" style={{ color: deep(p) }}>{PHASE_LABEL[p]}</h3>
              <span className="text-xs text-muted-foreground">{PHASE_WINDOW[p]}</span>
              {isNow && (
                <span className="ml-auto rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: main(p), color: "hsl(var(--rhythm-on))" }}>
                  NOW
                </span>
              )}
            </header>
            {items.length ? (
              <ul className="mt-2 space-y-1.5">{items.map(it => <ItemCard key={it.id} it={it} phase={p} />)}</ul>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">Open space — breathe.</p>
            )}
          </section>
        );
      })}
    </div>
  );
}

function PhaseTimelineWeek() {
  const S = useSched();
  return (
    <div className="space-y-3">
      {S.week.map((d, di) => (
        <div key={d.day} className={cn("planner-card border border-border/40 p-3", di === S.todayIdx && "ring-2 ring-primary")}>
          <header className="flex items-baseline gap-2 px-1">
            <button type="button" onClick={() => S.openDay(d.d)} className="flex min-h-11 items-baseline gap-2 text-left">
              <span className="font-serif text-xl">{d.day}</span>
              <span className="text-sm text-muted-foreground">{d.date}</span>
            </button>
            <ScheduleDayMoon date={d.d} compact className="ml-auto" />
          </header>
          {!d.items.length && <p className="px-1 text-sm text-muted-foreground">Open day — breathe.</p>}
          <div className="mt-1 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {PHASE_ORDER.map(p => {
              const items = d.items.filter(it => phaseOf(it) === p);
              if (!items.length) return null;
              return (
                <div key={p} className="rounded-xl p-2" style={{ background: tint(p, 0.35) }}>
                  <div className="flex items-center gap-1.5" style={{ color: deep(p) }}>
                    <PB phase={p} />
                    <span className="text-sm font-semibold">{PHASE_LABEL[p]}</span>
                    <span className="text-xs text-muted-foreground">{PHASE_WINDOW[p]}</span>
                  </div>
                  <ul className="mt-1 space-y-1">
                    {items.map(it => <ItemCard key={it.id} it={it} phase={p} dense />)}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ============ Concept 2 — Day Cards ============ */

function DayCardsDay() {
  const S = useSched();
  return (
    <div className="planner-card border border-border/40 p-4">
      <header className="flex items-baseline justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{format(S.date, "EEEE")}</p>
          <h3 className="font-serif text-2xl">{format(S.date, "MMMM d")}</h3>
        </div>
        <ScheduleDayMoon date={S.date} />
      </header>
      <div className="mt-3 space-y-3">
        {PHASE_ORDER.map(p => {
          const items = S.day.filter(it => phaseOf(it) === p);
          if (!items.length) return null;
          return (
            <section key={p}>
              <div
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
                style={{ background: tint(p, 0.6), color: deep(p) }}
              >
                <PB phase={p} />
                {PHASE_LABEL[p]} · {PHASE_WINDOW[p]}
              </div>
              <ul className="mt-1.5 space-y-1.5">{items.map(it => <ItemCard key={it.id} it={it} phase={p} />)}</ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function DayCardsWeek() {
  const S = useSched();
  return (
    <div className="space-y-3">
      {S.week.map((d, di) => (
        <div
          key={d.day}
          className={cn(
            "planner-card border border-border/40 p-3",
            di === S.todayIdx && "ring-2 ring-primary",
          )}
        >
          <header className="flex items-baseline gap-2">
            <button type="button" onClick={() => S.openDay(d.d)} className="flex min-h-11 items-baseline gap-2 text-left">
              <span className="font-serif text-xl">{d.day}</span>
              <span className="text-sm text-muted-foreground">{d.date}</span>
            </button>
            <ScheduleDayMoon date={d.d} compact className="ml-auto" />
          </header>
          <ul className="mt-1 grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
            {d.items.map(it => <ItemCard key={it.id} it={it} phase={phaseOf(it)} dense />)}
          </ul>
          {d.items.length < 3 && <p className="mt-2 text-xs text-muted-foreground">Room to breathe</p>}
        </div>
      ))}
    </div>
  );
}

/* ============ Concept 3 — Agenda Ribbon ============ */

function RibbonRow({ it, last }: { it: Item; last?: boolean }) {
  const { toggle } = useSched();
  const p = phaseOf(it);
  return (
    <li className="flex gap-3">
      <div className="flex w-[4.75rem] shrink-0 flex-col items-end pt-2.5">
        <span className="whitespace-nowrap rounded-full px-2 py-0.5 font-serif text-xs" style={{ background: tint(p, 1), color: deep(p) }}>{it.time ? fmt(it.time) : "Anytime"}</span>
        {it.end && <span className="mt-1 whitespace-nowrap font-serif text-xs" style={{ color: deep(p) }}>{fmt(it.end)}</span>}
      </div>
      <div className="relative flex w-4 shrink-0 flex-col items-center" aria-hidden>
        <span className="z-10 mt-3 h-3 w-3 rounded-full border-2 border-card" style={{ background: main(p) }} />
        {!last && <span className="absolute top-3 bottom-0 w-0.5 -translate-x-px" style={{ background: tint(p, 0.9) }} />}
      </div>
      <div className={cn("min-w-0 flex-1 pb-2", !last && "border-b border-border/20")}>
        <div
          className={cn(
            "flex items-center gap-2.5 rounded-xl border border-border/40 bg-card px-3 py-2 shadow-sm",
            it.done && "opacity-60",
          )}
        >
          <button
            onClick={() => toggle(it.id)}
            aria-label={it.done ? `Mark ${it.title} not done` : `Mark ${it.title} done`}
            className={cn("grid h-5 w-5 shrink-0 place-items-center rounded-full border-2", it.done ? "border-transparent" : "border-muted-foreground/40")}
            style={it.done ? { background: main(p) } : undefined}
          >
            {it.done && <Check className="h-3 w-3 text-primary-foreground" />}
          </button>
          <span className={cn("min-w-0 flex-1 break-words text-sm", it.done && "line-through")}>{it.title}</span>
          <span className="shrink-0 rounded-full px-1.5 py-0.5 text-xs" style={{ background: tint(p, 0.5), color: deep(p) }}>
            {KIND_LABEL[it.kind]}
          </span>
        </div>
      </div>
    </li>
  );
}

function AgendaRibbonDay() {
  const S = useSched();
  const sorted = [...S.day].sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));
  let prevPhase: RhythmPhase | null = null;
  return (
    <div className="planner-card border border-border/40 p-4">
      {!sorted.length && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Nothing scheduled yet — open space for the day.</p>
          <AddToPhase p={S.nowPhase ?? "plan"} label="+ Add a task or event" />
        </div>
      )}
      <ul>
        {sorted.map((it, i) => {
          const p = phaseOf(it);
          const showDivider = p !== prevPhase;
          prevPhase = p;
          return (
            <div key={it.id}>
              {showDivider && (
                <div className="flex items-center gap-2 py-1.5 pl-[5.75rem]">
                  <PB phase={p} />
                  <span className="text-xs font-semibold" style={{ color: deep(p) }}>{PHASE_LABEL[p]}</span>
                  <span className="h-px flex-1" style={{ background: tint(p, 0.8) }} />
                </div>
              )}
              <RibbonRow it={it} last={i === sorted.length - 1} />
            </div>
          );
        })}
      </ul>
    </div>
  );
}

function AgendaRibbonWeek() {
  const S = useSched();
  return (
    <div className="planner-card border border-border/40 p-4">
      {S.week.map((d, di) => (
        <section key={d.day} className={cn(di > 0 && "mt-4 border-t border-border/30 pt-3")}>
          <header className="flex items-baseline gap-2 pl-[5.75rem]">
            <h3 className="font-serif text-lg">{d.day} {d.date}</h3>
            <ScheduleDayMoon date={d.d} compact />
            <span className="ml-auto text-xs text-muted-foreground">{d.items.length} things</span>
          </header>
          <ul className="mt-1">
            {[...d.items]
              .sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""))
              .map((it, i) => <RibbonRow key={it.id} it={it} last={i === d.items.length - 1} />)}
          </ul>
        </section>
      ))}
    </div>
  );
}

/* ============ Concept 4 — Phase Grid ============ */

function GridCheckRow({ it, phase, onToggle }: { it: Item; phase: RhythmPhase; onToggle: () => void }) {
  return (
    <li className={cn("flex min-h-11 items-center gap-2.5 rounded-xl bg-card px-3 py-2 shadow-sm", it.done && "opacity-60")}>
      <span aria-hidden className="w-1 shrink-0 self-stretch rounded-full" style={{ background: main(phase) }} />
      <button
        onClick={onToggle}
        aria-label={it.done ? `Mark ${it.title} not done` : `Mark ${it.title} done`}
        className={cn("grid h-5 w-5 shrink-0 place-items-center rounded-full border-2", !it.done && "border-muted-foreground/40")}
        style={it.done ? { background: main(phase), borderColor: main(phase) } : undefined}
      >
        {it.done && <Check className="h-3 w-3 text-primary-foreground" />}
      </button>
      <span className={cn("min-w-0 flex-1 break-words text-sm leading-snug", it.done && "line-through")}>{it.title}</span>
      <span className="shrink-0 font-mono text-xs text-muted-foreground">{fmt(it.time)}</span>
    </li>
  );
}

function PhaseGridDay() {
  const { nowPhase, day: items, toggle } = useSched();
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {PHASE_ORDER.map(p => {
        const list = items.filter(it => phaseOf(it) === p);
        const done = list.filter(i => i.done).length;
        const isNow = p === nowPhase;
        return (
          <section
            key={p}
            aria-current={isNow ? "true" : undefined}
            className="planner-card flex flex-col gap-3 p-4"
            style={{ background: tint(p, 0.45), outline: isNow ? `2px solid ${main(p)}` : undefined }}
          >
            <header className="flex items-center gap-2.5">
              <PB phase={p} big now={isNow} />
              <div className="min-w-0 flex-1">
                <h3 className="font-serif text-lg leading-tight" style={{ color: deep(p) }}>{PHASE_LABEL[p]}</h3>
                <p className="text-xs text-muted-foreground">{PHASE_WINDOW[p]}</p>
              </div>
              {isNow && (
                <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: main(p), color: "hsl(var(--rhythm-on))" }}>NOW</span>
              )}
              <span className="text-xs font-medium" style={{ color: deep(p) }}>{done}/{list.length}</span>
            </header>
            <ul className="flex flex-col gap-2">
              {list.map(it => <GridCheckRow key={it.id} it={it} phase={p} onToggle={() => toggle(it.id)} />)}
            </ul>
            <AddToPhase p={p} />
          </section>
        );
      })}
    </div>
  );
}

function PhaseGridWeek() {
  const S = useSched();
  const { todayIdx, openDay } = useSched();
  return (
    <>
      {/* Desktop/tablet: days across, phases down */}
      <div className="planner-card hidden overflow-hidden p-3 md:block">
        <div className="grid gap-1.5" style={{ gridTemplateColumns: "88px repeat(7, minmax(0,1fr))" }}>
          <div />
          {S.week.map((d, i) => (
            <div key={d.day} className={cn("rounded-xl py-1.5 text-center", i === todayIdx && "bg-primary text-primary-foreground")}>
              <div className="text-xs uppercase tracking-wide">{d.day}</div>
              <div className="font-serif text-lg leading-none">{d.date}</div>
              <div className="mt-1 flex justify-center"><ScheduleDayMoon date={d.d} compact /></div>
            </div>
          ))}
          {PHASE_ORDER.map(p => (
            <Fragment key={p}>
              <div className="flex items-center gap-1.5 text-sm font-medium" style={{ color: deep(p) }}>
                <PB phase={p} />{PHASE_LABEL[p]}
              </div>
              {S.week.map((d, i) => {
                const list = d.items.filter(it => phaseOf(it) === p);
                return (
                  <button
                    type="button" onClick={() => openDay(d.d)} aria-label={`Open ${d.day} ${d.date}, ${PHASE_LABEL[p]}`}
                    key={`${p}-${d.day}`}
                    className="block min-h-20 rounded-xl p-1.5 text-left"
                    style={{ background: tint(p, i === todayIdx ? 0.7 : 0.35), outline: i === todayIdx ? `1px solid ${main(p)}` : undefined }}
                  >
                    {list.slice(0, 2).map(it => (
                      <div key={it.id} className={cn("mb-1 rounded-lg bg-card px-1.5 py-1 text-xs leading-snug shadow-sm break-words", it.done && "line-through opacity-60")}>
                        {it.title}
                      </div>
                    ))}
                    {list.length > 2 && <div className="text-xs font-medium" style={{ color: deep(p) }}>+{list.length - 2} more</div>}
                  </button>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>
      {/* Phone: one card per day, swipe sideways */}
      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-2 md:hidden">
        {S.week.map((d, i) => (
          <section key={d.day} className={cn("planner-card w-[82%] shrink-0 snap-start p-4", i === todayIdx && "ring-2 ring-primary")}>
            <div className="mb-3 flex items-center gap-2"><button type="button" onClick={() => openDay(d.d)} className="block min-h-11 text-left font-serif text-xl">{d.day} {d.date}</button><ScheduleDayMoon date={d.d} compact className="ml-auto" /></div>
            <div className="grid grid-cols-2 gap-2">
              {PHASE_ORDER.map(p => {
                const list = d.items.filter(it => phaseOf(it) === p);
                return (
                  <div key={p} className="min-h-24 rounded-xl p-2" style={{ background: tint(p, 0.5) }}>
                    <div className="mb-1 flex items-center gap-1 text-xs font-semibold" style={{ color: deep(p) }}>
                      <PB phase={p} />{PHASE_LABEL[p]}
                    </div>
                    {list.slice(0, 2).map(it => (
                      <div key={it.id} className={cn("mb-1 rounded-lg bg-card px-1.5 py-1 text-xs leading-snug shadow-sm break-words", it.done && "line-through opacity-60")}>{it.title}</div>
                    ))}
                    {list.length > 2 && <div className="text-xs font-medium" style={{ color: deep(p) }}>+{list.length - 2} more</div>}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}

/* ============ Concepts 5 & 6 — time blocks ============ */

const timeOf = (it: Item) => it.time ?? PHASE_DEFAULT_TIME[it.phase];
const endOf = (it: Item) => { const e = toMin(timeOf(it)) + durOf(it); return `${String(Math.floor(e / 60)).padStart(2, "0")}:${String(e % 60).padStart(2, "0")}`; };
const fmtDur = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ""}` : `${m}m`);

function PhaseHead({ p, list, isNow }: { p: RhythmPhase; list: Item[]; isNow: boolean }) {
  const [s, e] = PHASE_HOURS[p];
  const { booked, open } = phaseBookedOpen(p, list);
  return (
    <header className="flex flex-wrap items-center gap-2.5">
      <PB phase={p} big now={isNow} />
      <div className="min-w-0 flex-1">
        <h3 className="font-serif text-lg leading-tight" style={{ color: deep(p) }}>{PHASE_LABEL[p]}</h3>
        <p className="text-xs text-muted-foreground">{PHASE_WINDOW[p]}</p>
      </div>
      {isNow && <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: main(p), color: "hsl(var(--rhythm-on))" }}>NOW</span>}
      <span className="w-full text-xs font-medium sm:w-auto" style={{ color: deep(p) }}>{fmtDur(booked)} booked · {fmtDur(open)} open</span>
    </header>
  );
}

function useDayItems() {
  const { day: items, toggle } = useSched();
  return { items, toggle };
}

function CheckDot({ it, p, onToggle }: { it: Item; p: RhythmPhase; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      aria-label={it.done ? `Mark ${it.title} not done` : `Mark ${it.title} done`}
      className="-m-3 grid shrink-0 place-items-center p-3"
    >
      <span className={cn("grid h-5 w-5 place-items-center rounded-full border-2", !it.done && "border-muted-foreground/40")}
        style={it.done ? { background: main(p), borderColor: main(p) } : undefined}>
        {it.done && <Check className="h-3 w-3 text-primary-foreground" />}
      </span>
    </button>
  );
}

/** 5 · Hour Rails — each phase card has an hour rail; items sit at their real time and height. */
const PX_PER_MIN = 1.5;
function HourRailsDay() {
  const { items, toggle } = useDayItems();
  const { nowPhase } = useSched();
  const nd = new Date(); const nowMin = nd.getHours() * 60 + nd.getMinutes();
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {PHASE_ORDER.map(p => {
        const [s, e] = PHASE_HOURS[p];
        const all = items.filter(it => phaseOf(it) === p);
        const list = all.filter(it => it.time);
        const anytime = all.filter(it => !it.time);
        const H = (e - s) * 60 * PX_PER_MIN;
        const hours = Array.from({ length: e - s + 1 }, (_, i) => s + i);
        return (
          <section key={p} aria-current={p === nowPhase ? "true" : undefined} className="planner-card flex flex-col gap-3 p-4"
            style={{ background: tint(p, 0.45), outline: p === nowPhase ? `2px solid ${main(p)}` : undefined }}>
            <PhaseHead p={p} list={all} isNow={p === nowPhase} />
            {anytime.length > 0 && (
              <ul aria-label={`Anytime in ${PHASE_LABEL[p]}`} className="flex flex-col gap-2">
                {anytime.map(it => (
                  <li key={it.id} className={cn("flex min-h-11 items-center gap-2.5 rounded-xl bg-card px-3 py-2 shadow-sm", it.done && "opacity-60")}>
                    <CheckDot it={it} p={p} onToggle={() => toggle(it.id)} />
                    <span className={cn("min-w-0 flex-1 break-words text-sm leading-snug", it.done && "line-through")}>{it.title}</span>
                    <span className="shrink-0 rounded-full px-2 py-0.5 text-xs" style={{ background: tint(p, 1), color: deep(p) }}>Anytime</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="relative mt-2" style={{ height: (e - s) * 60 * PX_PER_MIN }}>
              {hours.map(h => (
                <div key={h} className="absolute inset-x-0 flex items-center gap-2" style={{ top: (h - s) * 60 * PX_PER_MIN - 8 }}>
                  <span className="w-11 shrink-0 text-right font-mono text-xs text-muted-foreground">{fmt(`${String(h).padStart(2, "0")}:00`)}</span>
                  <span className="h-px flex-1 bg-border/60" />
                </div>
              ))}
              {list.map(it => {
                const h = Math.min(Math.max(durOf(it) * PX_PER_MIN, 32), H);
                const top = Math.min(Math.max((toMin(timeOf(it)) - s * 60) * PX_PER_MIN, 0), H - h);
                return (
                  <div key={it.id} className={cn("absolute left-14 right-0 flex items-start gap-2 overflow-hidden rounded-xl px-2.5 py-1.5 shadow-sm", it.done && "opacity-60")}
                    style={{ top, height: h - 3, background: isBlock(it) ? main(p) : "hsl(var(--card))", borderLeft: `4px solid ${deep(p)}` }}>
                    <CheckDot it={it} p={p} onToggle={() => toggle(it.id)} />
                    <div className="min-w-0 flex-1" style={isBlock(it) ? { color: "hsl(var(--rhythm-on))" } : undefined}>
                      <p className={cn("break-words text-sm font-medium leading-snug", it.done && "line-through")}>{it.title}</p>
                      {h > 44 && <p className="text-xs opacity-80">{fmt(it.time)} – {fmt(endOf(it))}</p>}
                    </div>
                  </div>
                );
              })}
              {p === nowPhase && nowMin >= s * 60 && nowMin <= e * 60 && (
                <div aria-label={`Now ${format(new Date(), "h:mm a")}`} className="pointer-events-none absolute left-12 right-0 z-10 flex items-center" style={{ top: (nowMin - s * 60) * PX_PER_MIN }}>
                  <span className="-ml-1 h-2.5 w-2.5 rounded-full" style={{ background: deep(p) }} />
                  <span className="h-0.5 flex-1" style={{ background: deep(p) }} />
                </div>
              )}
            </div>
            <AddToPhase p={p} label={`+ Block time in ${PHASE_LABEL[p]}`} />
          </section>
        );
      })}
    </div>
  );
}

/** 6 · Block Pills — fixed time blocks with start/end badges on top, flexible tasks below. */
function BlockPill({ it, p }: { it: Item; p: RhythmPhase }) {
  const { toggle } = useSched();
  return (
    <li className="flex items-stretch overflow-hidden rounded-2xl bg-card shadow-sm">
      <div className="flex w-[4.5rem] shrink-0 flex-col items-center justify-center gap-0.5 py-2" style={{ background: main(p), color: "hsl(var(--rhythm-on))" }}>
        <span className="text-xs font-semibold">{fmt(it.time)}</span>
        <span aria-hidden className="h-3 w-px bg-current opacity-60" />
        <span className="text-xs font-semibold">{fmt(endOf(it))}</span>
      </div>
      <div className="min-w-0 flex-1 px-3 py-2">
        <p className={cn("break-words text-sm font-medium leading-snug", it.done && "line-through opacity-60")}>{it.title}</p>
        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" />{fmtDur(durOf(it))} · {KIND_LABEL[it.kind]}</p>
      </div>
      <div className="flex items-center pr-3"><CheckDot it={it} p={p} onToggle={() => toggle(it.id)} /></div>
    </li>
  );
}

function BlockPillsDay() {
  const { day: items, toggle, nowPhase } = useSched();
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {PHASE_ORDER.map(p => {
        const list = items.filter(it => phaseOf(it) === p);
        const blocks = list.filter(isBlock), tasks = list.filter(it => !isBlock(it));
        const isNow = p === nowPhase;
        return (
          <section key={p} aria-current={isNow ? "true" : undefined} className="planner-card flex flex-col gap-3 p-4"
            style={{ background: tint(p, 0.45), outline: isNow ? `2px solid ${main(p)}` : undefined }}>
            <PhaseHead p={p} list={list} isNow={isNow} />
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: deep(p) }}>Time blocks</p>
              {blocks.length ? <ul className="flex flex-col gap-2">{blocks.map(it => <BlockPill key={it.id} it={it} p={p} />)}</ul>
                : <p className="rounded-xl border border-dashed px-3 py-2.5 text-sm" style={{ borderColor: main(p), color: deep(p) }}>Open time — keep it for rest or block something</p>}
            </div>
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: deep(p) }}>Flexible tasks</p>
              <ul className="flex flex-col gap-2">
                {tasks.map(it => (
                  <li key={it.id} className={cn("flex min-h-11 items-center gap-2.5 rounded-xl bg-card px-3 py-2 shadow-sm", it.done && "opacity-60")}>
                    <CheckDot it={it} p={p} onToggle={() => toggle(it.id)} />
                    <span className={cn("min-w-0 flex-1 break-words text-sm leading-snug", it.done && "line-through")}>{it.title}</span>
                    <span className="shrink-0 rounded-full px-2 py-0.5 text-xs" style={{ background: tint(p, 0.9), color: deep(p) }}>~{fmtDur(durOf(it))}</span>
                  </li>
                ))}
              </ul>
            </div>
            <AddToPhase p={p} />
          </section>
        );
      })}
    </div>
  );
}

/** Week variant shared by 5 & 6: days across, phases down; blocks as start–end pills, tasks as checks. */
function TimeBlocksWeek({ rails }: { rails?: boolean }) {
  const S = useSched();
  const { todayIdx, openDay } = useSched();
  const cell = (d: WeekDay, p: RhythmPhase) => {
    const list = d.items.filter(it => phaseOf(it) === p);
    const [s, e] = PHASE_HOURS[p];
    return (
      <>
        {rails && (
          <div aria-hidden className="relative mb-1.5 h-2 rounded-full bg-card/70">
            {list.filter(isBlock).map(it => (
              <span key={it.id} className="absolute inset-y-0 rounded-full" style={{
                left: `${((toMin(timeOf(it)) - s * 60) / ((e - s) * 60)) * 100}%`,
                width: `${Math.max((durOf(it) / ((e - s) * 60)) * 100, 6)}%`, background: deep(p) }} />
            ))}
          </div>
        )}
        {list.slice(0, 3).map(it => isBlock(it) ? (
          <div key={it.id} className="mb-1 rounded-lg px-1.5 py-1 text-xs leading-snug shadow-sm" style={{ background: main(p), color: "hsl(var(--rhythm-on))" }}>
            <span className="block font-semibold">{fmt(it.time)}–{fmt(endOf(it))}</span>
            <span className="break-words">{it.title}</span>
          </div>
        ) : (
          <div key={it.id} className={cn("mb-1 flex items-start gap-1 rounded-lg bg-card px-1.5 py-1 text-xs leading-snug shadow-sm", it.done && "line-through opacity-60")}>
            <span className="mt-0.5 h-3 w-3 shrink-0 rounded-full border" style={{ borderColor: deep(p), background: it.done ? main(p) : undefined }} />
            <span className="break-words">{it.title}</span>
          </div>
        ))}
        {list.length > 3 && <span className="text-xs font-medium" style={{ color: deep(p) }}>+{list.length - 3} more</span>}
      </>
    );
  };
  return (
    <>
      <div className="planner-card hidden overflow-hidden p-3 md:block">
        <div className="grid gap-1.5" style={{ gridTemplateColumns: "88px repeat(7, minmax(0,1fr))" }}>
          <div />
          {S.week.map((d, i) => (
            <div key={d.day} className={cn("rounded-xl py-1.5 text-center", i === todayIdx && "bg-primary text-primary-foreground")}>
              <div className="text-xs uppercase tracking-wide">{d.day}</div>
              <div className="font-serif text-lg leading-none">{d.date}</div>
              <div className="mt-1 flex justify-center"><ScheduleDayMoon date={d.d} compact /></div>
            </div>
          ))}
          {PHASE_ORDER.map(p => (
            <Fragment key={p}>
              <div className="flex flex-col justify-center text-sm font-medium" style={{ color: deep(p) }}>
                <span className="flex items-center gap-1.5"><PB phase={p} />{PHASE_LABEL[p]}</span>
                <span className="text-xs font-normal text-muted-foreground">{PHASE_WINDOW[p]}</span>
              </div>
              {S.week.map((d, i) => (
                <button key={`${p}-${d.day}`} type="button" onClick={() => openDay(d.d)} aria-label={`Open ${d.day} ${d.date}, ${PHASE_LABEL[p]}`}
                  className="block min-h-20 rounded-xl p-1.5 text-left"
                  style={{ background: tint(p, i === todayIdx ? 0.7 : 0.35), outline: i === todayIdx ? `1px solid ${main(p)}` : undefined }}>
                  {cell(d, p)}
                </button>
              ))}
            </Fragment>
          ))}
        </div>
      </div>
      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-2 md:hidden">
        {S.week.map((d, i) => (
          <section key={d.day} className={cn("planner-card w-[82%] shrink-0 snap-start p-4", i === todayIdx && "ring-2 ring-primary")}>
            <div className="mb-3 flex items-center gap-2"><button type="button" onClick={() => openDay(d.d)} className="block min-h-11 text-left font-serif text-xl">{d.day} {d.date}</button><ScheduleDayMoon date={d.d} compact className="ml-auto" /></div>
            <div className="flex flex-col gap-2">
              {PHASE_ORDER.map(p => (
                <div key={p} className="rounded-xl p-2" style={{ background: tint(p, 0.5) }}>
                  <div className="mb-1 flex items-center gap-1 text-xs font-semibold" style={{ color: deep(p) }}>
                    <PB phase={p} />{PHASE_LABEL[p]}
                    <span className="ml-auto font-normal text-muted-foreground">{PHASE_WINDOW[p]}</span>
                  </div>
                  {cell(d, p)}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}


/* ============ Public API ============ */

export const SCHEDULE_STYLES = [
  { id: "classic", name: "Classic" },
  { id: "timeline", name: "Phase Timeline" },
  { id: "cards", name: "Day Cards" },
  { id: "ribbon", name: "Agenda Ribbon" },
  { id: "grid", name: "Phase Grid" },
  { id: "rails", name: "Hour Rails" },
  { id: "pills", name: "Block Pills" },
] as const;
export type ScheduleStyle = (typeof SCHEDULE_STYLES)[number]["id"];
const STYLE_KEY = "careflow.planner.scheduleStyle";
export function readScheduleStyle(): ScheduleStyle {
  try { const v = window.localStorage.getItem(STYLE_KEY); return (SCHEDULE_STYLES.some(x => x.id === v) ? v : "classic") as ScheduleStyle; } catch { return "classic"; }
}
export function useScheduleStyle(): [ScheduleStyle, (s: ScheduleStyle) => void] {
  const [v, setV] = useState<ScheduleStyle>(readScheduleStyle);
  useEffect(() => {
    const on = () => setV(readScheduleStyle());
    window.addEventListener("careflow:schedule-style", on);
    return () => window.removeEventListener("careflow:schedule-style", on);
  }, []);
  return [v, (s) => { try { window.localStorage.setItem(STYLE_KEY, s); } catch { /* ignore */ } setV(s); window.dispatchEvent(new Event("careflow:schedule-style")); }];
}

/** Renders the chosen schedule style for a day or the week containing `date`. */
export function PlannerScheduleStyleView({ style, scope, date, onOpenDay }: {
  style: Exclude<ScheduleStyle, "classic">; scope: "day" | "week"; date: Date; onOpenDay: (d: Date) => void;
}) {
  const data = useSchedData(date, onOpenDay);
  const day = scope === "day";
  return (
    <SchedCtx.Provider value={data}>
      <IconStyleCtx.Provider value="tint">
        {day && style !== "cards" && (
          <div className="mb-2 flex items-center gap-2 px-1">
            <span className="font-serif text-lg">{format(date, "EEEE, MMMM d")}</span>
            <ScheduleDayMoon date={date} className="ml-auto" />
          </div>
        )}
        {style === "timeline" && (day ? <PhaseTimelineDay /> : <PhaseTimelineWeek />)}
        {style === "cards" && (day ? <DayCardsDay /> : <DayCardsWeek />)}
        {style === "ribbon" && (day ? <AgendaRibbonDay /> : <AgendaRibbonWeek />)}
        {style === "grid" && (day ? <PhaseGridDay /> : <PhaseGridWeek />)}
        {style === "rails" && (day ? <HourRailsDay /> : <TimeBlocksWeek rails />)}
        {style === "pills" && (day ? <BlockPillsDay /> : <TimeBlocksWeek />)}
      </IconStyleCtx.Provider>
    </SchedCtx.Provider>
  );
}

/** Compact, scrollable style chooser shown above the Planner schedule (also used in Settings). */
export function ScheduleStylePicker({ value, onChange, className }: { value: ScheduleStyle; onChange: (s: ScheduleStyle) => void; className?: string }) {
  return (
    <div role="radiogroup" aria-label="Schedule style" className={cn("-mx-1 flex gap-1.5 overflow-x-auto overscroll-x-contain px-1 pb-1", className)}>
      {SCHEDULE_STYLES.map(st => (
        <button key={st.id} type="button" role="radio" aria-checked={value === st.id} onClick={() => onChange(st.id)}
          className={cn("min-h-11 shrink-0 rounded-full border px-3.5 text-sm font-medium transition-colors",
            value === st.id ? "border-primary bg-primary text-primary-foreground" : "border-border/60 bg-card text-foreground hover:border-primary/40")}>
          {st.name}
        </button>
      ))}
    </div>
  );
}
