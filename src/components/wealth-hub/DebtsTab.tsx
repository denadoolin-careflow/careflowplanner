import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SectionCard } from "@/components/cards/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Pencil, X, Check, Snowflake, Mountain, Heart } from "lucide-react";
import { toast } from "sonner";
import { fmtMoney } from "@/lib/wealth-utils";
import { cn } from "@/lib/utils";

type Debt = {
  id: string;
  name: string;
  balance: number;
  apr: number;
  min_payment: number;
  target_payoff_date: string | null;
  strategy: string;
  notes: string | null;
};

type Strategy = "snowball" | "avalanche";

function projectMonths(balance: number, apr: number, payment: number): number | null {
  if (payment <= 0 || balance <= 0) return null;
  const r = (apr / 100) / 12;
  if (r === 0) return Math.ceil(balance / payment);
  if (payment <= balance * r) return null; // never pays off
  const n = -Math.log(1 - (balance * r) / payment) / Math.log(1 + r);
  return Math.ceil(n);
}

export function DebtsTab({ uid }: { uid: string }) {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [strategy, setStrategy] = useState<Strategy>("snowball");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<Debt>>({});
  const [creating, setCreating] = useState(false);
  const [newD, setNewD] = useState<Partial<Debt>>({ name: "", balance: 0, apr: 0, min_payment: 0, strategy: "snowball" });
  const [payFor, setPayFor] = useState<string | null>(null);
  const [payAmt, setPayAmt] = useState("");

  async function load() {
    const { data } = await supabase.from("debts").select("*").eq("user_id", uid).order("created_at");
    setDebts((data ?? []) as Debt[]);
  }
  useEffect(() => { load(); }, [uid]);

  const sorted = useMemo(() => {
    const arr = [...debts];
    if (strategy === "snowball") arr.sort((a, b) => a.balance - b.balance);
    else arr.sort((a, b) => b.apr - a.apr);
    return arr;
  }, [debts, strategy]);

  const totals = useMemo(() => {
    const total = debts.reduce((s, d) => s + Number(d.balance || 0), 0);
    const minPay = debts.reduce((s, d) => s + Number(d.min_payment || 0), 0);
    return { total, minPay };
  }, [debts]);

  async function create() {
    if (!newD.name?.trim()) { toast.error("Give your debt a name"); return; }
    const { error } = await supabase.from("debts").insert({
      user_id: uid,
      name: newD.name!.trim(),
      balance: Number(newD.balance) || 0,
      apr: Number(newD.apr) || 0,
      min_payment: Number(newD.min_payment) || 0,
      target_payoff_date: newD.target_payoff_date || null,
      strategy: newD.strategy || "snowball",
      notes: newD.notes || null,
    });
    if (error) { toast.error(error.message); return; }
    setCreating(false);
    setNewD({ name: "", balance: 0, apr: 0, min_payment: 0, strategy });
    load();
    toast.success("Added — one step closer.");
  }

  async function saveEdit(id: string) {
    const { error } = await supabase.from("debts").update({
      name: draft.name,
      balance: Number(draft.balance) || 0,
      apr: Number(draft.apr) || 0,
      min_payment: Number(draft.min_payment) || 0,
      target_payoff_date: draft.target_payoff_date || null,
      notes: draft.notes || null,
    }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    setEditing(null); setDraft({}); load();
  }

  async function remove(id: string) {
    if (!confirm("Remove this debt?")) return;
    await supabase.from("debts").delete().eq("id", id);
    load();
  }

  async function logPayment(d: Debt) {
    const amt = Number(payAmt);
    if (!amt || amt <= 0) { toast.error("Enter a payment amount"); return; }
    const newBal = Math.max(0, Number(d.balance) - amt);
    const { error } = await supabase.from("debts").update({ balance: newBal }).eq("id", d.id);
    if (error) { toast.error(error.message); return; }
    // also log as a transaction (best-effort)
    await supabase.from("transactions").insert({
      user_id: uid, kind: "expense", amount: amt, note: `Payment: ${d.name}`,
      date: new Date().toISOString().slice(0, 10),
    } as any);
    setPayFor(null); setPayAmt("");
    if (newBal === 0) toast.success(`💫 ${d.name} paid off — what a moment.`);
    else toast.success(`Logged ${fmtMoney(amt)} toward ${d.name}`);
    load();
  }

  return (
    <div className="space-y-4">
      <SectionCard title="Debts" subtitle="Steady steps, gentle pace." accent="calm"
        action={
          <Button size="sm" variant="outline" onClick={() => setCreating((v) => !v)}>
            <Plus className="mr-1 h-3.5 w-3.5" /> New debt
          </Button>
        }
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border/40 bg-card/40 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Total balance</p>
            <p className="font-display text-xl tabular-nums">{fmtMoney(totals.total)}</p>
          </div>
          <div className="rounded-xl border border-border/40 bg-card/40 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Minimum / month</p>
            <p className="font-display text-xl tabular-nums">{fmtMoney(totals.minPay)}</p>
          </div>
          <div className="rounded-xl border border-border/40 bg-card/40 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Active debts</p>
            <p className="font-display text-xl tabular-nums">{debts.length}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Payoff order:</span>
          <Button size="sm" variant={strategy === "snowball" ? "default" : "outline"} onClick={() => setStrategy("snowball")}>
            <Snowflake className="mr-1 h-3.5 w-3.5" /> Snowball (smallest first)
          </Button>
          <Button size="sm" variant={strategy === "avalanche" ? "default" : "outline"} onClick={() => setStrategy("avalanche")}>
            <Mountain className="mr-1 h-3.5 w-3.5" /> Avalanche (highest APR)
          </Button>
        </div>

        {creating && (
          <div className="mt-3 space-y-2 rounded-xl border border-primary/30 bg-primary/5 p-4">
            <div className="grid gap-2 sm:grid-cols-2">
              <Input placeholder="Debt name" value={newD.name ?? ""} onChange={(e) => setNewD({ ...newD, name: e.target.value })} />
              <Input type="number" step="0.01" placeholder="Balance" value={newD.balance ?? ""} onChange={(e) => setNewD({ ...newD, balance: Number(e.target.value) })} />
              <Input type="number" step="0.01" placeholder="APR (%)" value={newD.apr ?? ""} onChange={(e) => setNewD({ ...newD, apr: Number(e.target.value) })} />
              <Input type="number" step="0.01" placeholder="Min payment" value={newD.min_payment ?? ""} onChange={(e) => setNewD({ ...newD, min_payment: Number(e.target.value) })} />
              <Input type="date" value={newD.target_payoff_date ?? ""} onChange={(e) => setNewD({ ...newD, target_payoff_date: e.target.value })} />
            </div>
            <Textarea rows={2} placeholder="Notes" value={newD.notes ?? ""} onChange={(e) => setNewD({ ...newD, notes: e.target.value })} />
            <div className="flex gap-2">
              <Button size="sm" onClick={create}><Check className="mr-1 h-3.5 w-3.5" /> Add debt</Button>
              <Button size="sm" variant="ghost" onClick={() => setCreating(false)}><X className="mr-1 h-3.5 w-3.5" /> Cancel</Button>
            </div>
          </div>
        )}

        {debts.length === 0 && !creating && (
          <p className="mt-3 text-sm text-muted-foreground">
            No debts tracked — keep it that way, or add one to plan a gentle payoff.
          </p>
        )}

        <div className="mt-3 space-y-2">
          {sorted.map((d, idx) => {
            const months = projectMonths(d.balance, d.apr, d.min_payment);
            const isEdit = editing === d.id;
            const focus = idx === 0 && d.balance > 0;
            return (
              <div key={d.id}
                className={cn(
                  "rounded-xl border bg-card/60 p-4 transition",
                  focus ? "border-primary/40 bg-primary/5" : "border-border/50",
                )}
              >
                {!isEdit ? (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{d.name}</p>
                          {focus && <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary text-[10px]"><Heart className="mr-1 h-3 w-3" /> Focus</Badge>}
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                          Balance <span className="text-foreground">{fmtMoney(d.balance)}</span>
                          {" · "}APR {d.apr}%
                          {" · "}Min {fmtMoney(d.min_payment)}/mo
                        </p>
                        {months !== null ? (
                          <p className="text-xs text-muted-foreground">
                            At minimums, paid off in ~{months} {months === 1 ? "month" : "months"}.
                          </p>
                        ) : d.balance > 0 ? (
                          <p className="text-xs text-amber-600 dark:text-amber-300">
                            Min payment won't cover interest — consider adding a little more.
                          </p>
                        ) : (
                          <p className="text-xs text-emerald-600 dark:text-emerald-300">Paid off 💫</p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                          onClick={() => { setEditing(d.id); setDraft(d); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => remove(d.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {payFor === d.id ? (
                      <div className="mt-3 flex gap-2">
                        <Input type="number" step="0.01" placeholder="Payment amount" value={payAmt} autoFocus
                          onChange={(e) => setPayAmt(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && logPayment(d)} />
                        <Button size="sm" onClick={() => logPayment(d)}>Log</Button>
                        <Button size="sm" variant="ghost" onClick={() => { setPayFor(null); setPayAmt(""); }}>Cancel</Button>
                      </div>
                    ) : d.balance > 0 ? (
                      <Button size="sm" variant="outline" className="mt-3" onClick={() => setPayFor(d.id)}>
                        Log payment
                      </Button>
                    ) : null}
                  </>
                ) : (
                  <div className="space-y-2">
                    <Input value={draft.name ?? ""} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                    <div className="grid grid-cols-2 gap-2">
                      <Input type="number" step="0.01" placeholder="Balance" value={draft.balance ?? 0} onChange={(e) => setDraft({ ...draft, balance: Number(e.target.value) })} />
                      <Input type="number" step="0.01" placeholder="APR" value={draft.apr ?? 0} onChange={(e) => setDraft({ ...draft, apr: Number(e.target.value) })} />
                      <Input type="number" step="0.01" placeholder="Min payment" value={draft.min_payment ?? 0} onChange={(e) => setDraft({ ...draft, min_payment: Number(e.target.value) })} />
                      <Input type="date" value={draft.target_payoff_date ?? ""} onChange={(e) => setDraft({ ...draft, target_payoff_date: e.target.value })} />
                    </div>
                    <Textarea rows={2} value={draft.notes ?? ""} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => saveEdit(d.id)}><Check className="mr-1 h-3.5 w-3.5" /> Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => { setEditing(null); setDraft({}); }}>Cancel</Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}