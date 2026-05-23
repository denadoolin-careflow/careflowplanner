import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SectionCard } from "@/components/cards/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, Check, Pencil, X, Zap } from "lucide-react";
import { toast } from "sonner";
import { todayISO, fmtMoney, CADENCES, advanceDate, daysUntil } from "@/lib/wealth-utils";
import { cn } from "@/lib/utils";

type Sub = {
  id: string;
  name: string;
  amount: number;
  cadence: string;
  next_charge_date: string | null;
  category_id: string | null;
  notes: string | null;
  status: string;
};

export function RecurringTab({ uid }: { uid: string }) {
  const [subs, setSubs] = useState<Sub[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ name: "", amount: "", cadence: "monthly", next_charge_date: todayISO(), category_id: "" });
  const [editingId, setEditingId] = useState<string | null>(null);

  async function load() {
    const [{ data: s }, { data: b }, { data: c }] = await Promise.all([
      supabase.from("subscriptions").select("*").eq("user_id", uid).order("next_charge_date"),
      supabase.from("recurring_bills").select("*").eq("user_id", uid).order("next_due_date"),
      supabase.from("budget_categories").select("*").eq("user_id", uid).order("sort_order"),
    ]);
    setSubs((s ?? []) as Sub[]);
    setBills(b ?? []);
    setCats(c ?? []);
  }
  useEffect(() => { load(); }, [uid]);

  async function add() {
    if (!form.name.trim()) return toast.error("Give it a name.");
    const { error } = await supabase.from("subscriptions").insert({
      user_id: uid, name: form.name.trim(), amount: Number(form.amount) || 0,
      cadence: form.cadence, next_charge_date: form.next_charge_date || null,
      category_id: form.category_id || null,
    });
    if (error) return toast.error(error.message);
    setForm({ name: "", amount: "", cadence: "monthly", next_charge_date: todayISO(), category_id: "" });
    load();
  }

  async function saveEdit(id: string, patch: Partial<Sub>) {
    const { error } = await supabase.from("subscriptions").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    setEditingId(null);
    load();
  }

  async function del(id: string) {
    await supabase.from("subscriptions").delete().eq("id", id);
    load();
  }

  async function pause(s: Sub) {
    await supabase.from("subscriptions").update({ status: s.status === "paused" ? "active" : "paused" }).eq("id", s.id);
    load();
  }

  async function markCharged(s: Sub) {
    if (!s.next_charge_date) return;
    await supabase.from("transactions").insert({
      user_id: uid, date: todayISO(), amount: s.amount, kind: "expense",
      category_id: s.category_id, note: `${s.name} (subscription)`, linked_subscription_id: s.id,
    });
    const next = advanceDate(s.next_charge_date, s.cadence);
    await supabase.from("subscriptions").update({ next_charge_date: next, last_charged_at: new Date().toISOString() }).eq("id", s.id);
    toast.success(`${s.name} charged · next ${next}`);
    load();
  }

  /** Recurring engine: advance every overdue subscription & bill (creating transactions for each charge). */
  async function rollForwardAll() {
    const today = todayISO();
    let advanced = 0;
    for (const s of subs) {
      if (s.status !== "active" || !s.next_charge_date) continue;
      let nd = s.next_charge_date;
      while (nd <= today) {
        await supabase.from("transactions").insert({
          user_id: uid, date: nd, amount: s.amount, kind: "expense",
          category_id: s.category_id, note: `${s.name} (subscription)`, linked_subscription_id: s.id,
        });
        nd = advanceDate(nd, s.cadence);
        advanced++;
      }
      if (nd !== s.next_charge_date) {
        await supabase.from("subscriptions").update({ next_charge_date: nd, last_charged_at: new Date().toISOString() }).eq("id", s.id);
      }
    }
    for (const b of bills) {
      if (!b.next_due_date) continue;
      let nd = b.next_due_date;
      while (nd < today) {
        await supabase.from("transactions").insert({
          user_id: uid, date: nd, amount: b.amount, kind: "expense",
          category_id: b.category_id, note: `Paid: ${b.name}`, linked_bill_id: b.id,
        });
        nd = advanceDate(nd, b.cadence);
        advanced++;
      }
      if (nd !== b.next_due_date) {
        await supabase.from("recurring_bills").update({ next_due_date: nd, last_paid_at: new Date().toISOString() }).eq("id", b.id);
      }
    }
    toast.success(advanced > 0 ? `Caught up ${advanced} recurrence${advanced === 1 ? "" : "s"}.` : "Everything is current.");
    load();
  }

  const monthly = useMemo(() => {
    const factor: Record<string, number> = { daily: 30, weekly: 4.33, biweekly: 2.17, monthly: 1, quarterly: 1 / 3, yearly: 1 / 12 };
    return subs.filter((s) => s.status === "active").reduce((sum, s) => sum + (Number(s.amount) * (factor[s.cadence] ?? 1)), 0);
  }, [subs]);

  return (
    <div className="space-y-4">
      <SectionCard accent="calm" title="Recurring engine" subtitle="Subscriptions and bills, automatically rolled forward.">
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={rollForwardAll} variant="outline" className="gap-2">
            <Zap className="h-4 w-4" /> Catch up overdue recurrences
          </Button>
          <div className="text-xs text-muted-foreground">
            Each "catch-up" creates transactions for any missed charges and advances the next date forward.
          </div>
        </div>
      </SectionCard>

      <SectionCard accent="warm" title="Subscriptions" subtitle={`${fmtMoney(monthly)} / month equivalent`}>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-6">
          <Input className="sm:col-span-2" placeholder="Name (Netflix, Spotify…)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input type="number" step="0.01" placeholder="$" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <Select value={form.cadence} onValueChange={(v) => setForm({ ...form, cadence: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{CADENCES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
          </Select>
          <Input type="date" value={form.next_charge_date} onChange={(e) => setForm({ ...form, next_charge_date: e.target.value })} />
          <Button onClick={add}>Add</Button>
        </div>

        <ul className="mt-4 space-y-2">
          {subs.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">No subscriptions tracked yet.</p>}
          {subs.map((s) => {
            const isEditing = editingId === s.id;
            const dd = daysUntil(s.next_charge_date);
            const paused = s.status === "paused";
            return (
              <li key={s.id} className={cn("rounded-xl border border-border/60 bg-card/60 p-3", paused && "opacity-60")}>
                {isEditing ? (
                  <EditSub sub={s} cats={cats} onCancel={() => setEditingId(null)} onSave={(p) => saveEdit(s.id, p)} />
                ) : (
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium">{s.name}</span>
                        {paused && <Badge variant="outline" className="text-[10px]">Paused</Badge>}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {s.cadence} · {s.next_charge_date ?? "unscheduled"}
                        {dd !== null && (dd < 0 ? ` · ${Math.abs(dd)}d overdue` : dd === 0 ? " · today" : ` · in ${dd}d`)}
                      </div>
                    </div>
                    <div className="font-semibold tabular-nums">{fmtMoney(s.amount)}</div>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => markCharged(s)} disabled={paused}>
                        <Check className="mr-1 h-3.5 w-3.5" /> Charged
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => pause(s)}>
                        {paused ? "Resume" : "Pause"}
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingId(s.id)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => del(s.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </SectionCard>

      <SectionCard accent="sage" title="Bills overview" subtitle="Manage details in the Bills tab.">
        {bills.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">No recurring bills yet.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {bills.map((b) => (
              <li key={b.id} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                <span className="truncate">{b.name} <span className="text-xs text-muted-foreground">· {b.cadence} · {b.next_due_date ?? "—"}</span></span>
                <span className="tabular-nums">{fmtMoney(b.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}

function EditSub({ sub, cats, onCancel, onSave }: { sub: Sub; cats: any[]; onCancel: () => void; onSave: (p: Partial<Sub>) => void; }) {
  const [name, setName] = useState(sub.name);
  const [amount, setAmount] = useState(String(sub.amount));
  const [cadence, setCadence] = useState(sub.cadence);
  const [next, setNext] = useState(sub.next_charge_date ?? "");
  const [catId, setCatId] = useState(sub.category_id ?? "");
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-7">
      <Input className="sm:col-span-2" value={name} onChange={(e) => setName(e.target.value)} />
      <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
      <Select value={cadence} onValueChange={setCadence}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>{CADENCES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
      </Select>
      <Input type="date" value={next} onChange={(e) => setNext(e.target.value)} />
      <Select value={catId || "none"} onValueChange={(v) => setCatId(v === "none" ? "" : v)}>
        <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No category</SelectItem>
          {cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
        </SelectContent>
      </Select>
      <div className="flex gap-1">
        <Button size="sm" className="h-9 flex-1" onClick={() => onSave({
          name, amount: Number(amount) || 0, cadence, next_charge_date: next || null, category_id: catId || null,
        })}>Save</Button>
        <Button size="icon" variant="ghost" className="h-9 w-9" onClick={onCancel}><X className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}