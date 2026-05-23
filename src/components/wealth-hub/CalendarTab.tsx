import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SectionCard } from "@/components/cards/SectionCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, CalendarClock, Repeat, PiggyBank, TrendingDown, ArrowDownCircle, Receipt } from "lucide-react";
import { fmtMoney, advanceDate } from "@/lib/wealth-utils";
import { cn } from "@/lib/utils";

type EventKind = "bill" | "subscription" | "goal" | "income" | "debt" | "expense";
type WEvent = {
  id: string;
  date: string; // yyyy-mm-dd
  kind: EventKind;
  title: string;
  amount: number;
  meta?: string;
};

const KIND_STYLES: Record<EventKind, { bg: string; ring: string; icon: any; label: string }> = {
  bill:         { bg: "bg-amber-500/15 text-amber-700 dark:text-amber-200",  ring: "border-amber-500/30",  icon: CalendarClock,    label: "Bill" },
  subscription: { bg: "bg-violet-500/15 text-violet-700 dark:text-violet-200", ring: "border-violet-500/30", icon: Repeat,           label: "Subscription" },
  goal:         { bg: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-200", ring: "border-emerald-500/30", icon: PiggyBank,    label: "Savings" },
  income:       { bg: "bg-sky-500/15 text-sky-700 dark:text-sky-200",      ring: "border-sky-500/30",    icon: ArrowDownCircle,  label: "Income" },
  debt:         { bg: "bg-rose-500/15 text-rose-700 dark:text-rose-200",   ring: "border-rose-500/30",   icon: TrendingDown,     label: "Debt" },
  expense:      { bg: "bg-muted text-muted-foreground",                     ring: "border-border/60",     icon: Receipt,          label: "Expense" },
};

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }
function isoDay(d: Date) { return d.toISOString().slice(0, 10); }
function sameDay(a: Date, b: Date) { return a.toDateString() === b.toDateString(); }

function expandRecurring(startISO: string, cadence: string, fromISO: string, toISO: string): string[] {
  if (!startISO) return [];
  const out: string[] = [];
  let cur = startISO;
  // rewind to or before window
  let guard = 0;
  // forward roll: collect occurrences within window
  while (cur < fromISO && guard++ < 400) cur = advanceDate(cur, cadence);
  guard = 0;
  while (cur <= toISO && guard++ < 400) {
    if (cur >= fromISO) out.push(cur);
    cur = advanceDate(cur, cadence);
  }
  // also include the original date if it's in window (handles past-due)
  if (startISO >= fromISO && startISO <= toISO && !out.includes(startISO)) out.unshift(startISO);
  return out;
}

export function CalendarTab({ uid }: { uid: string }) {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [events, setEvents] = useState<WEvent[]>([]);
  const [selected, setSelected] = useState<string | null>(isoDay(new Date()));

  // Pull a slightly extended window so neighboring days from prev/next month render.
  const windowStart = useMemo(() => {
    const d = new Date(cursor); d.setDate(1); d.setDate(d.getDate() - 7); return d;
  }, [cursor]);
  const windowEnd = useMemo(() => {
    const d = endOfMonth(cursor); d.setDate(d.getDate() + 7); return d;
  }, [cursor]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const fromISO = isoDay(windowStart);
      const toISO = isoDay(windowEnd);
      const [bills, subs, goals, txs] = await Promise.all([
        supabase.from("recurring_bills").select("id,name,amount,cadence,next_due_date,status").eq("user_id", uid),
        supabase.from("subscriptions").select("id,name,amount,cadence,next_charge_date,status").eq("user_id", uid),
        supabase.from("savings_goals").select("id,name,contribution_amount,contribution_cadence,target_date,target_amount,current_amount,status").eq("user_id", uid),
        supabase.from("transactions").select("id,date,amount,kind,note").eq("user_id", uid).gte("date", fromISO).lte("date", toISO),
      ]);
      if (cancelled) return;

      const list: WEvent[] = [];

      (bills.data ?? []).forEach((b: any) => {
        if (!b.next_due_date || b.status === "paused") return;
        const dates = expandRecurring(b.next_due_date, b.cadence, fromISO, toISO);
        dates.forEach((d) => list.push({
          id: `bill-${b.id}-${d}`, date: d, kind: "bill",
          title: b.name, amount: Number(b.amount) || 0,
        }));
      });

      (subs.data ?? []).forEach((s: any) => {
        if (!s.next_charge_date || s.status === "paused") return;
        const dates = expandRecurring(s.next_charge_date, s.cadence, fromISO, toISO);
        dates.forEach((d) => list.push({
          id: `sub-${s.id}-${d}`, date: d, kind: "subscription",
          title: s.name, amount: Number(s.amount) || 0,
        }));
      });

      (goals.data ?? []).forEach((g: any) => {
        if (g.contribution_amount && g.contribution_cadence && g.status === "active") {
          // anchor recurring contributions on today
          const dates = expandRecurring(isoDay(new Date()), g.contribution_cadence, fromISO, toISO);
          dates.forEach((d) => list.push({
            id: `goal-${g.id}-${d}`, date: d, kind: "goal",
            title: `Save → ${g.name}`, amount: Number(g.contribution_amount) || 0,
          }));
        }
        if (g.target_date && g.target_date >= fromISO && g.target_date <= toISO) {
          list.push({
            id: `goal-target-${g.id}`, date: g.target_date, kind: "goal",
            title: `🎯 ${g.name} target`,
            amount: Math.max(0, Number(g.target_amount || 0) - Number(g.current_amount || 0)),
            meta: "Target date",
          });
        }
      });

      (txs.data ?? []).forEach((t: any) => {
        const kind: EventKind = t.kind === "income" ? "income" : "expense";
        list.push({
          id: `tx-${t.id}`, date: t.date, kind,
          title: t.note || (kind === "income" ? "Income" : "Expense"),
          amount: Number(t.amount) || 0,
        });
      });

      setEvents(list);
    }
    load();
    return () => { cancelled = true; };
  }, [uid, windowStart, windowEnd]);

  const byDay = useMemo(() => {
    const map = new Map<string, WEvent[]>();
    events.forEach((e) => {
      const arr = map.get(e.date) ?? [];
      arr.push(e);
      map.set(e.date, arr);
    });
    return map;
  }, [events]);

  // build month grid
  const monthCells = useMemo(() => {
    const first = startOfMonth(cursor);
    const startWeekday = first.getDay(); // 0=Sun
    const gridStart = new Date(first);
    gridStart.setDate(first.getDate() - startWeekday);
    const cells: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      cells.push(d);
    }
    return cells;
  }, [cursor]);

  const monthLabel = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const today = new Date();
  const selectedEvents = selected ? (byDay.get(selected) ?? []) : [];

  const monthSummary = useMemo(() => {
    const inMonth = events.filter((e) => {
      const d = new Date(e.date + "T00:00:00");
      return d.getMonth() === cursor.getMonth() && d.getFullYear() === cursor.getFullYear();
    });
    const income = inMonth.filter((e) => e.kind === "income").reduce((s, e) => s + e.amount, 0);
    const out = inMonth
      .filter((e) => ["bill", "subscription", "goal", "debt", "expense"].includes(e.kind))
      .reduce((s, e) => s + e.amount, 0);
    return { income, out, count: inMonth.length };
  }, [events, cursor]);

  return (
    <div className="space-y-4">
      <SectionCard
        title="Money calendar"
        subtitle="Bills, paydays, savings, and subscriptions — at a glance."
        accent="calm"
        action={
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0"
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { const t = new Date(); setCursor(startOfMonth(t)); setSelected(isoDay(t)); }}>
              Today
            </Button>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0"
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        }
      >
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-display text-lg">{monthLabel}</h3>
          <p className="text-xs text-muted-foreground">
            <span className="text-sky-600 dark:text-sky-300">+{fmtMoney(monthSummary.income)}</span>
            {"  ·  "}
            <span className="text-rose-600 dark:text-rose-300">−{fmtMoney(monthSummary.out)}</span>
            {"  ·  "}{monthSummary.count} events
          </p>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-wide text-muted-foreground">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="py-1">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {monthCells.map((d) => {
            const iso = isoDay(d);
            const inMonth = d.getMonth() === cursor.getMonth();
            const isToday = sameDay(d, today);
            const isSel = selected === iso;
            const dayEvents = byDay.get(iso) ?? [];
            const kinds = Array.from(new Set(dayEvents.map((e) => e.kind)));
            return (
              <button
                key={iso}
                onClick={() => setSelected(iso)}
                className={cn(
                  "group relative flex min-h-[64px] flex-col items-start gap-1 rounded-lg border p-1.5 text-left transition",
                  inMonth ? "bg-card/40" : "bg-muted/20 text-muted-foreground/60",
                  isSel ? "border-primary/50 ring-1 ring-primary/30" : "border-border/40 hover:border-border/80",
                  isToday && !isSel && "border-primary/40",
                )}
              >
                <span className={cn("text-xs tabular-nums", isToday && "font-semibold text-primary")}>
                  {d.getDate()}
                </span>
                <div className="flex flex-wrap gap-0.5">
                  {kinds.slice(0, 4).map((k) => {
                    const style = KIND_STYLES[k];
                    return <span key={k} className={cn("h-1.5 w-1.5 rounded-full", style.bg.split(" ")[0])} />;
                  })}
                </div>
                {dayEvents.length > 0 && (
                  <span className="absolute right-1 top-1 text-[9px] tabular-nums text-muted-foreground">
                    {dayEvents.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
          {(Object.keys(KIND_STYLES) as EventKind[]).map((k) => {
            const s = KIND_STYLES[k];
            return (
              <span key={k} className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5", s.ring, s.bg)}>
                <span className="h-1.5 w-1.5 rounded-full bg-current" /> {s.label}
              </span>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard
        title={selected
          ? new Date(selected + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })
          : "Select a day"}
        subtitle={selectedEvents.length === 0 ? "Nothing scheduled — a quiet day for your money." : `${selectedEvents.length} event${selectedEvents.length === 1 ? "" : "s"}`}
        accent="calm"
      >
        <div className="space-y-2">
          {selectedEvents.length === 0 && selected && (
            <p className="text-sm text-muted-foreground">Use the other tabs to add a bill, goal, or transaction for this day.</p>
          )}
          {selectedEvents.map((e) => {
            const style = KIND_STYLES[e.kind];
            const Icon = style.icon;
            const isIn = e.kind === "income";
            return (
              <div key={e.id} className={cn("flex items-center justify-between gap-3 rounded-lg border p-3", style.ring, style.bg)}>
                <div className="flex min-w-0 items-center gap-2">
                  <Icon className="h-4 w-4 shrink-0" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{e.title}</p>
                    <p className="text-[10px] uppercase tracking-wide opacity-70">{style.label}{e.meta ? ` · ${e.meta}` : ""}</p>
                  </div>
                </div>
                {e.amount > 0 && (
                  <span className="shrink-0 font-mono text-sm tabular-nums">
                    {isIn ? "+" : "−"}{fmtMoney(e.amount)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}