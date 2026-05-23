import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SectionCard } from "@/components/cards/SectionCard";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend, BarChart, Bar,
} from "recharts";
import { fmtMoney } from "@/lib/wealth-utils";
import { Sparkles, TrendingUp, Heart } from "lucide-react";

const PALETTE = ["#a7c4a0", "#c9b99a", "#a8c0c8", "#d4b5d4", "#e8c5a0", "#b8a0c8", "#9bbfa3", "#caa8a8"];

type Tx = { id: string; date: string; amount: number; kind: string; category_id: string | null; note: string | null };
type Cat = { id: string; name: string; color: string | null; kind: string };

function monthKey(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; }
function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "short" });
}

export function AnalyticsTab({ uid }: { uid: string }) {
  const [txs, setTxs] = useState<Tx[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [review, setReview] = useState({ wins: "", lessons: "", next_month_focus: "", gratitude: "" });
  const [reviewId, setReviewId] = useState<string | null>(null);
  const currentMonthKey = monthKey(new Date());
  const monthStartISO = `${currentMonthKey}-01`;

  async function load() {
    const since = new Date(); since.setMonth(since.getMonth() - 5); since.setDate(1);
    const [t, c, r] = await Promise.all([
      supabase.from("transactions").select("id,date,amount,kind,category_id,note")
        .eq("user_id", uid).gte("date", since.toISOString().slice(0, 10))
        .order("date", { ascending: true }),
      supabase.from("budget_categories").select("id,name,color,kind").eq("user_id", uid),
      supabase.from("monthly_reviews").select("*").eq("user_id", uid).eq("month", monthStartISO).maybeSingle(),
    ]);
    setTxs((t.data ?? []) as Tx[]);
    setCats((c.data ?? []) as Cat[]);
    if (r.data) {
      setReviewId(r.data.id);
      setReview({
        wins: r.data.wins ?? "", lessons: r.data.lessons ?? "",
        next_month_focus: r.data.next_month_focus ?? "", gratitude: r.data.gratitude ?? "",
      });
    }
  }
  useEffect(() => { load(); }, [uid]);

  // Last 6 months income vs expense
  const monthly = useMemo(() => {
    const map = new Map<string, { month: string; income: number; expense: number; net: number }>();
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const k = monthKey(d);
      map.set(k, { month: monthLabel(k), income: 0, expense: 0, net: 0 });
    }
    txs.forEach((t) => {
      const k = t.date.slice(0, 7);
      const row = map.get(k);
      if (!row) return;
      const amt = Number(t.amount) || 0;
      if (t.kind === "income") row.income += amt;
      else row.expense += amt;
    });
    return Array.from(map.values()).map((r) => ({ ...r, net: r.income - r.expense }));
  }, [txs]);

  // This month spending by category
  const byCategory = useMemo(() => {
    const totals = new Map<string, number>();
    txs.filter((t) => t.date.startsWith(currentMonthKey) && t.kind !== "income")
      .forEach((t) => {
        const key = t.category_id ?? "uncategorized";
        totals.set(key, (totals.get(key) ?? 0) + (Number(t.amount) || 0));
      });
    return Array.from(totals.entries())
      .map(([id, value], i) => {
        const cat = cats.find((c) => c.id === id);
        return {
          name: cat?.name ?? "Uncategorized",
          value: Math.round(value * 100) / 100,
          fill: cat?.color || PALETTE[i % PALETTE.length],
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [txs, cats, currentMonthKey]);

  // Spending rhythm (heatmap by weekday across last 6mo)
  const weekdayBars = useMemo(() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const totals = days.map((d) => ({ day: d, amount: 0 }));
    txs.filter((t) => t.kind !== "income").forEach((t) => {
      const wd = new Date(t.date + "T00:00:00").getDay();
      totals[wd].amount += Number(t.amount) || 0;
    });
    return totals.map((r) => ({ ...r, amount: Math.round(r.amount * 100) / 100 }));
  }, [txs]);

  // Gentle health summary
  const health = useMemo(() => {
    const tm = monthly[monthly.length - 1];
    if (!tm) return { tone: "neutral", message: "Add a few transactions to see your rhythm." };
    if (tm.income === 0 && tm.expense === 0) return { tone: "neutral", message: "A quiet month so far — nothing to report yet." };
    if (tm.net >= 0) {
      return { tone: "warm", message: `You're keeping ${fmtMoney(tm.net)} this month. Beautiful work — that's space to breathe.` };
    }
    const ratio = tm.expense / Math.max(1, tm.income);
    if (ratio < 1.1) return { tone: "calm", message: `Spending is close to income this month. A small adjustment could create a buffer.` };
    return { tone: "gentle", message: `Expenses are running ahead this month. Be kind to yourself — small shifts add up.` };
  }, [monthly]);

  async function saveReview() {
    const payload = { user_id: uid, month: monthStartISO, ...review };
    const { error } = reviewId
      ? await supabase.from("monthly_reviews").update(payload).eq("id", reviewId)
      : await supabase.from("monthly_reviews").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Reflection saved 🌿");
    load();
  }

  return (
    <div className="space-y-4">
      {/* Gentle health summary */}
      <SectionCard
        title="Budget health"
        subtitle="A soft snapshot — not a verdict."
        accent="calm"
      >
        <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <Sparkles className="mt-0.5 h-5 w-5 text-primary" />
          <p className="text-sm leading-relaxed">{health.message}</p>
        </div>
      </SectionCard>

      {/* Income vs expenses area */}
      <SectionCard title="Flow over time" subtitle="The last six months of income and spending." accent="calm">
        <div className="h-64 w-full">
          <ResponsiveContainer>
            <AreaChart data={monthly} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7dc8a6" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="#7dc8a6" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#d8a5a5" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="#d8a5a5" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => `$${Math.round(v / 1000)}k`} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
                formatter={(v: any) => fmtMoney(Number(v))}
              />
              <Area type="monotone" dataKey="income" stroke="#5fae89" strokeWidth={2} fill="url(#incomeGrad)" name="Income" />
              <Area type="monotone" dataKey="expense" stroke="#c87878" strokeWidth={2} fill="url(#expenseGrad)" name="Expenses" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Category pie */}
        <SectionCard title="This month by category" accent="calm">
          {byCategory.length === 0 ? (
            <p className="text-sm text-muted-foreground">No spending logged this month yet.</p>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={byCategory} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>
                    {byCategory.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} stroke="hsl(var(--background))" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
                    formatter={(v: any) => fmtMoney(Number(v))}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>

        {/* Weekday rhythm */}
        <SectionCard title="Spending rhythm" subtitle="Which days of the week tend to be heavier." accent="calm">
          <div className="h-64 w-full">
            <ResponsiveContainer>
              <BarChart data={weekdayBars} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="weekdayGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a8c0c8" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#a8c0c8" stopOpacity={0.3} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => `$${Math.round(v)}`} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
                  formatter={(v: any) => fmtMoney(Number(v))}
                />
                <Bar dataKey="amount" fill="url(#weekdayGrad)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      {/* Monthly reflection */}
      <SectionCard
        title="Monthly reflection"
        subtitle="A gentle pause to honor what this month has been."
        accent="calm"
      >
        <div className="space-y-3">
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5" /> What went well financially?
            </label>
            <Textarea rows={2} placeholder="A small win, a moment of restraint, a generous choice…"
              value={review.wins} onChange={(e) => setReview({ ...review, wins: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">What did you notice or learn?</label>
            <Textarea rows={2} placeholder="Patterns, triggers, surprises…"
              value={review.lessons} onChange={(e) => setReview({ ...review, lessons: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Heart className="h-3.5 w-3.5" /> What are you grateful for around money this month?
            </label>
            <Textarea rows={2} value={review.gratitude} onChange={(e) => setReview({ ...review, gratitude: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">One soft focus for next month</label>
            <Textarea rows={2} placeholder="A single, kind intention — not a rule."
              value={review.next_month_focus} onChange={(e) => setReview({ ...review, next_month_focus: e.target.value })} />
          </div>
          <div className="flex items-center justify-between gap-2">
            <Badge variant="outline" className="font-normal">
              {new Date(monthStartISO + "T00:00:00").toLocaleDateString(undefined, { month: "long", year: "numeric" })}
            </Badge>
            <Button size="sm" onClick={saveReview}>Save reflection</Button>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}