import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SectionCard } from "@/components/cards/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Plus, Trash2, Pencil, X, Check, Users, ShieldCheck, Download, Printer,
  ArrowUpRight, ArrowDownRight, PiggyBank,
} from "lucide-react";
import { fmtMoney, todayISO } from "@/lib/wealth-utils";
import { cn } from "@/lib/utils";

type Beneficiary = {
  id: string;
  display_name: string;
  relationship: string | null;
  benefit_type: string;
  claim_number_last4: string | null;
  monthly_benefit_amount: number;
  started_payee_on: string | null;
  notes: string | null;
  is_active: boolean;
  recipient_id: string | null;
};

type Income = { id: string; beneficiary_id: string; date: string; source: string; amount: number; note: string | null };
type Expense = {
  id: string; beneficiary_id: string; date: string; amount: number;
  category: string; subcategory: string | null; note: string | null; payment_method: string | null;
};
type Conserved = { id: string; beneficiary_id: string; date: string; amount: number; account_label: string | null; note: string | null };

const BENEFIT_TYPES = ["SSI", "SSDI", "Both", "Other"];
const INCOME_SOURCES = ["SSI", "SSDI", "Other"];

const CATEGORIES: { value: string; label: string; bg: string }[] = [
  { value: "housing",         label: "Housing",         bg: "bg-amber-500/15 text-amber-700 dark:text-amber-200" },
  { value: "food",            label: "Food",            bg: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-200" },
  { value: "clothing",        label: "Clothing",        bg: "bg-sky-500/15 text-sky-700 dark:text-sky-200" },
  { value: "medical_dental",  label: "Medical & dental", bg: "bg-rose-400/15 text-rose-700 dark:text-rose-200" },
  { value: "personal_items",  label: "Personal items",  bg: "bg-violet-500/15 text-violet-700 dark:text-violet-200" },
  { value: "recreation",      label: "Recreation",      bg: "bg-pink-400/15 text-pink-700 dark:text-pink-200" },
  { value: "education",       label: "Education",       bg: "bg-indigo-400/15 text-indigo-700 dark:text-indigo-200" },
  { value: "transportation",  label: "Transportation",  bg: "bg-teal-500/15 text-teal-700 dark:text-teal-200" },
  { value: "savings_conserved", label: "Savings / conserved", bg: "bg-green-600/15 text-green-700 dark:text-green-200" },
  { value: "other",           label: "Other",           bg: "bg-muted text-muted-foreground" },
];
const catLabel = (v: string) => CATEGORIES.find((c) => c.value === v)?.label ?? v;
const catStyle = (v: string) => CATEGORIES.find((c) => c.value === v)?.bg ?? "bg-muted text-muted-foreground";

function maskLast4(s?: string | null) {
  if (!s) return "";
  const digits = s.replace(/\D/g, "").slice(-4);
  return digits ? `•••–••–${digits}` : "";
}

function yearMonth(d: string) { return d.slice(0, 7); }

export function PayeeTab({ uid }: { uid: string }) {
  const [bens, setBens] = useState<Beneficiary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [creatingBen, setCreatingBen] = useState(false);
  const [editingBen, setEditingBen] = useState(false);
  const [benDraft, setBenDraft] = useState<Partial<Beneficiary> & { claim_full?: string }>({});
  const [view, setView] = useState<"overview" | "income" | "expenses" | "conserved" | "report">("overview");

  const [income, setIncome] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [conserved, setConserved] = useState<Conserved[]>([]);

  const [reportYear, setReportYear] = useState(new Date().getFullYear());

  async function loadBens() {
    const { data } = await supabase.from("payee_beneficiaries").select("*")
      .eq("user_id", uid).order("sort_order").order("created_at");
    const list = (data ?? []) as Beneficiary[];
    setBens(list);
    if (!activeId && list.length > 0) setActiveId(list[0].id);
  }
  useEffect(() => { loadBens(); }, [uid]);

  async function loadDetail(bid: string) {
    const [i, e, c] = await Promise.all([
      supabase.from("payee_income").select("*").eq("user_id", uid).eq("beneficiary_id", bid).order("date", { ascending: false }),
      supabase.from("payee_expenses").select("*").eq("user_id", uid).eq("beneficiary_id", bid).order("date", { ascending: false }),
      supabase.from("payee_conserved_funds").select("*").eq("user_id", uid).eq("beneficiary_id", bid).order("date", { ascending: false }),
    ]);
    setIncome((i.data ?? []) as Income[]);
    setExpenses((e.data ?? []) as Expense[]);
    setConserved((c.data ?? []) as Conserved[]);
  }
  useEffect(() => { if (activeId) loadDetail(activeId); }, [activeId, uid]);

  const active = bens.find((b) => b.id === activeId) ?? null;

  // Summaries for the current month (overview)
  const thisMonth = todayISO().slice(0, 7);
  const monthIncome = useMemo(() => income.filter((r) => yearMonth(r.date) === thisMonth).reduce((s, r) => s + Number(r.amount || 0), 0), [income, thisMonth]);
  const monthExpense = useMemo(() => expenses.filter((r) => yearMonth(r.date) === thisMonth).reduce((s, r) => s + Number(r.amount || 0), 0), [expenses, thisMonth]);
  const conservedBalance = useMemo(() => conserved.reduce((s, r) => s + Number(r.amount || 0), 0), [conserved]);
  const untracked = Math.max(0, monthIncome - monthExpense - conserved.filter((r) => yearMonth(r.date) === thisMonth).reduce((s, r) => s + Number(r.amount || 0), 0));

  // ===== Beneficiary CRUD =====
  async function saveBen() {
    if (!benDraft.display_name?.trim()) { toast.error("Name is required"); return; }
    const claim_last4 = benDraft.claim_full
      ? benDraft.claim_full.replace(/\D/g, "").slice(-4)
      : benDraft.claim_number_last4 ?? null;
    const payload = {
      user_id: uid,
      display_name: benDraft.display_name!.trim(),
      relationship: benDraft.relationship || null,
      benefit_type: benDraft.benefit_type || "SSI",
      claim_number_last4: claim_last4 || null,
      monthly_benefit_amount: Number(benDraft.monthly_benefit_amount) || 0,
      started_payee_on: benDraft.started_payee_on || null,
      notes: benDraft.notes || null,
      is_active: benDraft.is_active ?? true,
      recipient_id: benDraft.recipient_id || null,
    };
    if (editingBen && active) {
      const { error } = await supabase.from("payee_beneficiaries").update(payload).eq("id", active.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Beneficiary updated");
    } else {
      const { data, error } = await supabase.from("payee_beneficiaries").insert(payload).select().single();
      if (error) { toast.error(error.message); return; }
      toast.success("Beneficiary added");
      if (data) setActiveId((data as any).id);
    }
    setCreatingBen(false); setEditingBen(false); setBenDraft({});
    loadBens();
  }

  async function removeBen() {
    if (!active) return;
    if (!confirm(`Remove ${active.display_name} and all their records? This cannot be undone.`)) return;
    await supabase.from("payee_beneficiaries").delete().eq("id", active.id);
    setActiveId(null);
    loadBens();
  }

  // ===== Quick add helpers =====
  const [newIncome, setNewIncome] = useState<Partial<Income>>({ source: "SSI", amount: 0, date: todayISO() });
  const [newExpense, setNewExpense] = useState<Partial<Expense>>({ category: "housing", amount: 0, date: todayISO() });
  const [newConserved, setNewConserved] = useState<Partial<Conserved>>({ amount: 0, date: todayISO() });

  async function addIncome() {
    if (!active || !Number(newIncome.amount)) { toast.error("Enter an amount"); return; }
    const { error } = await supabase.from("payee_income").insert({
      user_id: uid, beneficiary_id: active.id,
      date: newIncome.date || todayISO(),
      source: newIncome.source || "SSI",
      amount: Number(newIncome.amount),
      note: newIncome.note || null,
    });
    if (error) { toast.error(error.message); return; }
    setNewIncome({ source: "SSI", amount: 0, date: todayISO() });
    loadDetail(active.id);
  }
  async function addExpense() {
    if (!active || !Number(newExpense.amount)) { toast.error("Enter an amount"); return; }
    const { error } = await supabase.from("payee_expenses").insert({
      user_id: uid, beneficiary_id: active.id,
      date: newExpense.date || todayISO(),
      category: newExpense.category || "other",
      subcategory: newExpense.subcategory || null,
      amount: Number(newExpense.amount),
      note: newExpense.note || null,
      payment_method: newExpense.payment_method || null,
    });
    if (error) { toast.error(error.message); return; }
    setNewExpense({ category: "housing", amount: 0, date: todayISO() });
    loadDetail(active.id);
  }
  async function addConserved() {
    if (!active || !Number(newConserved.amount)) { toast.error("Enter an amount"); return; }
    const { error } = await supabase.from("payee_conserved_funds").insert({
      user_id: uid, beneficiary_id: active.id,
      date: newConserved.date || todayISO(),
      amount: Number(newConserved.amount), // positive deposit, negative withdrawal
      account_label: newConserved.account_label || null,
      note: newConserved.note || null,
    });
    if (error) { toast.error(error.message); return; }
    setNewConserved({ amount: 0, date: todayISO() });
    loadDetail(active.id);
  }

  async function removeRow(table: string, id: string) {
    if (!confirm("Delete this entry?")) return;
    await supabase.from(table as any).delete().eq("id", id);
    if (active) loadDetail(active.id);
  }

  // ===== Annual report =====
  const reportData = useMemo(() => {
    const inYear = (d: string) => d.startsWith(`${reportYear}-`);
    const inc = income.filter((r) => inYear(r.date));
    const exp = expenses.filter((r) => inYear(r.date));
    const con = conserved.filter((r) => inYear(r.date));
    const incomeBySource = INCOME_SOURCES.reduce<Record<string, number>>((acc, s) => {
      acc[s] = inc.filter((r) => r.source === s).reduce((sum, r) => sum + Number(r.amount), 0);
      return acc;
    }, {});
    const expensesByCat = CATEGORIES.reduce<Record<string, number>>((acc, c) => {
      acc[c.value] = exp.filter((r) => r.category === c.value).reduce((sum, r) => sum + Number(r.amount), 0);
      return acc;
    }, {});
    const totalIncome = inc.reduce((s, r) => s + Number(r.amount), 0);
    const totalExpenses = exp.reduce((s, r) => s + Number(r.amount), 0);
    const savedDelta = con.reduce((s, r) => s + Number(r.amount), 0);
    return { incomeBySource, expensesByCat, totalIncome, totalExpenses, savedDelta };
  }, [income, expenses, conserved, reportYear]);

  function exportCSV() {
    if (!active) return;
    const rows: string[] = [
      `Representative Payee Annual Report — ${reportYear}`,
      `Beneficiary,${active.display_name}`,
      `Relationship,${active.relationship ?? ""}`,
      `Benefit type,${active.benefit_type}`,
      `Claim # (last 4),${active.claim_number_last4 ?? ""}`,
      "",
      "INCOME RECEIVED",
      ...INCOME_SOURCES.map((s) => `${s},${reportData.incomeBySource[s].toFixed(2)}`),
      `Total income,${reportData.totalIncome.toFixed(2)}`,
      "",
      "EXPENSES BY CATEGORY",
      ...CATEGORIES.map((c) => `${c.label},${reportData.expensesByCat[c.value].toFixed(2)}`),
      `Total expenses,${reportData.totalExpenses.toFixed(2)}`,
      "",
      `Net to / from conserved funds,${reportData.savedDelta.toFixed(2)}`,
      `Current conserved balance,${conservedBalance.toFixed(2)}`,
    ];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payee-report-${active.display_name.replace(/\s+/g, "_")}-${reportYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ===== Empty state =====
  if (bens.length === 0 && !creatingBen) {
    return (
      <SectionCard title="Representative Payee" accent="calm">
        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
            <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <p className="font-medium">A Representative Payee manages benefits on someone else's behalf.</p>
              <p className="mt-1 text-muted-foreground">
                Track each beneficiary's income (SSI / SSDI), spending by SSA category, and any conserved funds —
                kept separate from your personal Wealth so accounting stays clean.
              </p>
            </div>
          </div>
          <Button onClick={() => { setCreatingBen(true); setBenDraft({ benefit_type: "SSI", is_active: true }); }}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Add first beneficiary
          </Button>
        </div>
      </SectionCard>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header / picker */}
      <SectionCard
        title="Representative Payee"
        subtitle="Funds held in trust — kept separate from your personal money."
        accent="calm"
        action={
          <Button size="sm" variant="outline" onClick={() => { setCreatingBen(true); setEditingBen(false); setBenDraft({ benefit_type: "SSI", is_active: true }); }}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Beneficiary
          </Button>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          {bens.map((b) => (
            <button key={b.id} onClick={() => setActiveId(b.id)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs transition",
                activeId === b.id
                  ? "border-primary/50 bg-primary/15 text-primary"
                  : "border-border/60 bg-card/60 text-muted-foreground hover:bg-card",
              )}
            >
              <Users className="mr-1 inline h-3 w-3" /> {b.display_name}
              {!b.is_active && <span className="ml-1 text-[10px] opacity-70">(inactive)</span>}
            </button>
          ))}
        </div>

        {(creatingBen || editingBen) && (
          <div className="mt-3 space-y-2 rounded-xl border border-primary/30 bg-primary/5 p-4">
            <div className="grid gap-2 sm:grid-cols-2">
              <Input placeholder="Display name" value={benDraft.display_name ?? ""} onChange={(e) => setBenDraft({ ...benDraft, display_name: e.target.value })} />
              <Input placeholder="Relationship (e.g. son, mother)" value={benDraft.relationship ?? ""} onChange={(e) => setBenDraft({ ...benDraft, relationship: e.target.value })} />
              <Select value={benDraft.benefit_type ?? "SSI"} onValueChange={(v) => setBenDraft({ ...benDraft, benefit_type: v })}>
                <SelectTrigger><SelectValue placeholder="Benefit type" /></SelectTrigger>
                <SelectContent>
                  {BENEFIT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input type="number" step="0.01" placeholder="Monthly benefit amount" value={benDraft.monthly_benefit_amount ?? ""} onChange={(e) => setBenDraft({ ...benDraft, monthly_benefit_amount: Number(e.target.value) })} />
              <Input
                placeholder={editingBen ? `Claim # (kept: ${maskLast4(benDraft.claim_number_last4) || "none"})` : "Claim # (only last 4 stored)"}
                value={benDraft.claim_full ?? ""}
                onChange={(e) => setBenDraft({ ...benDraft, claim_full: e.target.value })}
              />
              <Input type="date" placeholder="Started as payee" value={benDraft.started_payee_on ?? ""} onChange={(e) => setBenDraft({ ...benDraft, started_payee_on: e.target.value })} />
            </div>
            <Textarea rows={2} placeholder="Notes (case worker, account #, etc.)" value={benDraft.notes ?? ""} onChange={(e) => setBenDraft({ ...benDraft, notes: e.target.value })} />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={saveBen}><Check className="mr-1 h-3.5 w-3.5" /> Save</Button>
              <Button size="sm" variant="ghost" onClick={() => { setCreatingBen(false); setEditingBen(false); setBenDraft({}); }}>
                <X className="mr-1 h-3.5 w-3.5" /> Cancel
              </Button>
              {editingBen && (
                <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={removeBen}>
                  <Trash2 className="mr-1 h-3.5 w-3.5" /> Remove beneficiary
                </Button>
              )}
            </div>
          </div>
        )}
      </SectionCard>

      {active && (
        <>
          {/* Summary header */}
          <SectionCard title={active.display_name}
            subtitle={
              [
                active.relationship,
                active.benefit_type,
                active.claim_number_last4 ? maskLast4(active.claim_number_last4) : null,
                active.monthly_benefit_amount ? `${fmtMoney(active.monthly_benefit_amount)}/mo expected` : null,
              ].filter(Boolean).join(" · ")
            }
            accent="calm"
            action={
              <Button size="sm" variant="ghost" onClick={() => { setEditingBen(true); setCreatingBen(false); setBenDraft({ ...active, claim_full: "" }); }}>
                <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
              </Button>
            }
          >
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-border/40 bg-card/40 p-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">This month income</p>
                <p className="font-display text-lg tabular-nums" data-money>{fmtMoney(monthIncome)}</p>
              </div>
              <div className="rounded-xl border border-border/40 bg-card/40 p-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">This month spent</p>
                <p className="font-display text-lg tabular-nums" data-money>{fmtMoney(monthExpense)}</p>
              </div>
              <div className="rounded-xl border border-border/40 bg-card/40 p-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Conserved balance</p>
                <p className="font-display text-lg tabular-nums" data-money>{fmtMoney(conservedBalance)}</p>
              </div>
              <div className="rounded-xl border border-border/40 bg-card/40 p-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Untracked this month</p>
                <p className="font-display text-lg tabular-nums" data-money>{fmtMoney(untracked)}</p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {([
                ["overview", "Overview"], ["income", "Income"], ["expenses", "Expenses"],
                ["conserved", "Conserved"], ["report", "Annual report"],
              ] as const).map(([k, l]) => (
                <button key={k} onClick={() => setView(k)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs transition",
                    view === k
                      ? "border-primary/45 bg-primary/15 text-primary"
                      : "border-border/60 bg-card/60 text-muted-foreground hover:bg-card",
                  )}>{l}</button>
              ))}
            </div>
          </SectionCard>

          {view === "overview" && (
            <SectionCard title="Recent activity" accent="calm">
              <div className="space-y-2">
                {[...income.slice(0, 3).map((r) => ({ kind: "income" as const, r })),
                  ...expenses.slice(0, 5).map((r) => ({ kind: "expense" as const, r })),
                  ...conserved.slice(0, 3).map((r) => ({ kind: "conserved" as const, r }))]
                  .sort((a, b) => b.r.date.localeCompare(a.r.date))
                  .slice(0, 8)
                  .map((row) => (
                    <div key={`${row.kind}-${row.r.id}`} className="flex items-center justify-between rounded-lg border border-border/40 bg-card/40 p-2.5">
                      <div className="flex min-w-0 items-center gap-2">
                        {row.kind === "income" && <ArrowDownRight className="h-4 w-4 text-emerald-600" />}
                        {row.kind === "expense" && <ArrowUpRight className="h-4 w-4 text-rose-500" />}
                        {row.kind === "conserved" && <PiggyBank className="h-4 w-4 text-primary" />}
                        <div className="min-w-0">
                          <p className="truncate text-sm">
                            {row.kind === "income" && `${(row.r as Income).source} deposit`}
                            {row.kind === "expense" && (catLabel((row.r as Expense).category))}
                            {row.kind === "conserved" && (Number(row.r.amount) >= 0 ? "Saved to conserved" : "Withdrew from conserved")}
                          </p>
                          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{row.r.date}{(row.r as any).note ? ` · ${(row.r as any).note}` : ""}</p>
                        </div>
                      </div>
                      <span className="tabular-nums text-sm" data-money>
                        {row.kind === "income" ? "+" : row.kind === "expense" ? "−" : (Number(row.r.amount) >= 0 ? "+" : "")}
                        {fmtMoney(Math.abs(Number(row.r.amount)))}
                      </span>
                    </div>
                  ))}
                {income.length === 0 && expenses.length === 0 && conserved.length === 0 && (
                  <p className="text-sm text-muted-foreground">No activity yet — start by logging income on the Income tab.</p>
                )}
              </div>
            </SectionCard>
          )}

          {view === "income" && (
            <SectionCard title="Income received" subtitle="Benefit deposits in trust for the beneficiary." accent="calm">
              <div className="grid gap-2 sm:grid-cols-5 sm:items-end">
                <Input type="date" value={newIncome.date ?? todayISO()} onChange={(e) => setNewIncome({ ...newIncome, date: e.target.value })} />
                <Select value={newIncome.source ?? "SSI"} onValueChange={(v) => setNewIncome({ ...newIncome, source: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{INCOME_SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
                <Input type="number" step="0.01" placeholder="Amount" value={newIncome.amount ?? ""} onChange={(e) => setNewIncome({ ...newIncome, amount: Number(e.target.value) })} />
                <Input placeholder="Note" value={newIncome.note ?? ""} onChange={(e) => setNewIncome({ ...newIncome, note: e.target.value })} />
                <Button onClick={addIncome}><Plus className="mr-1 h-3.5 w-3.5" /> Log</Button>
              </div>
              <div className="mt-3 space-y-1.5">
                {income.map((r) => (
                  <div key={r.id} className="flex items-center justify-between rounded-lg border border-border/40 bg-card/40 p-2.5 text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-normal">{r.source}</Badge>
                      <span className="text-muted-foreground tabular-nums">{r.date}</span>
                      {r.note && <span className="text-muted-foreground">· {r.note}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="tabular-nums text-emerald-600 dark:text-emerald-300" data-money>+{fmtMoney(r.amount)}</span>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => removeRow("payee_income", r.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
                {income.length === 0 && <p className="text-sm text-muted-foreground">No income logged yet.</p>}
              </div>
            </SectionCard>
          )}

          {view === "expenses" && (
            <SectionCard title="Expenses by SSA category" subtitle="Track where the beneficiary's funds are spent." accent="calm">
              <div className="grid gap-2 sm:grid-cols-6 sm:items-end">
                <Input type="date" value={newExpense.date ?? todayISO()} onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })} />
                <Select value={newExpense.category ?? "housing"} onValueChange={(v) => setNewExpense({ ...newExpense, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
                <Input placeholder="Subcategory (rent, groceries…)" value={newExpense.subcategory ?? ""} onChange={(e) => setNewExpense({ ...newExpense, subcategory: e.target.value })} />
                <Input type="number" step="0.01" placeholder="Amount" value={newExpense.amount ?? ""} onChange={(e) => setNewExpense({ ...newExpense, amount: Number(e.target.value) })} />
                <Input placeholder="Note" value={newExpense.note ?? ""} onChange={(e) => setNewExpense({ ...newExpense, note: e.target.value })} />
                <Button onClick={addExpense}><Plus className="mr-1 h-3.5 w-3.5" /> Add</Button>
              </div>
              <div className="mt-3 space-y-1.5">
                {expenses.map((r) => (
                  <div key={r.id} className="flex items-center justify-between rounded-lg border border-border/40 bg-card/40 p-2.5 text-sm">
                    <div className="flex min-w-0 items-center gap-2">
                      <Badge variant="outline" className={cn("font-normal", catStyle(r.category))}>{catLabel(r.category)}</Badge>
                      <span className="text-muted-foreground tabular-nums">{r.date}</span>
                      {r.subcategory && <span className="truncate">· {r.subcategory}</span>}
                      {r.note && <span className="truncate text-muted-foreground">· {r.note}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="tabular-nums" data-money>−{fmtMoney(r.amount)}</span>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => removeRow("payee_expenses", r.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
                {expenses.length === 0 && <p className="text-sm text-muted-foreground">No expenses logged yet.</p>}
              </div>
            </SectionCard>
          )}

          {view === "conserved" && (
            <SectionCard title="Conserved funds" subtitle="Funds saved for the beneficiary — belong to them, not to you." accent="calm">
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm">
                Current balance: <span className="font-medium tabular-nums" data-money>{fmtMoney(conservedBalance)}</span>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-5 sm:items-end">
                <Input type="date" value={newConserved.date ?? todayISO()} onChange={(e) => setNewConserved({ ...newConserved, date: e.target.value })} />
                <Input type="number" step="0.01" placeholder="+ deposit / − withdrawal" value={newConserved.amount ?? ""} onChange={(e) => setNewConserved({ ...newConserved, amount: Number(e.target.value) })} />
                <Input placeholder="Account label" value={newConserved.account_label ?? ""} onChange={(e) => setNewConserved({ ...newConserved, account_label: e.target.value })} />
                <Input placeholder="Note" value={newConserved.note ?? ""} onChange={(e) => setNewConserved({ ...newConserved, note: e.target.value })} />
                <Button onClick={addConserved}><Plus className="mr-1 h-3.5 w-3.5" /> Log</Button>
              </div>
              <div className="mt-3 space-y-1.5">
                {conserved.map((r) => {
                  const pos = Number(r.amount) >= 0;
                  return (
                    <div key={r.id} className="flex items-center justify-between rounded-lg border border-border/40 bg-card/40 p-2.5 text-sm">
                      <div className="flex min-w-0 items-center gap-2">
                        <Badge variant="outline" className="font-normal">{pos ? "Deposit" : "Withdrawal"}</Badge>
                        <span className="text-muted-foreground tabular-nums">{r.date}</span>
                        {r.account_label && <span>· {r.account_label}</span>}
                        {r.note && <span className="text-muted-foreground">· {r.note}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn("tabular-nums", pos ? "text-emerald-600 dark:text-emerald-300" : "text-rose-600 dark:text-rose-300")} data-money>
                          {pos ? "+" : "−"}{fmtMoney(Math.abs(Number(r.amount)))}
                        </span>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => removeRow("payee_conserved_funds", r.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {conserved.length === 0 && <p className="text-sm text-muted-foreground">No conserved transactions yet.</p>}
              </div>
            </SectionCard>
          )}

          {view === "report" && (
            <SectionCard
              title="Annual accounting report"
              subtitle="Aligned with the SSA Representative Payee Report (Form SSA-6230)."
              accent="calm"
              action={
                <div className="flex items-center gap-2">
                  <Select value={String(reportYear)} onValueChange={(v) => setReportYear(Number(v))}>
                    <SelectTrigger className="h-8 w-[110px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                        <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="outline" onClick={exportCSV}><Download className="mr-1 h-3.5 w-3.5" /> CSV</Button>
                  <Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="mr-1 h-3.5 w-3.5" /> Print</Button>
                </div>
              }
            >
              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Income received in {reportYear}</p>
                  <div className="mt-1 divide-y divide-border/40 rounded-lg border border-border/40">
                    {INCOME_SOURCES.map((s) => (
                      <div key={s} className="flex justify-between px-3 py-2">
                        <span>{s}</span>
                        <span className="tabular-nums" data-money>{fmtMoney(reportData.incomeBySource[s])}</span>
                      </div>
                    ))}
                    <div className="flex justify-between px-3 py-2 font-medium">
                      <span>Total income</span>
                      <span className="tabular-nums" data-money>{fmtMoney(reportData.totalIncome)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Expenses by category</p>
                  <div className="mt-1 divide-y divide-border/40 rounded-lg border border-border/40">
                    {CATEGORIES.map((c) => (
                      <div key={c.value} className="flex justify-between px-3 py-2">
                        <span>{c.label}</span>
                        <span className="tabular-nums" data-money>{fmtMoney(reportData.expensesByCat[c.value])}</span>
                      </div>
                    ))}
                    <div className="flex justify-between px-3 py-2 font-medium">
                      <span>Total expenses</span>
                      <span className="tabular-nums" data-money>{fmtMoney(reportData.totalExpenses)}</span>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-border/40 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Net to conserved funds in {reportYear}</p>
                    <p className="mt-1 font-display text-xl tabular-nums" data-money>
                      {reportData.savedDelta >= 0 ? "+" : "−"}{fmtMoney(Math.abs(reportData.savedDelta))}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/40 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Current conserved balance</p>
                    <p className="mt-1 font-display text-xl tabular-nums" data-money>{fmtMoney(conservedBalance)}</p>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  This summary is provided as a record-keeping aid. Always verify totals against your bank statements before submitting the official SSA report.
                </p>
              </div>
            </SectionCard>
          )}
        </>
      )}
    </div>
  );
}