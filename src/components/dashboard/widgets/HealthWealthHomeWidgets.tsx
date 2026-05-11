import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { LineChart, Line, ResponsiveContainer } from "recharts";

const today = () => new Date().toISOString().slice(0, 10);
const fmt = (n: number) => `$${(Number(n) || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

function useUid() {
  const [u, setU] = useState<string | null>(null);
  useEffect(() => { supabase.auth.getUser().then(({ data }) => setU(data.user?.id ?? null)); }, []);
  return u;
}

export function HealthCheckinWidget() {
  const uid = useUid();
  const [row, setRow] = useState<any>(null);
  useEffect(() => { if (!uid) return; supabase.from("health_checkins").select("*").eq("user_id", uid).eq("date", today()).maybeSingle().then(({ data }) => setRow(data)); }, [uid]);
  return (
    <div className="space-y-2 text-sm">
      {row ? (
        <>
          <div>Sleep: <strong>{row.sleep_hours ?? "—"} h</strong></div>
          <div>Water: <strong>{row.water_cups ?? "—"} cups</strong></div>
          <div>Mood: <strong>{row.mood ?? "—"}</strong></div>
          <div>Meds: <strong>{row.meds_taken ? "✓" : "—"}</strong></div>
        </>
      ) : <p className="text-muted-foreground">No check-in yet today.</p>}
      <Link to="/health" className="text-xs text-primary hover:underline">Open Health →</Link>
    </div>
  );
}

export function WeightTrendWidget() {
  const uid = useUid();
  const [logs, setLogs] = useState<any[]>([]);
  useEffect(() => { if (!uid) return; const since = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    supabase.from("weight_logs").select("*").eq("user_id", uid).gte("date", since).order("date").then(({ data }) => setLogs(data ?? [])); }, [uid]);
  const last = logs[logs.length - 1]?.weight_lb;
  return (
    <div className="flex h-full flex-col gap-2 text-sm">
      <div>Latest: <strong>{last ?? "—"} lb</strong></div>
      <div className="flex-1">
        <ResponsiveContainer><LineChart data={logs.map(l => ({ w: Number(l.weight_lb) }))}><Line type="monotone" dataKey="w" stroke="hsl(var(--primary))" dot={false} /></LineChart></ResponsiveContainer>
      </div>
    </div>
  );
}

export function MovementWeekWidget() {
  const uid = useUid();
  const [mins, setMins] = useState(0); const [goal, setGoal] = useState(150);
  useEffect(() => { if (!uid) return;
    const since = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    supabase.from("movement_logs").select("minutes").eq("user_id", uid).gte("date", since).then(({ data }) => setMins((data ?? []).reduce((s, l: any) => s + l.minutes, 0)));
    supabase.from("health_goals").select("weekly_movement_minutes").eq("user_id", uid).maybeSingle().then(({ data }) => { if (data) setGoal(data.weekly_movement_minutes); });
  }, [uid]);
  return (
    <div className="space-y-2 text-sm">
      <div><strong>{mins}</strong> / {goal} min this week</div>
      <Progress value={Math.min(100, (mins / goal) * 100)} className="h-2" />
    </div>
  );
}

export function BudgetSummaryWidget() {
  const uid = useUid();
  const [income, setIncome] = useState(0); const [expense, setExpense] = useState(0);
  useEffect(() => { if (!uid) return;
    const ms = new Date(); ms.setDate(1);
    supabase.from("transactions").select("amount,kind").eq("user_id", uid).gte("date", ms.toISOString().slice(0, 10)).then(({ data }) => {
      setIncome((data ?? []).filter((t: any) => t.kind === "income").reduce((s, t: any) => s + Number(t.amount), 0));
      setExpense((data ?? []).filter((t: any) => t.kind === "expense").reduce((s, t: any) => s + Number(t.amount), 0));
    });
  }, [uid]);
  return (
    <div className="space-y-1 text-sm">
      <div>Income: <strong className="text-emerald-500">{fmt(income)}</strong></div>
      <div>Expenses: <strong className="text-rose-500">{fmt(expense)}</strong></div>
      <div>Net: <strong>{fmt(income - expense)}</strong></div>
    </div>
  );
}

export function UpcomingBillsWidget() {
  const uid = useUid();
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => { if (!uid) return;
    const cutoff = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    Promise.all([
      supabase.from("subscriptions").select("name,amount,next_charge_date").eq("user_id", uid).lte("next_charge_date", cutoff),
      supabase.from("recurring_bills").select("name,amount,next_due_date").eq("user_id", uid).lte("next_due_date", cutoff),
    ]).then(([s, b]) => {
      const list = [
        ...(s.data ?? []).map((x: any) => ({ name: x.name, amount: x.amount, date: x.next_charge_date })),
        ...(b.data ?? []).map((x: any) => ({ name: x.name, amount: x.amount, date: x.next_due_date })),
      ].filter(x => x.date).sort((a, b) => a.date! > b.date! ? 1 : -1);
      setItems(list);
    });
  }, [uid]);
  return (
    <ul className="space-y-1 text-sm">
      {items.length === 0 && <li className="text-muted-foreground">Nothing due this week.</li>}
      {items.map((x, i) => <li key={i} className="flex justify-between"><span>{x.date} · {x.name}</span><span>{fmt(Number(x.amount))}</span></li>)}
    </ul>
  );
}

export function DebtProgressWidget() {
  const uid = useUid();
  const [total, setTotal] = useState(0); const [count, setCount] = useState(0);
  useEffect(() => { if (!uid) return;
    supabase.from("debts").select("balance").eq("user_id", uid).then(({ data }) => {
      setTotal((data ?? []).reduce((s, d: any) => s + Number(d.balance), 0));
      setCount((data ?? []).length);
    });
  }, [uid]);
  return (
    <div className="space-y-1 text-sm">
      <div className="text-2xl font-semibold">{fmt(total)}</div>
      <div className="text-xs text-muted-foreground">{count} accounts</div>
    </div>
  );
}

export function ChoreTodayWidget() {
  const uid = useUid();
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => { if (!uid) return;
    Promise.all([
      supabase.from("chore_assignments").select("*").eq("user_id", uid),
      supabase.from("household_members").select("*").eq("user_id", uid),
    ]).then(([a, m]) => {
      const wd = (new Date().getDay() + 6) % 7;
      const list = (a.data ?? []).filter((x: any) => (x.weekdays || []).includes(wd))
        .map((x: any) => ({ ...x, member: (m.data ?? []).find((mm: any) => mm.id === x.member_id) }));
      setItems(list);
    });
  }, [uid]);
  return (
    <ul className="space-y-1 text-sm">
      {items.length === 0 && <li className="text-muted-foreground">No chores today.</li>}
      {items.map(x => <li key={x.id} className="flex gap-2"><span className="w-20 text-xs text-muted-foreground">{x.member?.avatar_emoji} {x.member?.name}</span><span>{x.title}</span></li>)}
    </ul>
  );
}

export function HomeOverdueWidget() {
  const uid = useUid();
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => { if (!uid) return;
    supabase.from("home_maintenance").select("*").eq("user_id", uid).lte("next_due", today()).order("next_due").then(({ data }) => setItems(data ?? []));
  }, [uid]);
  return (
    <ul className="space-y-1 text-sm">
      {items.length === 0 && <li className="text-muted-foreground">Nothing overdue.</li>}
      {items.map(x => <li key={x.id} className="flex justify-between"><span>{x.title}</span><span className="text-xs text-rose-500">{x.next_due}</span></li>)}
    </ul>
  );
}