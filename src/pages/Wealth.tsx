import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SectionCard } from "@/components/cards/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import { toast } from "sonner";

const today = () => new Date().toISOString().slice(0, 10);
const fmt = (n: number) => `$${(Number(n) || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

function useUser() {
  const [uid, setUid] = useState<string | null>(null);
  useEffect(() => { supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null)); }, []);
  return uid;
}

function Money({ n, hide }: { n: number; hide: boolean }) {
  return <span className={hide ? "blur-sm select-none" : ""}>{fmt(n)}</span>;
}

function Overview({ uid, hide }: { uid: string; hide: boolean }) {
  const [tx, setTx] = useState<any[]>([]);
  const [subs, setSubs] = useState<any[]>([]);
  const [debts, setDebts] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  useEffect(() => {
    const monthStart = new Date(); monthStart.setDate(1);
    const ms = monthStart.toISOString().slice(0, 10);
    supabase.from("transactions").select("*").eq("user_id", uid).gte("date", ms).then(({ data }) => setTx(data ?? []));
    supabase.from("subscriptions").select("*").eq("user_id", uid).then(({ data }) => setSubs(data ?? []));
    supabase.from("debts").select("*").eq("user_id", uid).then(({ data }) => setDebts(data ?? []));
    supabase.from("recurring_bills").select("*").eq("user_id", uid).then(({ data }) => setBills(data ?? []));
  }, [uid]);
  const income = tx.filter(t => t.kind === "income").reduce((s, t) => s + Number(t.amount), 0);
  const expense = tx.filter(t => t.kind === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const subTotal = subs.reduce((s, x) => s + (x.cadence === "yearly" ? Number(x.amount) / 12 : Number(x.amount)), 0);
  const debtTotal = debts.reduce((s, d) => s + Number(d.balance), 0);
  const next7 = [...subs.map(s => ({ name: s.name, amount: s.amount, date: s.next_charge_date })), ...bills.map(b => ({ name: b.name, amount: b.amount, date: b.next_due_date }))]
    .filter(x => x.date && new Date(x.date) <= new Date(Date.now() + 7 * 86400000))
    .sort((a, b) => (a.date! > b.date! ? 1 : -1));
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <SectionCard title="This month" accent="calm">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div><div className="text-xs text-muted-foreground">Income</div><div className="font-semibold text-emerald-500"><Money n={income} hide={hide} /></div></div>
          <div><div className="text-xs text-muted-foreground">Expenses</div><div className="font-semibold text-rose-500"><Money n={expense} hide={hide} /></div></div>
          <div><div className="text-xs text-muted-foreground">Net</div><div className="font-semibold"><Money n={income - expense} hide={hide} /></div></div>
        </div>
      </SectionCard>
      <SectionCard title="Subscriptions" accent="warm">
        <div className="text-sm text-muted-foreground">Monthly equivalent</div>
        <div className="text-2xl font-semibold"><Money n={subTotal} hide={hide} /></div>
      </SectionCard>
      <SectionCard title="Debt total" accent="sage">
        <div className="text-2xl font-semibold"><Money n={debtTotal} hide={hide} /></div>
      </SectionCard>
      <SectionCard title="Next 7 days" accent="warm">
        {next7.length === 0 ? <p className="text-sm text-muted-foreground">Nothing due.</p> : (
          <ul className="space-y-1 text-sm">{next7.map((x, i) => (
            <li key={i} className="flex justify-between"><span>{x.date} · {x.name}</span><Money n={Number(x.amount)} hide={hide} /></li>
          ))}</ul>
        )}
      </SectionCard>
    </div>
  );
}

function BudgetPanel({ uid, hide }: { uid: string; hide: boolean }) {
  const [cats, setCats] = useState<any[]>([]);
  const [tx, setTx] = useState<any[]>([]);
  const [name, setName] = useState(""); const [limit, setLimit] = useState("");
  async function load() {
    const { data: c } = await supabase.from("budget_categories").select("*").eq("user_id", uid).order("sort_order");
    setCats(c ?? []);
    const ms = new Date(); ms.setDate(1);
    const { data: t } = await supabase.from("transactions").select("*").eq("user_id", uid).gte("date", ms.toISOString().slice(0, 10));
    setTx(t ?? []);
  }
  useEffect(() => { load(); }, [uid]);
  async function add() {
    if (!name) return;
    const { error } = await supabase.from("budget_categories").insert({ user_id: uid, name, monthly_limit: Number(limit) || 0, kind: "expense" });
    if (error) return toast.error(error.message);
    setName(""); setLimit(""); load();
  }
  async function del(id: string) { await supabase.from("budget_categories").delete().eq("id", id); load(); }
  return (
    <SectionCard title="Budget categories" accent="calm">
      <div className="flex gap-2">
        <Input placeholder="Category" value={name} onChange={e => setName(e.target.value)} />
        <Input type="number" placeholder="Monthly $" value={limit} onChange={e => setLimit(e.target.value)} className="w-32" />
        <Button onClick={add}>Add</Button>
      </div>
      <ul className="mt-3 space-y-3">
        {cats.map(c => {
          const spent = tx.filter(t => t.category_id === c.id && t.kind === "expense").reduce((s, t) => s + Number(t.amount), 0);
          const pct = c.monthly_limit ? Math.min(100, (spent / Number(c.monthly_limit)) * 100) : 0;
          return (
            <li key={c.id}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{c.name}</span>
                <span className="text-muted-foreground"><Money n={spent} hide={hide} /> / <Money n={Number(c.monthly_limit)} hide={hide} /></span>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => del(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
              <Progress value={pct} className="mt-1 h-2" />
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}

function TransactionsPanel({ uid, hide }: { uid: string; hide: boolean }) {
  const [tx, setTx] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ date: today(), amount: "", kind: "expense", category_id: "", note: "", account: "" });
  async function load() {
    const { data } = await supabase.from("transactions").select("*").eq("user_id", uid).order("date", { ascending: false }).limit(100);
    setTx(data ?? []);
    const { data: c } = await supabase.from("budget_categories").select("*").eq("user_id", uid);
    setCats(c ?? []);
  }
  useEffect(() => { load(); }, [uid]);
  async function add() {
    if (!form.amount) return;
    const { error } = await supabase.from("transactions").insert({ user_id: uid, date: form.date, amount: Number(form.amount), kind: form.kind, category_id: form.category_id || null, note: form.note || null, account: form.account || null });
    if (error) return toast.error(error.message);
    setForm({ ...form, amount: "", note: "" }); load();
  }
  async function del(id: string) { await supabase.from("transactions").delete().eq("id", id); load(); }
  return (
    <SectionCard title="Transactions" accent="warm">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
        <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
        <Select value={form.kind} onValueChange={v => setForm({ ...form, kind: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="expense">Expense</SelectItem><SelectItem value="income">Income</SelectItem></SelectContent>
        </Select>
        <Input type="number" step="0.01" placeholder="$" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
        <Select value={form.category_id || "none"} onValueChange={v => setForm({ ...form, category_id: v === "none" ? "" : v })}>
          <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent><SelectItem value="none">None</SelectItem>{cats.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
        <Input placeholder="Note" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} />
        <Button onClick={add}>Add</Button>
      </div>
      <ul className="mt-3 space-y-1 text-sm">
        {tx.map(t => (
          <li key={t.id} className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2">
            <span className="w-24 text-xs text-muted-foreground">{t.date}</span>
            <span className="flex-1">{t.note || cats.find(c => c.id === t.category_id)?.name || "—"}</span>
            <span className={t.kind === "income" ? "text-emerald-500" : "text-rose-500"}><Money n={Number(t.amount)} hide={hide} /></span>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => del(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

function SubscriptionsPanel({ uid, hide }: { uid: string; hide: boolean }) {
  const [subs, setSubs] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ name: "", amount: "", cadence: "monthly", next_charge_date: today() });
  async function load() {
    const { data } = await supabase.from("subscriptions").select("*").eq("user_id", uid).order("next_charge_date");
    setSubs(data ?? []);
  }
  useEffect(() => { load(); }, [uid]);
  async function add() {
    if (!form.name) return;
    const { error } = await supabase.from("subscriptions").insert({ user_id: uid, name: form.name, amount: Number(form.amount) || 0, cadence: form.cadence, next_charge_date: form.next_charge_date || null });
    if (error) return toast.error(error.message);
    setForm({ name: "", amount: "", cadence: "monthly", next_charge_date: today() }); load();
  }
  async function del(id: string) { await supabase.from("subscriptions").delete().eq("id", id); load(); }
  const monthly = subs.reduce((s, x) => s + (x.cadence === "yearly" ? Number(x.amount) / 12 : Number(x.amount)), 0);
  return (
    <SectionCard title="Subscriptions" subtitle={`${fmt(monthly)} / mo`} accent="sage">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Input placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        <Input type="number" placeholder="$" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
        <Select value={form.cadence} onValueChange={v => setForm({ ...form, cadence: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="yearly">Yearly</SelectItem></SelectContent>
        </Select>
        <Input type="date" value={form.next_charge_date} onChange={e => setForm({ ...form, next_charge_date: e.target.value })} />
        <Button onClick={add}>Add</Button>
      </div>
      <ul className="mt-3 space-y-1 text-sm">
        {subs.map(s => (
          <li key={s.id} className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2">
            <span className="flex-1">{s.name}</span>
            <span className="text-xs text-muted-foreground">{s.cadence} · next {s.next_charge_date || "—"}</span>
            <Money n={Number(s.amount)} hide={hide} />
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => del(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

function DebtsPanel({ uid, hide }: { uid: string; hide: boolean }) {
  const [debts, setDebts] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ name: "", balance: "", apr: "", min_payment: "", strategy: "snowball" });
  async function load() {
    const { data } = await supabase.from("debts").select("*").eq("user_id", uid);
    setDebts(data ?? []);
  }
  useEffect(() => { load(); }, [uid]);
  async function add() {
    if (!form.name) return;
    const { error } = await supabase.from("debts").insert({ user_id: uid, name: form.name, balance: Number(form.balance) || 0, apr: Number(form.apr) || 0, min_payment: Number(form.min_payment) || 0, strategy: form.strategy });
    if (error) return toast.error(error.message);
    setForm({ name: "", balance: "", apr: "", min_payment: "", strategy: "snowball" }); load();
  }
  async function del(id: string) { await supabase.from("debts").delete().eq("id", id); load(); }
  const ordered = useMemo(() => {
    const list = [...debts];
    list.sort((a, b) => a.strategy === "avalanche" ? Number(b.apr) - Number(a.apr) : Number(a.balance) - Number(b.balance));
    return list;
  }, [debts]);
  const total = debts.reduce((s, d) => s + Number(d.balance), 0);
  return (
    <SectionCard title="Debts" subtitle={`Total: ${fmt(total)}`} accent="warm">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
        <Input placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        <Input type="number" placeholder="Balance" value={form.balance} onChange={e => setForm({ ...form, balance: e.target.value })} />
        <Input type="number" step="0.01" placeholder="APR %" value={form.apr} onChange={e => setForm({ ...form, apr: e.target.value })} />
        <Input type="number" placeholder="Min pay" value={form.min_payment} onChange={e => setForm({ ...form, min_payment: e.target.value })} />
        <Select value={form.strategy} onValueChange={v => setForm({ ...form, strategy: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="snowball">Snowball</SelectItem><SelectItem value="avalanche">Avalanche</SelectItem></SelectContent>
        </Select>
        <Button onClick={add}>Add</Button>
      </div>
      <ol className="mt-3 space-y-1 text-sm">
        {ordered.map((d, i) => (
          <li key={d.id} className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2">
            <span className="w-6 text-xs text-muted-foreground">#{i + 1}</span>
            <span className="flex-1">{d.name} <span className="text-xs text-muted-foreground">{d.apr}% APR</span></span>
            <Money n={Number(d.balance)} hide={hide} />
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => del(d.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
          </li>
        ))}
      </ol>
    </SectionCard>
  );
}

function BillsPanel({ uid, hide }: { uid: string; hide: boolean }) {
  const [bills, setBills] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ name: "", amount: "", cadence: "monthly", next_due_date: today() });
  async function load() {
    const { data } = await supabase.from("recurring_bills").select("*").eq("user_id", uid).order("next_due_date");
    setBills(data ?? []);
  }
  useEffect(() => { load(); }, [uid]);
  async function add() {
    if (!form.name) return;
    const { error } = await supabase.from("recurring_bills").insert({ user_id: uid, name: form.name, amount: Number(form.amount) || 0, cadence: form.cadence, next_due_date: form.next_due_date || null });
    if (error) return toast.error(error.message);
    setForm({ name: "", amount: "", cadence: "monthly", next_due_date: today() }); load();
  }
  async function del(id: string) { await supabase.from("recurring_bills").delete().eq("id", id); load(); }
  return (
    <SectionCard title="Recurring bills" subtitle="Auto-overlay on the calendar" accent="calm">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Input placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        <Input type="number" placeholder="$" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
        <Select value={form.cadence} onValueChange={v => setForm({ ...form, cadence: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{["weekly","monthly","quarterly","yearly"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
        <Input type="date" value={form.next_due_date} onChange={e => setForm({ ...form, next_due_date: e.target.value })} />
        <Button onClick={add}>Add</Button>
      </div>
      <ul className="mt-3 space-y-1 text-sm">
        {bills.map(b => (
          <li key={b.id} className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2">
            <span className="flex-1">{b.name}</span>
            <span className="text-xs text-muted-foreground">{b.cadence} · {b.next_due_date}</span>
            <Money n={Number(b.amount)} hide={hide} />
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => del(b.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

export default function Wealth() {
  const uid = useUser();
  const [hide, setHide] = useState(false);
  if (!uid) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  return (
    <div className="space-y-6">
      <div className="cozy-card gradient-sage p-6 flex items-start justify-between">
        <div>
          <h2 className="font-display text-3xl font-semibold">Wealth</h2>
          <p className="mt-1 text-sm text-muted-foreground">Budget, transactions, subscriptions, debt.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setHide(h => !h)}>
          {hide ? <><Eye className="mr-1 h-4 w-4" /> Show</> : <><EyeOff className="mr-1 h-4 w-4" /> Hide $</>}
        </Button>
      </div>
      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="budget">Budget</TabsTrigger>
          <TabsTrigger value="tx">Transactions</TabsTrigger>
          <TabsTrigger value="subs">Subscriptions</TabsTrigger>
          <TabsTrigger value="bills">Bills</TabsTrigger>
          <TabsTrigger value="debts">Debts</TabsTrigger>
        </TabsList>
        <TabsContent value="overview"><Overview uid={uid} hide={hide} /></TabsContent>
        <TabsContent value="budget"><BudgetPanel uid={uid} hide={hide} /></TabsContent>
        <TabsContent value="tx"><TransactionsPanel uid={uid} hide={hide} /></TabsContent>
        <TabsContent value="subs"><SubscriptionsPanel uid={uid} hide={hide} /></TabsContent>
        <TabsContent value="bills"><BillsPanel uid={uid} hide={hide} /></TabsContent>
        <TabsContent value="debts"><DebtsPanel uid={uid} hide={hide} /></TabsContent>
      </Tabs>
    </div>
  );
}