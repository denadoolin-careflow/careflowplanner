import { useEffect, useMemo, useState } from "react";
import { format, isSameDay } from "date-fns";
import { useStore } from "@/lib/store";
import { Clock } from "lucide-react";

interface Slot { id: string; title: string; start: number; end: number; kind: "task" | "event" }

function toMinutes(t?: string): number | null {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h)) return null;
  return h * 60 + (m || 0);
}

function label(mins: number) {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  const am = h < 12;
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}${m ? `:${String(m).padStart(2, "0")}` : ""} ${am ? "am" : "pm"}`;
}

/**
 * A single glance line: what is happening right now, and what is next.
 * Only meaningful for the actual current day.
 */
export function NowNextCard({ date, onTaskClick }: { date: Date; onTaskClick?: (id: string) => void }) {
  const { state } = useStore();
  const [tick, setTick] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setTick(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const iso = format(date, "yyyy-MM-dd");
  const slots = useMemo<Slot[]>(() => {
    const out: Slot[] = [];
    for (const t of state.tasks) {
      if (t.done || t.dueDate !== iso) continue;
      const s = toMinutes(t.startTime);
      if (s == null) continue;
      out.push({ id: t.id, title: t.title, start: s, end: s + (t.estMinutes ?? 30), kind: "task" });
    }
    for (const a of state.appointments) {
      if (a.date !== iso || a.allDay) continue;
      const s = toMinutes(a.time);
      if (s == null) continue;
      out.push({ id: a.id, title: a.title, start: s, end: toMinutes(a.endTime) ?? s + 60, kind: "event" });
    }
    return out.sort((x, y) => x.start - y.start);
  }, [state.tasks, state.appointments, iso]);

  if (!isSameDay(date, tick) || slots.length === 0) return null;

  const nowMin = tick.getHours() * 60 + tick.getMinutes();
  const current = slots.find(s => nowMin >= s.start && nowMin < s.end) ?? null;
  const next = slots.find(s => s.start > nowMin) ?? null;

  return (
    <section
      aria-label="Now and next"
      className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl border border-border/40 bg-card/60 px-4 py-3 shadow-soft backdrop-blur-xl"
    >
      <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        <Clock className="h-3 w-3" /> Now
      </span>
      <button
        type="button"
        disabled={!current || current.kind !== "task"}
        onClick={() => current && current.kind === "task" && onTaskClick?.(current.id)}
        className="min-w-0 truncate text-left text-sm font-medium text-foreground disabled:cursor-default"
      >
        {current ? current.title : "Open space"}
      </button>
      {next && (
        <span className="ml-auto min-w-0 truncate text-xs text-muted-foreground">
          Next · {label(next.start)} — {next.title}
        </span>
      )}
    </section>
  );
}