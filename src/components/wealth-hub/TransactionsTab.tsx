import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SectionCard } from "@/components/cards/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, X, Search, Plus } from "lucide-react";
import { toast } from "sonner";
import { todayISO, fmtMoney } from "@/lib/wealth-utils";
import { cn } from "@/lib/utils";

type Tx = {
  id: string;
  date: string;
  amount: number;
  kind: string;
  category_id: string | null;
  note: string | null;
  account: string | null;
  status: string;
  tags: string[];
};

type GroupBy = "date" | "category" | "kind";

/** Parse a quick-add string like "rent 1800 housing" or "+ paycheck 2500" */
function parseQuick(input: string, cats: any[]): Partial<Tx> | null {
  const t = input.trim();
  if (!t) return null;
  const isIncome = /^\+|paycheck|salary|deposit|refund|income/i.test(t);
  const amtMatch = t.match(/(-?\$?\d+(?:[\.,]\d{1,2})?)/);
  const amount = amtMatch ? Number(amtMatch[1].replace(/[$,]/g, "")) : NaN;
  if (!isFinite(amount) || amount === 0) return null;
  let note = t.replace(amtMatch![0], "").replace(/^\+\s*/, "").trim();
  // try category match from trailing word(s)
  let category_id: string | null = null;
  for (const c of cats) {
    const re = new RegExp(`\\b${c.name}\\b`, "i");
    if (re.test(note)) {
      category_id = c.id;
      note = note.replace(re, "").trim();
      break;
    }
  }
  return {
    amount: Math.abs(amount),
    kind: isIncome ? "income" : "expense",
    note: note || null,
    category_id,
    date: todayISO(),
  };
}

export function TransactionsTab({ uid }: { uid: string }) {
  const [tx, setTx] = useState<Tx[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [quick, setQuick] = useState("");
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<"all" | "income" | "expense">("all");
  const [groupBy, setGroupBy] = useState<GroupBy>("date");
  const [editingId, setEditingId] = useState<string | null>(null);

  async function load() {
    const [{ data: t }, { data: c }] = await Promise.all([
      supabase.from("transactions").select("*").eq("user_id", uid).order("date", { ascending: false }).limit(500),
      supabase.from("budget_categories").select("*").eq("user_id", uid).order("sort_order"),
    ]);
    setTx((t ?? []) as Tx[]);
    setCats(c ?? []);
  }
  useEffect(() => { load(); }, [uid]);

  async function quickAdd() {
    const parsed = parseQuick(quick, cats);
    if (!parsed) return toast.error('Try "rent 1800 housing" or "+ paycheck 2500"');
    const { error } = await supabase.from("transactions").insert({
      user_id: uid,
      amount: parsed.amount as number,
      date: parsed.date,
      kind: parsed.kind,
      category_id: parsed.category_id ?? null,
      note: parsed.note ?? null,
    });
    if (error) return toast.error(error.message);
    setQuick("");
    toast.success(`Added ${parsed.kind} ${fmtMoney(parsed.amount as number)}`);
    load();
  }

  async function saveEdit(id: string, patch: Partial<Tx>) {
    const { error } = await supabase.from("transactions").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    setEditingId(null);
    load();
  }

  async function del(id: string) {
    await supabase.from("transactions").delete().eq("id", id);
    load();
  }

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return tx.filter((t) => {
      if (kindFilter !== "all" && t.kind !== kindFilter) return false;
      if (!s) return true;
      const cat = cats.find((c) => c.id === t.category_id)?.name?.toLowerCase() ?? "";
      return (t.note ?? "").toLowerCase().includes(s) || cat.includes(s) || String(t.amount).includes(s);
    });
  }, [tx, cats, search, kindFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, Tx[]>();
    for (const t of filtered) {
      let k = t.date;
      if (groupBy === "category") k = cats.find((c) => c.id === t.category_id)?.name ?? "Uncategorized";
      if (groupBy === "kind") k = t.kind === "income" ? "Income" : "Expense";
      const arr = map.get(k) ?? [];
      arr.push(t);
      map.set(k, arr);
    }
    return [...map.entries()];
  }, [filtered, cats, groupBy]);

  const totalIncome = filtered.filter((t) => t.kind === "income").reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = filtered.filter((t) => t.kind === "expense").reduce((s, t) => s + Number(t.amount), 0);

  return (
    <div className="space-y-4">
      <SectionCard accent="calm" title="Transactions" subtitle="A gentle ledger of money flowing through your life.">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Plus className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder='Quick add: "rent 1800 housing"  or  "+ paycheck 2500"'
              value={quick}
              onChange={(e) => setQuick(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && quickAdd()}
            />
          </div>
          <Button onClick={quickAdd}>Add</Button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-8" placeholder="Search note, category, amount" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={kindFilter} onValueChange={(v) => setKindFilter(v as any)}>
            <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All kinds</SelectItem>
              <SelectItem value="income">Income</SelectItem>
              <SelectItem value="expense">Expense</SelectItem>
            </SelectContent>
          </Select>
          <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Group by date</SelectItem>
              <SelectItem value="category">Group by category</SelectItem>
              <SelectItem value="kind">Group by kind</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-xl bg-emerald-500/10 px-3 py-2">
            <div className="text-muted-foreground">Income</div>
            <div className="font-semibold text-emerald-600 dark:text-emerald-300 tabular-nums">{fmtMoney(totalIncome)}</div>
          </div>
          <div className="rounded-xl bg-amber-500/10 px-3 py-2">
            <div className="text-muted-foreground">Expense</div>
            <div className="font-semibold text-amber-700 dark:text-amber-300 tabular-nums">{fmtMoney(totalExpense)}</div>
          </div>
          <div className="rounded-xl bg-primary/10 px-3 py-2">
            <div className="text-muted-foreground">Net</div>
            <div className="font-semibold tabular-nums">{fmtMoney(totalIncome - totalExpense)}</div>
          </div>
        </div>
      </SectionCard>

      <div className="space-y-3">
        {grouped.length === 0 && (
          <SectionCard accent="warm"><p className="py-6 text-center text-sm text-muted-foreground">No transactions yet — start with a single line above.</p></SectionCard>
        )}
        {grouped.map(([key, items]) => {
          const sum = items.reduce((s, t) => s + (t.kind === "income" ? Number(t.amount) : -Number(t.amount)), 0);
          return (
            <SectionCard key={key} accent="warm" title={key} subtitle={`${items.length} item${items.length === 1 ? "" : "s"} · net ${fmtMoney(sum)}`}>
              <ul className="space-y-2">
                {items.map((t) => {
                  const cat = cats.find((c) => c.id === t.category_id);
                  const isEditing = editingId === t.id;
                  return (
                    <li key={t.id} className="rounded-xl border border-border/60 bg-card/60 p-3">
                      {isEditing ? (
                        <EditRow tx={t} cats={cats} onCancel={() => setEditingId(null)} onSave={(p) => saveEdit(t.id, p)} />
                      ) : (
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="truncate font-medium">{t.note || cat?.name || "Untitled"}</span>
                              {cat && <Badge variant="outline" className="text-[10px]">{cat.name}</Badge>}
                              {(t.tags ?? []).map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-[10px]">#{tag}</Badge>
                              ))}
                            </div>
                            <div className="mt-0.5 text-xs text-muted-foreground">{t.date}{t.account ? ` · ${t.account}` : ""}</div>
                          </div>
                          <div className={cn("font-semibold tabular-nums", t.kind === "income" ? "text-emerald-600 dark:text-emerald-300" : "text-foreground")}>
                            {t.kind === "income" ? "+" : "−"}{fmtMoney(t.amount)}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingId(t.id)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => del(t.id)}>
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
          );
        })}
      </div>
    </div>
  );
}

function EditRow({ tx, cats, onCancel, onSave }: {
  tx: Tx; cats: any[]; onCancel: () => void; onSave: (p: Partial<Tx>) => void;
}) {
  const [date, setDate] = useState(tx.date);
  const [amount, setAmount] = useState(String(tx.amount));
  const [kind, setKind] = useState(tx.kind);
  const [catId, setCatId] = useState(tx.category_id ?? "");
  const [note, setNote] = useState(tx.note ?? "");
  const [tagsStr, setTagsStr] = useState((tx.tags ?? []).join(", "));
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-7">
      <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      <Select value={kind} onValueChange={setKind}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="expense">Expense</SelectItem>
          <SelectItem value="income">Income</SelectItem>
        </SelectContent>
      </Select>
      <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
      <Select value={catId || "none"} onValueChange={(v) => setCatId(v === "none" ? "" : v)}>
        <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No category</SelectItem>
          {cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
        </SelectContent>
      </Select>
      <Input className="sm:col-span-2" placeholder="Note" value={note} onChange={(e) => setNote(e.target.value)} />
      <div className="flex gap-1">
        <Button size="sm" className="h-9 flex-1" onClick={() => onSave({
          date, amount: Number(amount) || 0, kind, category_id: catId || null, note: note || null,
          tags: tagsStr.split(",").map((s) => s.trim()).filter(Boolean),
        })}>Save</Button>
        <Button size="icon" variant="ghost" className="h-9 w-9" onClick={onCancel}><X className="h-4 w-4" /></Button>
      </div>
      <Input className="sm:col-span-7" placeholder="Tags (comma-separated)" value={tagsStr} onChange={(e) => setTagsStr(e.target.value)} />
    </div>
  );
}