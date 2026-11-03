import { useState } from "react";
import { Check, Repeat, AlertCircle, SkipForward, Pause, ArrowRightLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { PHASE_ICONS } from "@/lib/phase-icons";
import { ScheduleDayMoon } from "@/components/planner/schedule/ScheduleDayMoon";

type Phase = "plan" | "grow" | "care" | "letgo";
const tint = (p: Phase) => ({ background: `hsl(var(--rhythm-${p}-tint))`, color: `hsl(var(--rhythm-${p}-deep))` });
const PN: Record<Phase, string> = { plan: "Plan", grow: "Grow", care: "Care", letgo: "Let go" };
const PHASES: Phase[] = ["plan", "grow", "care", "letgo"];
const addDays = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return d; };
const dayName = (d: Date) => d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

function Pills<T extends string>({ opts, v, set, label }: { opts: readonly T[]; v: T; set: (x: any) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
      {opts.map((o) => (
        <button key={o} role="radio" aria-checked={v === o} onClick={() => set(o)} className={cn("min-h-11 rounded-full px-3 text-xs font-semibold", v === o ? "bg-primary text-primary-foreground" : "bg-card text-foreground shadow-sm")}>{o}</button>
      ))}
    </div>
  );
}
function Badge({ p }: { p: Phase }) {
  const I = PHASE_ICONS[p];
  return <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full" style={tint(p)} aria-label={PN[p]}><I className="h-4 w-4" /></span>;
}
function CheckBtn({ on, toggle, label }: { on: boolean; toggle: () => void; label: string }) {
  return (
    <button aria-pressed={on} aria-label={`Check off ${label}`} onClick={toggle} className="grid h-11 w-11 shrink-0 place-items-center">
      <span className={cn("grid h-6 w-6 place-items-center rounded-full border-2", on ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/50")}>{on && <Check className="h-3.5 w-3.5" />}</span>
    </button>
  );
}
type T = { id: string; title: string; phase: Phase; meta?: string; age?: number; day?: number; repeat?: string; next?: string; overdue?: boolean };
function Row({ t, on, toggle, compact, extra }: { t: T; on: boolean; toggle: () => void; compact?: boolean; extra?: React.ReactNode }) {
  return (
    <li className={cn("flex items-start gap-2 rounded-xl bg-card shadow-sm", compact ? "p-1.5" : "p-2")} style={{ borderLeft: `3px solid hsl(var(--rhythm-${t.phase}))` }}>
      <CheckBtn on={on} toggle={toggle} label={t.title} />
      <div className="min-w-0 flex-1 py-2">
        <p className={cn("whitespace-normal break-words leading-snug", compact ? "text-sm" : "text-[15px]", on && "text-muted-foreground line-through")}>{t.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          {t.meta && <span>{t.meta}</span>}
          {t.repeat && <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5" style={tint(t.phase)}><Repeat className="h-3 w-3" />{t.repeat}{t.next && ` · next ${t.next}`}</span>}
        </div>
      </div>
      {extra}
    </li>
  );
}
const useDone = () => { const [d, s] = useState<string[]>([]); return [d, (id: string) => s((x) => (x.includes(id) ? x.filter((y) => y !== id) : [...x, id]))] as const; };
const Frame = ({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) => (
  <div className="mx-auto max-w-6xl space-y-4 px-4 py-4">
    <header><h1 className="font-display text-2xl">{title}</h1><p className="text-sm text-muted-foreground">{sub} Sample items only.</p></header>
    {children}
  </div>
);

/* 1 · Held in your inbox */
const HELD: T[] = [
  { id: "h1", title: "Call the pharmacy about Mom's refill", phase: "plan", age: 0, meta: "Caregiving · ~10m" },
  { id: "h2", title: "Book dentist for the kids", phase: "plan", age: 0, meta: "Kids" },
  { id: "h3", title: "Return library books before Friday", phase: "grow", age: 3, meta: "Home" },
  { id: "h4", title: "Look into a gentler laundry detergent for sensitive skin", phase: "care", age: 5, meta: "Home" },
  { id: "h5", title: "Write thank-you note to the hospice nurse", phase: "letgo", age: 12, meta: "Caregiving" },
];
const HELD_STYLES = ["A · Quiet rows", "B · Grouped by age", "C · Compact chips"] as const;
export function HeldMockup() {
  const [s, setS] = useState<(typeof HELD_STYLES)[number]>(HELD_STYLES[0]);
  const [done, toggle] = useDone();
  const sortBtn = <button className="min-h-11 shrink-0 self-center rounded-full bg-muted px-3 text-xs font-semibold">Sort</button>;
  const groups = [
    { k: "New today", l: HELD.filter((t) => !t.age) },
    { k: "This week", l: HELD.filter((t) => t.age && t.age <= 7) },
    { k: "Older · been here a while", l: HELD.filter((t) => (t.age ?? 0) > 7), old: true },
  ];
  return (
    <Frame title="Held in your inbox" sub="Three ways to show what's waiting to be sorted.">
      <Pills opts={HELD_STYLES} v={s} set={setS} label="Inbox style" />
      <section className="planner-card max-w-2xl bg-card p-4">
        <div className="mb-3 flex items-baseline justify-between"><h2 className="font-display text-lg">Held in your inbox</h2><span className="text-xs text-muted-foreground">{HELD.length - done.length} waiting</span></div>
        {s === HELD_STYLES[0] && <ul className="space-y-2">{HELD.map((t) => <Row key={t.id} t={t} on={done.includes(t.id)} toggle={() => toggle(t.id)} extra={sortBtn} />)}</ul>}
        {s === HELD_STYLES[1] && <div className="space-y-4">{groups.map((g) => g.l.length > 0 && (
          <div key={g.k} className={cn("rounded-2xl p-2", g.old && "bg-muted/50")}>
            <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{g.k}</p>
            <ul className="space-y-2">{g.l.map((t) => <Row key={t.id} t={{ ...t, meta: `${t.meta} · ${t.age ? `${t.age}d ago` : "today"}` }} on={done.includes(t.id)} toggle={() => toggle(t.id)} extra={sortBtn} />)}</ul>
          </div>))}</div>}
        {s === HELD_STYLES[2] && <ul className="grid gap-2 sm:grid-cols-2">{HELD.map((t) => (
          <li key={t.id} className="flex items-start gap-1 rounded-xl p-1.5" style={tint(t.phase)}>
            <CheckBtn on={done.includes(t.id)} toggle={() => toggle(t.id)} label={t.title} />
            <div className="min-w-0 flex-1 py-1.5"><p className={cn("text-sm font-semibold leading-snug break-words", done.includes(t.id) && "line-through opacity-70")}>{t.title}</p><p className="text-xs opacity-80">{PN[t.phase]} · {t.meta}</p></div>
          </li>))}</ul>}
      </section>
    </Frame>
  );
}

/* 2 · Today & Upcoming */
const TU: T[] = [
  { id: "o1", title: "Renew car registration", phase: "plan", day: -2, overdue: true, meta: "Money" },
  { id: "t1", title: "School drop-off", phase: "plan", day: 0, meta: "8:30" },
  { id: "t2", title: "Fold laundry and put away towels", phase: "grow", day: 0, meta: "~25m" },
  { id: "t3", title: "Mom's evening meds", phase: "care", day: 0, meta: "6:00 pm", repeat: "Daily" },
  { id: "t4", title: "Journal and lights out", phase: "letgo", day: 0, meta: "9:30 pm" },
  { id: "u1", title: "Pay the electric bill", phase: "grow", day: 1, meta: "Money" },
  { id: "u2", title: "Pantry reset", phase: "care", day: 2, meta: "~60m" },
  { id: "u3", title: "Water the plants", phase: "plan", day: 3, repeat: "Every Tue" },
  { id: "u4", title: "Call Grandma", phase: "letgo", day: 5, meta: "Family" },
];
const TU_STYLES = ["A · Stacked sections", "B · Two columns", "C · Timeline strip"] as const;
export function TodayUpcomingMockup() {
  const [s, setS] = useState<(typeof TU_STYLES)[number]>(TU_STYLES[0]);
  const [tab, setTab] = useState<"Today" | "Upcoming">("Today");
  const [pick, setPick] = useState(0);
  const [done, toggle] = useDone();
  const overdue = TU.filter((t) => t.overdue && !done.includes(t.id));
  const R = (t: T) => <Row key={t.id} t={t} on={done.includes(t.id)} toggle={() => toggle(t.id)} />;
  const Banner = overdue.length > 0 && (
    <div className="flex items-center gap-2 rounded-xl p-3 text-sm" style={tint("letgo")}><AlertCircle className="h-4 w-4" />{overdue.length} from earlier: {overdue.map((t) => t.title).join(", ")}<button onClick={() => overdue.forEach((t) => toggle(t.id))} className="ml-auto min-h-11 rounded-full bg-card px-3 text-xs font-semibold text-foreground">Done</button></div>
  );
  const TodayList = (
    <div className="space-y-3">{PHASES.map((p) => { const l = TU.filter((t) => t.day === 0 && t.phase === p); const I = PHASE_ICONS[p]; return (
      <div key={p}><p className="mb-1.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold" style={tint(p)}><I className="h-3.5 w-3.5" />{PN[p]}</p><ul className="space-y-2">{l.length ? l.map(R) : <li className="px-2 text-xs text-muted-foreground">Open time</li>}</ul></div>); })}</div>
  );
  const Upcoming = (
    <div className="space-y-4">{[1, 2, 3, 4, 5, 6, 7].map((n) => { const l = TU.filter((t) => t.day === n); if (!l.length) return null; return (
      <div key={n}><div className="mb-1.5 flex items-center justify-between gap-2"><h3 className="font-display text-base">{dayName(addDays(n))}</h3><ScheduleDayMoon date={addDays(n)} compact /></div><ul className="space-y-2">{l.map(R)}</ul></div>); })}</div>
  );
  return (
    <Frame title="Today & Upcoming" sub="Three ways to see today and the days ahead.">
      <Pills opts={TU_STYLES} v={s} set={setS} label="Today and upcoming style" />
      {Banner}
      {s === TU_STYLES[0] && <div className="max-w-2xl space-y-4"><section className="planner-card bg-card p-4"><h2 className="mb-3 font-display text-lg">Today</h2>{TodayList}</section><section className="planner-card bg-card p-4"><h2 className="mb-3 font-display text-lg">Upcoming</h2>{Upcoming}</section></div>}
      {s === TU_STYLES[1] && <>
        <div className="lg:hidden"><Pills opts={["Today", "Upcoming"] as const} v={tab} set={setTab} label="View" /></div>
        <div className="grid gap-4 lg:grid-cols-2">
          <section className={cn("planner-card bg-card p-4", tab !== "Today" && "hidden lg:block")}><h2 className="mb-3 font-display text-lg">Today</h2>{TodayList}</section>
          <section className={cn("planner-card bg-card p-4", tab !== "Upcoming" && "hidden lg:block")}><h2 className="mb-3 font-display text-lg">Next 7 days</h2>{Upcoming}</section>
        </div></>}
      {s === TU_STYLES[2] && <section className="planner-card max-w-2xl bg-card p-4">
        <div className="mb-4 flex gap-1.5 overflow-x-auto overscroll-x-contain pb-1">{[0, 1, 2, 3, 4, 5, 6].map((n) => { const c = TU.filter((t) => t.day === n).length; return (
          <button key={n} onClick={() => setPick(n)} aria-pressed={pick === n} className={cn("min-h-16 min-w-14 shrink-0 rounded-2xl px-2 py-1.5 text-center", pick === n ? "bg-primary text-primary-foreground" : "bg-muted")}>
            <span className="block text-xs">{addDays(n).toLocaleDateString(undefined, { weekday: "short" })}</span><span className="block font-display text-lg">{addDays(n).getDate()}</span><span className="block text-xs">{c ? `${c}` : "·"}</span></button>); })}</div>
        <div className="mb-3 flex items-center justify-between gap-2"><h2 className="font-display text-lg">{pick === 0 ? "Today" : dayName(addDays(pick))}</h2><ScheduleDayMoon date={addDays(pick)} compact /></div>
        {pick === 0 ? TodayList : <ul className="space-y-2">{TU.filter((t) => t.day === pick).map(R)}{!TU.some((t) => t.day === pick) && <li className="text-sm text-muted-foreground">Nothing planned — open time to rest.</li>}</ul>}
      </section>}
    </Frame>
  );
}

/* 3 · Repeating tasks */
const QUICK = ["Daily", "Weekdays", "Weekly", "Monthly", "Custom"] as const;
const DOW = ["S", "M", "T", "W", "T", "F", "S"];
export function RepeatMockup() {
  const [draft, setDraft] = useState("water plants every Tue");
  const [q, setQ] = useState<(typeof QUICK)[number]>("Weekly");
  const [every, setEvery] = useState(1);
  const [unit, setUnit] = useState<"days" | "weeks" | "months">("weeks");
  const [days, setDays] = useState<number[]>([2]);
  const [monthly, setMonthly] = useState<"On the 1st" | "Last Friday">("On the 1st");
  const [ends, setEnds] = useState<"Never" | "On a date" | "After N times">("Never");
  const [from, setFrom] = useState<"Fixed schedule" | "From when I finish">("Fixed schedule");
  const [series, setSeries] = useState([
    { id: "r1", title: "Water the plants", phase: "plan" as Phase, repeat: "Every Tue", n: 0 },
    { id: "r2", title: "Mom's evening meds", phase: "care" as Phase, repeat: "Daily", n: 0 },
    { id: "r3", title: "Change the bed sheets", phase: "grow" as Phase, repeat: "Every 2 weeks · from finish", n: 0 },
  ]);
  const [paused, setPaused] = useState<string[]>([]);
  const [msg, setMsg] = useState("");
  const parsed = /every\s+(\w+)/i.exec(draft)?.[1];
  const next = (n: number) => dayName(addDays(n === 0 ? 2 : 2 + n * 7)).split(",")[0];
  return (
    <Frame title="Repeating tasks" sub="A friendlier way to set, see and manage repeats.">
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="planner-card space-y-3 bg-card p-4">
          <h2 className="font-display text-lg">Add with a repeat</h2>
          <input value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="New task" className="min-h-11 w-full rounded-xl border border-border bg-background px-3 text-[15px]" />
          {parsed && <p className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold" style={tint("plan")}><Repeat className="h-3 w-3" />Repeats every {parsed}</p>}
          <Pills opts={QUICK} v={q} set={setQ} label="Quick repeat" />
          {q === "Custom" && <div className="space-y-3 rounded-2xl bg-muted/50 p-3">
            <div className="flex items-center gap-2 text-sm">Every <input type="number" min={1} value={every} onChange={(e) => setEvery(Math.max(1, +e.target.value))} aria-label="Interval" className="min-h-11 w-16 rounded-lg border border-border bg-background px-2" />
              <Pills opts={["days", "weeks", "months"] as const} v={unit} set={setUnit} label="Unit" /></div>
            {unit === "weeks" && <div className="flex gap-1.5">{DOW.map((d, i) => <button key={i} aria-pressed={days.includes(i)} onClick={() => setDays((x) => x.includes(i) ? x.filter((y) => y !== i) : [...x, i])} className={cn("h-11 w-11 rounded-full text-sm font-semibold", days.includes(i) ? "bg-primary text-primary-foreground" : "bg-card shadow-sm")}>{d}</button>)}</div>}
            {unit === "months" && <Pills opts={["On the 1st", "Last Friday"] as const} v={monthly} set={setMonthly} label="Monthly on" />}
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ends</p>
            <Pills opts={["Never", "On a date", "After N times"] as const} v={ends} set={setEnds} label="Ends" />
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Next one is counted</p>
            <Pills opts={["Fixed schedule", "From when I finish"] as const} v={from} set={setFrom} label="Repeat from" />
          </div>}
          <button onClick={() => { setSeries((s) => [...s, { id: `r${s.length + 1}`, title: draft.replace(/every\s+\w+/i, "").trim() || "New task", phase: "grow", repeat: parsed ? `Every ${parsed}` : q === "Custom" ? `Every ${every} ${unit}` : q, n: 0 }]); setMsg("Added with a repeat"); }} className="min-h-11 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground">Add task</button>
        </section>
        <section className="planner-card space-y-3 bg-card p-4">
          <h2 className="font-display text-lg">In your lists</h2>
          <p className="text-sm text-muted-foreground">Check one off and the next one appears.</p>
          <ul className="space-y-2">{series.map((t) => (
            <Row key={`${t.id}-${t.n}`} t={{ ...t, next: paused.includes(t.id) ? "paused" : next(t.n + 1), meta: `Due ${next(t.n)}` }} on={false}
              toggle={() => { setSeries((s) => s.map((x) => x.id === t.id ? { ...x, n: x.n + 1 } : x)); setMsg(`Done — next "${t.title}" is ${next(t.n + 1)}`); }}
              extra={<div className="flex shrink-0 self-center">
                <button aria-label="Skip this one" onClick={() => { setSeries((s) => s.map((x) => x.id === t.id ? { ...x, n: x.n + 1 } : x)); setMsg("Skipped this one"); }} className="grid h-11 w-11 place-items-center"><SkipForward className="h-4 w-4" /></button>
                <button aria-label="Pause series" aria-pressed={paused.includes(t.id)} onClick={() => setPaused((p) => p.includes(t.id) ? p.filter((x) => x !== t.id) : [...p, t.id])} className="grid h-11 w-11 place-items-center"><Pause className="h-4 w-4" /></button>
                <button aria-label="Edit this or all" onClick={() => setMsg("Edit: Just this one · This and future · All")} className="grid h-11 w-11 place-items-center"><ArrowRightLeft className="h-4 w-4" /></button>
              </div>} />))}</ul>
          {msg && <p role="status" className="rounded-xl bg-muted p-2 text-sm">{msg}</p>}
        </section>
      </div>
    </Frame>
  );
}
