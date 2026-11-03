import { Fragment, useState } from "react";
import { Check, Clock } from "lucide-react";
import { PhaseIcon } from "@/lib/phase-icons";
import type { RhythmPhase } from "@/lib/planner/rhythm-phase";
import { PHASE_ORDER, PHASE_WINDOW, phaseForTime } from "@/lib/today-phase-items";
import { cn } from "@/lib/utils";

/**
 * Schedule view mockups — sample data only, nothing here touches the real planner.
 * Three concepts × Day/Week variants, all in the unified card + phase-color language.
 */

type Kind = "task" | "appt" | "meal" | "care";
interface Item { id: string; title: string; time?: string; end?: string; kind: Kind; done?: boolean }

const PHASE_LABEL: Record<RhythmPhase, string> = { plan: "Plan", grow: "Grow", care: "Care", letgo: "Let go" };
const KIND_LABEL: Record<Kind, string> = { task: "Task", appt: "Event", meal: "Meal", care: "Care" };

const DAY_ITEMS: Item[] = [
  { id: "d1", title: "Morning Reset", time: "07:30", kind: "care", done: true },
  { id: "d2", title: "Breakfast", time: "08:00", kind: "meal", done: true },
  { id: "d3", title: "Cancel Craft Docs", time: "09:00", kind: "task", done: true },
  { id: "d4", title: "Team standup", time: "09:30", end: "10:00", kind: "appt" },
  { id: "d5", title: "Water the plants", time: "10:30", kind: "task" },
  { id: "d6", title: "Lunch with Mom", time: "12:30", end: "14:00", kind: "appt" },
  { id: "d7", title: "Work on photo book", time: "14:00", kind: "task" },
  { id: "d8", title: "Pick up prescription", time: "15:30", kind: "task" },
  { id: "d9", title: "Dinner prep", time: "17:00", kind: "meal" },
  { id: "d10", title: "Evening Reflection", time: "19:30", kind: "care" },
  { id: "d11", title: "Read · The Covenant of Water", time: "21:00", kind: "task" },
];

const WEEK: { day: string; date: string; moon: string; items: Item[] }[] = [
  { day: "Mon", date: "2", moon: "🌗", items: [
    { id: "w1", title: "Vote", time: "08:00", kind: "task", done: true },
    { id: "w2", title: "Tidy up living room", time: "10:00", kind: "task", done: true },
    { id: "w3", title: "Dinner with Dan", time: "18:30", kind: "appt" },
  ]},
  { day: "Tue", date: "3", moon: "🌘", items: [
    { id: "w4", title: "Wellbutrin", time: "09:00", kind: "care", done: true },
    { id: "w5", title: "Journal", time: "21:00", kind: "task" },
  ]},
  { day: "Wed", date: "4", moon: "🌑", items: [
    { id: "w6", title: "New moon intention", time: "07:30", kind: "care" },
    { id: "w7", title: "Dentist", time: "14:00", end: "15:00", kind: "appt" },
  ]},
  { day: "Thu", date: "5", moon: "🌒", items: [
    { id: "w8", title: "Grocery run", time: "16:00", kind: "task" },
  ]},
  { day: "Fri", date: "6", moon: "🌓", items: [
    { id: "w9", title: "Pay Aspire bill", time: "09:00", kind: "task" },
    { id: "w10", title: "Movie night", time: "20:00", kind: "appt" },
  ]},
  { day: "Sat", date: "7", moon: "🌔", items: [
    { id: "w11", title: "Farmers market", time: "09:30", kind: "appt" },
    { id: "w12", title: "Meal prep", time: "15:00", kind: "task" },
  ]},
  { day: "Sun", date: "8", moon: "🌕", items: [
    { id: "w13", title: "Cancel Open AI", time: "09:00", kind: "task" },
    { id: "w14", title: "Family call", time: "17:00", kind: "appt" },
  ]},
];

const tint = (p: RhythmPhase, a = 0.4) => `hsl(var(--rhythm-${p}-tint) / ${a})`;
const deep = (p: RhythmPhase) => `hsl(var(--rhythm-${p}-deep))`;
const main = (p: RhythmPhase) => `hsl(var(--rhythm-${p}))`;
const phaseOf = (it: Item): RhythmPhase => phaseForTime(it.time) ?? "plan";
const fmt = (t?: string) => {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ap = h >= 12 ? "pm" : "am";
  return `${h % 12 || 12}${m ? `:${String(m).padStart(2, "0")}` : ""} ${ap}`;
};

/** Shared item card: rounded, soft shadow, phase edge, big tap target. */
function ItemCard({ it, phase, dense }: { it: Item; phase: RhythmPhase; dense?: boolean }) {
  return (
    <li
      className={cn(
        "flex items-center gap-2.5 rounded-xl border border-border/40 bg-card shadow-sm",
        dense ? "px-2 py-1.5" : "min-h-11 px-3 py-2",
        it.done && "opacity-60",
      )}
    >
      <span aria-hidden className="w-1 shrink-0 self-stretch rounded-full" style={{ background: main(phase) }} />
      <button
        aria-label={it.done ? "Mark not done" : "Mark done"}
        className={cn(
          "grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition-colors",
          it.done ? "border-transparent" : "border-muted-foreground/40",
        )}
        style={it.done ? { background: main(phase), borderColor: main(phase) } : undefined}
      >
        {it.done && <Check className="h-3 w-3 text-primary-foreground" />}
      </button>
      <span className="min-w-0 flex-1">
        <span className={cn("block truncate text-sm leading-snug", it.done && "line-through")}>{it.title}</span>
        {!dense && it.end && <span className="block text-xs text-muted-foreground">until {fmt(it.end)}</span>}
      </span>
      <span className="shrink-0 font-mono text-xs text-muted-foreground">{fmt(it.time)}</span>
    </li>
  );
}

/* ============ Concept 1 — Phase Timeline ============ */

function PhaseTimelineDay() {
  const nowPhase: RhythmPhase = "care";
  return (
    <div className="planner-card overflow-hidden border border-border/40">
      {PHASE_ORDER.map((p, i) => {
        const items = DAY_ITEMS.filter(it => phaseOf(it) === p);
        const isNow = p === nowPhase;
        return (
          <section
            key={p}
            aria-current={isNow ? "true" : undefined}
            className={cn("px-4 py-3", i > 0 && "border-t border-border/30")}
            style={{ background: tint(p, isNow ? 0.55 : 0.3) }}
          >
            <header className="flex items-center gap-2">
              <PhaseIcon phase={p} size="sm" />
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
  return (
    <div className="flex gap-3 overflow-x-auto overscroll-x-contain pb-1 lg:grid lg:grid-cols-7 lg:overflow-visible">
      {WEEK.map((d, di) => (
        <div key={d.day} className={cn("planner-card w-40 shrink-0 border border-border/40 p-2 lg:w-auto", di === 6 && "ring-2 ring-primary")}>
          <header className="flex items-baseline justify-between px-1">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{d.day}</span>
            <span className="font-serif text-lg">{d.date}</span>
            <span aria-hidden className="text-xs">{d.moon}</span>
          </header>
          <div className="mt-2 space-y-1">
            {PHASE_ORDER.map(p => {
              const items = d.items.filter(it => phaseOf(it) === p);
              if (!items.length) return null;
              return (
                <div key={p} className="rounded-lg px-1.5 py-1" style={{ background: tint(p, 0.35) }}>
                  <div className="flex items-center gap-1" style={{ color: deep(p) }}>
                    <PhaseIcon phase={p} size="sm" className="h-4 w-4" />
                    <span className="text-xs font-medium">{PHASE_LABEL[p]}</span>
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
  return (
    <div className="planner-card border border-border/40 p-4">
      <header className="flex items-baseline justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Sunday</p>
          <h3 className="font-serif text-2xl">November 8</h3>
        </div>
        <span aria-hidden className="text-xl">🌕</span>
      </header>
      <div className="mt-3 space-y-3">
        {PHASE_ORDER.map(p => {
          const items = DAY_ITEMS.filter(it => phaseOf(it) === p);
          if (!items.length) return null;
          return (
            <section key={p}>
              <div
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
                style={{ background: tint(p, 0.6), color: deep(p) }}
              >
                <PhaseIcon phase={p} size="sm" className="h-4 w-4" />
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
  return (
    <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-1 lg:grid lg:grid-cols-7 lg:overflow-visible">
      {WEEK.map((d, di) => (
        <div
          key={d.day}
          className={cn(
            "planner-card w-[70vw] max-w-64 shrink-0 snap-start border border-border/40 p-3 sm:w-56 lg:w-auto lg:max-w-none",
            di === 6 && "ring-2 ring-primary",
          )}
        >
          <header className="flex items-baseline gap-2">
            <span className="font-serif text-xl">{d.day}</span>
            <span className="text-sm text-muted-foreground">{d.date}</span>
            <span aria-hidden className="ml-auto text-sm">{d.moon}</span>
          </header>
          <ul className="mt-2 space-y-1.5">
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
  const p = phaseOf(it);
  return (
    <li className="flex gap-3">
      <div className="flex w-14 shrink-0 flex-col items-end pt-2.5">
        <span className="font-mono text-sm font-medium">{fmt(it.time)}</span>
        {it.end && <span className="font-mono text-xs text-muted-foreground">{fmt(it.end)}</span>}
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
            aria-label={it.done ? "Mark not done" : "Mark done"}
            className={cn("grid h-5 w-5 shrink-0 place-items-center rounded-full border-2", it.done ? "border-transparent" : "border-muted-foreground/40")}
            style={it.done ? { background: main(p) } : undefined}
          >
            {it.done && <Check className="h-3 w-3 text-primary-foreground" />}
          </button>
          <span className={cn("min-w-0 flex-1 truncate text-sm", it.done && "line-through")}>{it.title}</span>
          <span className="shrink-0 rounded-full px-1.5 py-0.5 text-xs" style={{ background: tint(p, 0.5), color: deep(p) }}>
            {KIND_LABEL[it.kind]}
          </span>
        </div>
      </div>
    </li>
  );
}

function AgendaRibbonDay() {
  const sorted = [...DAY_ITEMS].sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));
  let prevPhase: RhythmPhase | null = null;
  return (
    <div className="planner-card border border-border/40 p-4">
      <ul>
        {sorted.map((it, i) => {
          const p = phaseOf(it);
          const showDivider = p !== prevPhase;
          prevPhase = p;
          return (
            <div key={it.id}>
              {showDivider && (
                <div className="flex items-center gap-2 py-1.5 pl-14">
                  <PhaseIcon phase={p} size="sm" className="h-4 w-4" />
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
  return (
    <div className="planner-card border border-border/40 p-4">
      {WEEK.map((d, di) => (
        <section key={d.day} className={cn(di > 0 && "mt-4 border-t border-border/30 pt-3")}>
          <header className="flex items-baseline gap-2 pl-14">
            <h3 className="font-serif text-lg">{d.day} {d.date}</h3>
            <span aria-hidden className="text-sm">{d.moon}</span>
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
  const nowPhase: RhythmPhase = "care";
  const [items, setItems] = useState(DAY_ITEMS);
  const toggle = (id: string) => setItems(xs => xs.map(x => (x.id === id ? { ...x, done: !x.done } : x)));
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
              <span className="grid h-9 w-9 place-items-center rounded-full" style={{ background: main(p), color: "hsl(var(--rhythm-on))" }}>
                <PhaseIcon phase={p} className="h-4 w-4" />
              </span>
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
            <button className="mt-auto min-h-11 rounded-xl border border-dashed px-3 text-left text-sm" style={{ borderColor: main(p), color: deep(p) }}>
              + Add to {PHASE_LABEL[p]}
            </button>
          </section>
        );
      })}
    </div>
  );
}

function PhaseGridWeek() {
  const todayIdx = 1;
  return (
    <>
      {/* Desktop/tablet: days across, phases down */}
      <div className="planner-card hidden overflow-hidden p-3 md:block">
        <div className="grid gap-1.5" style={{ gridTemplateColumns: "88px repeat(7, minmax(0,1fr))" }}>
          <div />
          {WEEK.map((d, i) => (
            <div key={d.day} className={cn("rounded-xl py-1.5 text-center", i === todayIdx && "bg-primary text-primary-foreground")}>
              <div className="text-xs uppercase tracking-wide">{d.day}</div>
              <div className="font-serif text-lg leading-none">{d.date}</div>
            </div>
          ))}
          {PHASE_ORDER.map(p => (
            <Fragment key={p}>
              <div className="flex items-center gap-1.5 text-sm font-medium" style={{ color: deep(p) }}>
                <PhaseIcon phase={p} className="h-4 w-4" />{PHASE_LABEL[p]}
              </div>
              {WEEK.map((d, i) => {
                const list = d.items.filter(it => phaseOf(it) === p);
                return (
                  <div
                    key={`${p}-${d.day}`}
                    className="min-h-20 rounded-xl p-1.5"
                    style={{ background: tint(p, i === todayIdx ? 0.7 : 0.35), outline: i === todayIdx ? `1px solid ${main(p)}` : undefined }}
                  >
                    {list.slice(0, 2).map(it => (
                      <div key={it.id} className={cn("mb-1 rounded-lg bg-card px-1.5 py-1 text-xs leading-snug shadow-sm break-words", it.done && "line-through opacity-60")}>
                        {it.title}
                      </div>
                    ))}
                    {list.length > 2 && <div className="text-xs font-medium" style={{ color: deep(p) }}>+{list.length - 2} more</div>}
                  </div>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>
      {/* Phone: one card per day, swipe sideways */}
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-4 pb-2 md:hidden">
        {WEEK.map((d, i) => (
          <section key={d.day} className={cn("planner-card w-[82%] shrink-0 snap-start p-4", i === todayIdx && "ring-2 ring-primary")}>
            <h3 className="mb-3 font-serif text-xl">{d.day} {d.date} <span aria-hidden>{d.moon}</span></h3>
            <div className="grid grid-cols-2 gap-2">
              {PHASE_ORDER.map(p => {
                const list = d.items.filter(it => phaseOf(it) === p);
                return (
                  <div key={p} className="min-h-24 rounded-xl p-2" style={{ background: tint(p, 0.5) }}>
                    <div className="mb-1 flex items-center gap-1 text-xs font-semibold" style={{ color: deep(p) }}>
                      <PhaseIcon phase={p} className="h-3.5 w-3.5" />{PHASE_LABEL[p]}
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

/* ============ Page ============ */

const CONCEPTS = [
  { id: "timeline", name: "1 · Phase Timeline", blurb: "The day as four tinted phase sections; the week as mini phase bands per day." },
  { id: "cards", name: "2 · Day Cards", blurb: "Each day is its own card with phase pill groupings; swipe sideways through the week." },
  { id: "ribbon", name: "3 · Agenda Ribbon", blurb: "A calm vertical agenda — times on a rail, a colored thread connecting the day." },
  { id: "grid", name: "4 · Phase Grid", blurb: "The day as a 2×2 grid of phase cards; the week as days across and phases down." },
] as const;

type ConceptId = (typeof CONCEPTS)[number]["id"];

export default function ScheduleMockups() {
  const [concept, setConcept] = useState<ConceptId>("timeline");
  const [scope, setScope] = useState<"day" | "week">("day");
  const active = CONCEPTS.find(c => c.id === concept)!;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 pb-28">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Preview only · sample data · your planner is unchanged</p>
      <h1 className="mt-1 font-serif text-3xl">Schedule view mockups</h1>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {CONCEPTS.map(c => (
          <button
            key={c.id}
            onClick={() => setConcept(c.id)}
            aria-pressed={concept === c.id}
            className={cn(
              "min-h-11 rounded-full border px-4 text-sm font-medium transition-colors",
              concept === c.id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border/60 bg-card text-foreground hover:border-primary/40",
            )}
          >
            {c.name}
          </button>
        ))}
        <span className="ml-auto inline-flex rounded-full border border-border/60 bg-card p-0.5">
          {(["day", "week"] as const).map(s => (
            <button
              key={s}
              onClick={() => setScope(s)}
              aria-pressed={scope === s}
              className={cn(
                "min-h-10 rounded-full px-4 text-sm font-medium capitalize transition-colors",
                scope === s ? "bg-primary text-primary-foreground" : "text-muted-foreground",
              )}
            >
              {s}
            </button>
          ))}
        </span>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{active.blurb}</p>

      <div className="mt-4">
        {concept === "timeline" && (scope === "day" ? <PhaseTimelineDay /> : <PhaseTimelineWeek />)}
        {concept === "cards" && (scope === "day" ? <DayCardsDay /> : <DayCardsWeek />)}
        {concept === "ribbon" && (scope === "day" ? <AgendaRibbonDay /> : <AgendaRibbonWeek />)}
        {concept === "grid" && (scope === "day" ? <PhaseGridDay /> : <PhaseGridWeek />)}
      </div>

      <p className="mt-6 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Clock className="h-3.5 w-3.5" aria-hidden />
        Tell me which concept you like and what to change — then I'll build it into the real planner.
      </p>
    </div>
  );
}
