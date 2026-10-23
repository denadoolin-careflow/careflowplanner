import { useMemo, useState } from "react";
import { addDays, endOfMonth, format, getDay, isSameDay, startOfMonth, startOfWeek } from "date-fns";
import { getMoonPhase, MOON_RITUALS } from "@/lib/astro-suite/lunar";
import { lunarRhythmAt } from "@/lib/cosmic/lunar-rhythm";
import { phaseStyle } from "@/components/today/day-context";
import { cn } from "@/lib/utils";

/** Temporary preview: three simpler phone month-view options. Sample items are illustrative. */
const SAMPLE: Record<number, string[]> = { 3: ["Dr. visit 10am"], 7: ["Pick up meds", "Call mom"], 12: ["Grocery run"], 18: ["Family dinner"], 22: ["Bills due", "Laundry", "Yoga"], 27: ["Planning hour"] };

export default function MonthMockups() {
  const today = new Date();
  const month = startOfMonth(today);
  const days = useMemo(() => {
    const start = startOfWeek(month);
    return Array.from({ length: 42 }, (_, i) => addDays(start, i)).filter((d, i) => i < 35 || d <= endOfMonth(month));
  }, [month]);
  const items = (d: Date) => (d.getMonth() === month.getMonth() ? SAMPLE[d.getDate()] ?? [] : []);

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      <header>
        <h2 className="font-display text-2xl">Month view on phone: 3 options</h2>
        <p className="text-sm text-muted-foreground">Preview only. Sample events are made up. Pick A, B or C.</p>
      </header>
      <div className="grid gap-6 md:grid-cols-3">
        <Phone label="A · Clean grid"><CleanGrid days={days} month={month} today={today} items={items} /></Phone>
        <Phone label="B · Agenda list"><Agenda month={month} today={today} items={items} /></Phone>
        <Phone label="C · Week strip + mini month"><WeekStrip days={days} month={month} today={today} items={items} /></Phone>
      </div>
    </div>
  );
}

function Phone({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="mx-auto w-full max-w-[360px]">
      <p className="mb-2 text-center text-sm font-semibold text-foreground">{label}</p>
      <div className="h-[640px] overflow-y-auto rounded-[2rem] border-4 border-border bg-background p-3 shadow-lg">{children}</div>
    </section>
  );
}

const Moon = ({ d }: { d: Date }) => <span aria-hidden>{MOON_RITUALS[getMoonPhase(d)].glyph}</span>;
const PhaseBar = ({ d }: { d: Date }) => { const c = phaseStyle(lunarRhythmAt(d)); return <span className="h-1 w-full rounded-full" style={{ background: c.light }} />; };

type P = { month: Date; today: Date; items: (d: Date) => string[] };

function CleanGrid({ days, month, today, items }: P & { days: Date[] }) {
  const [sel, setSel] = useState(today);
  return (
    <div>
      <p className="mb-2 font-display text-xl">{format(month, "MMMM")}</p>
      <div className="grid grid-cols-7 text-center text-[11px] text-muted-foreground">{["S","M","T","W","T","F","S"].map((d, i) => <span key={i}>{d}</span>)}</div>
      <div className="mt-1 grid grid-cols-7 gap-y-1">
        {days.map(d => {
          const out = d.getMonth() !== month.getMonth(); const n = items(d).length;
          return (
            <button key={d.toISOString()} onClick={() => setSel(d)} className={cn("flex h-12 flex-col items-center justify-center gap-1 rounded-xl text-sm", out && "opacity-30", isSameDay(d, sel) && "bg-primary text-primary-foreground", isSameDay(d, today) && !isSameDay(d, sel) && "ring-1 ring-primary")}>
              {d.getDate()}
              <span className="flex h-1.5 gap-0.5">{Array.from({ length: Math.min(n, 3) }).map((_, i) => <span key={i} className={cn("h-1.5 w-1.5 rounded-full", isSameDay(d, sel) ? "bg-primary-foreground" : "bg-primary")} />)}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-3 rounded-2xl border border-border/60 bg-card p-3">
        <p className="text-sm font-semibold"><Moon d={sel} /> {format(sel, "EEEE, MMM d")}</p>
        {items(sel).length ? <ul className="mt-2 space-y-1.5 text-sm">{items(sel).map(t => <li key={t} className="rounded-lg bg-muted/50 px-2 py-2">{t}</li>)}</ul> : <p className="mt-2 text-sm text-muted-foreground">Nothing planned. A gentle day.</p>}
      </div>
    </div>
  );
}

function Agenda({ month, today, items }: P) {
  const all = Array.from({ length: endOfMonth(month).getDate() }, (_, i) => addDays(month, i));
  const busy = all.filter(d => items(d).length || isSameDay(d, today));
  return (
    <div>
      <p className="mb-3 font-display text-xl">{format(month, "MMMM")}</p>
      <ol className="space-y-2">
        {busy.map(d => (
          <li key={d.toISOString()} className={cn("flex gap-3 rounded-2xl border border-border/60 bg-card p-3", isSameDay(d, today) && "border-primary")}>
            <div className="w-10 shrink-0 text-center">
              <p className="text-[11px] uppercase text-muted-foreground">{format(d, "EEE")}</p>
              <p className="font-display text-xl leading-none">{d.getDate()}</p>
              <p className="mt-1 text-sm"><Moon d={d} /></p>
            </div>
            <ul className="min-w-0 flex-1 space-y-1 text-sm">{items(d).length ? items(d).map(t => <li key={t}>{t}</li>) : <li className="text-muted-foreground">Today · nothing planned</li>}</ul>
          </li>
        ))}
      </ol>
    </div>
  );
}

function WeekStrip({ days, month, today, items }: P & { days: Date[] }) {
  const [sel, setSel] = useState(today);
  const week = Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(sel), i));
  return (
    <div>
      <div className="rounded-2xl border border-border/60 bg-card p-2">
        <p className="mb-1 px-1 text-xs font-semibold text-muted-foreground">{format(month, "MMMM")}</p>
        <div className="grid grid-cols-7 gap-0.5 text-center text-[10px]">
          {days.map(d => (
            <button key={d.toISOString()} onClick={() => setSel(d)} className={cn("h-6 rounded-md", d.getMonth() !== month.getMonth() && "opacity-30", isSameDay(d, sel) && "bg-primary text-primary-foreground", items(d).length && !isSameDay(d, sel) && "font-bold text-primary")}>{d.getDate()}</button>
          ))}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-7 gap-1">
        {week.map(d => (
          <button key={d.toISOString()} onClick={() => setSel(d)} className={cn("flex flex-col items-center gap-1 rounded-xl py-2", isSameDay(d, sel) ? "bg-primary text-primary-foreground" : "bg-muted/40")}>
            <span className="text-[10px] uppercase">{format(d, "EEEEE")}</span>
            <span className="text-base font-semibold">{d.getDate()}</span>
            <Moon d={d} />
            <PhaseBar d={d} />
          </button>
        ))}
      </div>
      <div className="mt-3 space-y-2">
        {week.map(d => (
          <div key={d.toISOString()} className={cn("rounded-xl border border-border/50 bg-card px-3 py-2", getDay(d) === getDay(sel) && "border-primary")}>
            <p className="text-xs font-semibold text-muted-foreground">{format(d, "EEE d")}</p>
            <p className="text-sm">{items(d).join(" · ") || "—"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
