import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SectionCard } from "@/components/cards/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Check, Trash2, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { todayISO, fmtMoney, CADENCES, advanceDate, billStatus, daysUntil, gentleBillCopy } from "@/lib/wealth-utils";
import { cn } from "@/lib/utils";

type Bill = {
  id: string;
  name: string;
  amount: number;
  cadence: string;
  next_due_date: string | null;
  category_id: string | null;
  notes: string | null;
  auto_create_task: boolean | null;
};

type Filter = "all" | "upcoming" | "overdue" | "paid";

function StatusPill({ s }: { s: ReturnType<typeof billStatus> }) {
  const map: Record<typeof s, string> = {
    upcoming: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/20",
    "due-soon": "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
    overdue: "bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-500/25",
    scheduled: "bg-muted text-muted-foreground border-border/60",
  };
  const label = s === "due-soon" ? "Due soon" : s.charAt(0).toUpperCase() + s.slice(1);
  return <Badge variant="outline" className={cn("text-[10px] uppercase tracking-wide", map[s])}>{label}</Badge>;
}

export function BillsTab({ uid }: { uid: string }) {
  const [bills, setBills] = useState<Bill[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [filter, setFilter] = useState<Filter>("upcoming");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({ name: "", amount: "", cadence: "monthly", next_due_date: todayISO(), category_id: "", notes: "" });

  async function load() {
    const [{ data: b }, { data: c }] = await Promise.all([
      supabase.from("recurring_bills").select("*").eq("user_id", uid).order("next_due_date"),
      supabase.from("budget_categories").select("*").eq("user_id", uid).order("sort_order"),
    ]);
    setBills((b ?? []) as Bill[]);
    setCats(c ?? []);
  }
  useEffect(() => { load(); }, [uid]);

  async function add() {
    if (!form.name.trim()) return toast.error("Give the bill a name.");
    const { error } = await supabase.from("recurring_bills").insert({
      user_id: uid,
      name: form.name.trim(),
      amount: Number(form.amount) || 0,
      cadence: form.cadence,
      next_due_date: form.next_due_date || null,
      category_id: form.category_id || null,
      notes: form.notes || null,
    });
    if (error) return toast.error(error.message);
    setForm({ name: "", amount: "", cadence: "monthly", next_due_date: todayISO(), category_id: "", notes: "" });
    toast.success("Bill added");
    load();
  }

  async function saveEdit(id: string, patch: Partial<Bill>) {
    const { error } = await supabase.from("recurring_bills").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    setEditingId(null);
    load();
  }

  async function del(id: string) {
    await supabase.from("recurring_bills").delete().eq("id", id);
    load();
  }

  async function markPaid(b: Bill) {
    // Create transaction, advance next_due_date
    const today = todayISO();
    await supabase.from("transactions").insert({
      user_id: uid,
      date: today,
      amount: b.amount,
      kind: "expense",
      category_id: b.category_id,
      note: `Paid: ${b.name}`,
    });
    const next = b.next_due_date ? advanceDate(b.next_due_date, b.cadence) : null;
    await supabase.from("recurring_bills").update({ next_due_date: next }).eq("id", b.id);
    toast.success(`Paid ${b.name} · next on ${next ?? "—"}`);
    load();
  }

  const filtered = useMemo(() => {
    return bills.filter((b) => {
      const s = billStatus(b.next_due_date);
      if (filter === "all") return true;
      if (filter === "overdue") return s === "overdue";
      if (filter === "upcoming") return s === "upcoming" || s === "due-soon";
      return false; // paid — placeholder until status column lands in Phase 2
    });
  }, [bills, filter]);

  const overdueCount = bills.filter((b) => billStatus(b.next_due_date) === "overdue").length;
  const dueSoonCount = bills.filter((b) => billStatus(b.next_due_date) === "due-soon").length;

  return (
    <div className="space-y-4">
      <SectionCard accent="calm" title="Bills" subtitle={gentleBillCopy(overdueCount, dueSoonCount)}>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-6">
          <Input className="sm:col-span-2" placeholder="Bill name (e.g. Rent)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input type="number" step="0.01" placeholder="$" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <Select value={form.cadence} onValueChange={(v) => setForm({ ...form, cadence: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{CADENCES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
          </Select>
          <Input type="date" value={form.next_due_date} onChange={(e) => setForm({ ...form, next_due_date: e.target.value })} />
          <Button onClick={add}>Add</Button>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {(["upcoming", "overdue", "all", "paid"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition",
                filter === f
                  ? "border-primary/45 bg-primary/15 text-primary"
                  : "border-border/60 bg-card/60 text-muted-foreground hover:bg-card",
              )}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard accent="warm" title={`${filtered.length} ${filter === "all" ? "bill" : filter}${filtered.length === 1 ? "" : "s"}`}>
        {filtered.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {filter === "paid" ? "Paid history will live here in Phase 2." : "Nothing here — a gentle breath."}
          </p>
        ) : (
          <ul className="space-y-2">
            {filtered.map((b) => {
              const isEditing = editingId === b.id;
              const s = billStatus(b.next_due_date);
              const dd = daysUntil(b.next_due_date);
              const cat = cats.find((c) => c.id === b.category_id);
              return (
                <li key={b.id} className="rounded-xl border border-border/60 bg-card/60 p-3">
                  {isEditing ? (
                    <EditRow
                      bill={b}
                      cats={cats}
                      onCancel={() => setEditingId(null)}
                      onSave={(patch) => saveEdit(b.id, patch)}
                    />
                  ) : (
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium">{b.name}</span>
                          <StatusPill s={s} />
                          {cat && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{cat.name}</span>}
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {b.cadence} · {b.next_due_date ?? "unscheduled"}
                          {dd !== null && (dd < 0 ? ` · ${Math.abs(dd)}d late` : dd === 0 ? " · today" : ` · in ${dd}d`)}
                          {b.notes ? ` · ${b.notes}` : ""}
                        </div>
                      </div>
                      <div className="font-semibold tabular-nums">{fmtMoney(b.amount)}</div>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => markPaid(b)}>
                          <Check className="mr-1 h-3.5 w-3.5" /> Paid
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingId(b.id)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => del(b.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}

function EditRow({ bill, cats, onCancel, onSave }: {
  bill: Bill; cats: any[]; onCancel: () => void; onSave: (patch: Partial<Bill>) => void;
}) {
  const [name, setName] = useState(bill.name);
  const [amount, setAmount] = useState(String(bill.amount ?? ""));
  const [cadence, setCadence] = useState(bill.cadence);
  const [nextDue, setNextDue] = useState(bill.next_due_date ?? "");
  const [catId, setCatId] = useState(bill.category_id ?? "");
  const [notes, setNotes] = useState(bill.notes ?? "");
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-7">
      <Input className="sm:col-span-2" value={name} onChange={(e) => setName(e.target.value)} />
      <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
      <Select value={cadence} onValueChange={setCadence}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>{CADENCES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
      </Select>
      <Input type="date" value={nextDue} onChange={(e) => setNextDue(e.target.value)} />
      <Select value={catId || "none"} onValueChange={(v) => setCatId(v === "none" ? "" : v)}>
        <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No category</SelectItem>
          {cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
        </SelectContent>
      </Select>
      <div className="flex gap-1">
        <Button size="sm" className="h-9 flex-1" onClick={() => onSave({
          name, amount: Number(amount) || 0, cadence, next_due_date: nextDue || null, category_id: catId || null, notes: notes || null,
        })}>Save</Button>
        <Button size="icon" variant="ghost" className="h-9 w-9" onClick={onCancel}><X className="h-4 w-4" /></Button>
      </div>
      <Input className="sm:col-span-7" placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
    </div>
  );
}