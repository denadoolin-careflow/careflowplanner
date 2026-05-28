import { useEffect, useMemo, useState } from "react";
import { Wallet, Plus, Link2, Target, X, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import type { Project } from "@/lib/types";
import {
  centsToDollars, dollarsToCents, fmtUSD,
  listAllSavingsGoals, listAllTransactions, loadProjectFinance, projectSpend,
  type SavingsGoal, type WealthTx,
} from "@/lib/project-finance";

export function ResourcesCard({ project }: { project: Project }) {
  const { user, updateProject } = useStore();
  const uid = user?.id ?? null;

  const txIds = project.linkedTransactionIds ?? [];
  const goalIds = project.linkedSavingsGoalIds ?? [];

  const [linkedTx, setLinkedTx] = useState<WealthTx[]>([]);
  const [linkedGoals, setLinkedGoals] = useState<SavingsGoal[]>([]);
  const [allTx, setAllTx] = useState<WealthTx[] | null>(null);
  const [allGoals, setAllGoals] = useState<SavingsGoal[] | null>(null);
  const [budgetInput, setBudgetInput] = useState(
    project.budgetCents != null ? String(centsToDollars(project.budgetCents)) : "",
  );

  useEffect(() => {
    if (!uid) return;
    loadProjectFinance({ uid, transactionIds: txIds, savingsGoalIds: goalIds })
      .then(({ transactions, goals }) => {
        setLinkedTx(transactions);
        setLinkedGoals(goals);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, txIds.join(","), goalIds.join(",")]);

  useEffect(() => {
    setBudgetInput(project.budgetCents != null ? String(centsToDollars(project.budgetCents)) : "");
  }, [project.budgetCents]);

  const spent = useMemo(() => projectSpend(linkedTx), [linkedTx]);
  const budget = centsToDollars(project.budgetCents);
  const remaining = Math.max(0, budget - spent);
  const spentPct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
  const overBudget = budget > 0 && spent > budget;

  const commitBudget = () => {
    const n = Number(budgetInput.replace(/[, $]/g, ""));
    if (budgetInput.trim() === "") {
      updateProject(project.id, { budgetCents: undefined });
    } else if (isFinite(n) && n >= 0) {
      updateProject(project.id, { budgetCents: dollarsToCents(n) });
    }
  };

  const loadPickerTx = async () => {
    if (allTx || !uid) return;
    setAllTx(await listAllTransactions(uid));
  };
  const loadPickerGoals = async () => {
    if (allGoals || !uid) return;
    setAllGoals(await listAllSavingsGoals(uid));
  };

  const toggleTx = (id: string) => {
    const next = txIds.includes(id) ? txIds.filter(x => x !== id) : [...txIds, id];
    updateProject(project.id, { linkedTransactionIds: next });
  };
  const toggleGoal = (id: string) => {
    const next = goalIds.includes(id) ? goalIds.filter(x => x !== id) : [...goalIds, id];
    updateProject(project.id, { linkedSavingsGoalIds: next });
  };

  return (
    <section className="rounded-2xl border border-border/60 bg-card/60 p-4 animate-fade-in">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Wallet className="h-3.5 w-3.5 text-primary" /> Resources & budget
        </div>
        <Link to="/wealth" className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
          Wealth hub <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-1">
          <label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Planned budget</label>
          <div className="mt-1 flex items-center gap-1">
            <span className="text-sm text-muted-foreground">$</span>
            <Input
              inputMode="decimal"
              value={budgetInput}
              onChange={(e) => setBudgetInput(e.target.value)}
              onBlur={commitBudget}
              onKeyDown={(e) => { if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur(); }}
              placeholder="0"
              className="h-9 text-sm"
            />
          </div>
        </div>
        <div className="rounded-xl border border-border/40 bg-background/40 p-2.5 sm:col-span-2">
          <div className="flex items-baseline justify-between text-[11px] text-muted-foreground">
            <span>Spent</span>
            <span className={cn("font-semibold tabular-nums", overBudget ? "text-destructive" : "text-foreground")}>
              {fmtUSD(spent)}{budget > 0 && <span className="ml-1 text-muted-foreground">/ {fmtUSD(budget)}</span>}
            </span>
          </div>
          <Progress
            value={budget > 0 ? spentPct : 0}
            className={cn("mt-1.5 h-1.5", overBudget && "[&>div]:bg-destructive")}
          />
          {budget > 0 && (
            <p className="mt-1 text-[11px] text-muted-foreground tabular-nums">
              {overBudget ? `${fmtUSD(spent - budget)} over` : `${fmtUSD(remaining)} remaining`}
            </p>
          )}
        </div>
      </div>

      {/* Linked transactions */}
      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Expenses & income</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={loadPickerTx}>
                <Plus className="h-3 w-3" /> Link transaction
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <TransactionPicker
                items={allTx}
                selectedIds={txIds}
                onToggle={toggleTx}
              />
            </PopoverContent>
          </Popover>
        </div>
        {linkedTx.length === 0 ? (
          <p className="text-xs text-muted-foreground/80">No transactions linked yet.</p>
        ) : (
          <ul className="space-y-1">
            {linkedTx.map(t => (
              <li key={t.id} className="flex items-center justify-between gap-2 rounded-lg border border-border/40 bg-background/40 px-2.5 py-1.5 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="truncate">{t.note || (t.kind === "income" ? "Income" : "Expense")}</div>
                  <div className="text-[10px] text-muted-foreground tabular-nums">{t.date}</div>
                </div>
                <span className={cn("font-medium tabular-nums", t.kind === "income" ? "text-emerald-500" : "text-foreground")}>
                  {t.kind === "income" ? "+" : "−"}{fmtUSD(Math.abs(t.amount))}
                </span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleTx(t.id)} aria-label="Unlink">
                  <X className="h-3 w-3" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Linked savings goals */}
      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Savings goals</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={loadPickerGoals}>
                <Link2 className="h-3 w-3" /> Link savings
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <SavingsPicker
                items={allGoals}
                selectedIds={goalIds}
                onToggle={toggleGoal}
              />
            </PopoverContent>
          </Popover>
        </div>
        {linkedGoals.length === 0 ? (
          <p className="text-xs text-muted-foreground/80">No savings goals linked yet.</p>
        ) : (
          <ul className="space-y-2">
            {linkedGoals.map(g => {
              const pct = g.target_amount > 0 ? Math.min(100, Math.round((g.current_amount / g.target_amount) * 100)) : 0;
              return (
                <li key={g.id} className="rounded-lg border border-border/40 bg-background/40 px-2.5 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-sm">
                      <Target className="h-3 w-3 text-primary" />
                      <span className="truncate">{g.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] tabular-nums text-muted-foreground">
                      <span>{fmtUSD(g.current_amount)} / {fmtUSD(g.target_amount)}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleGoal(g.id)} aria-label="Unlink">
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <Progress value={pct} className="mt-1.5 h-1.5" />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

function TransactionPicker({
  items, selectedIds, onToggle,
}: { items: WealthTx[] | null; selectedIds: string[]; onToggle: (id: string) => void }) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    if (!items) return [];
    const t = q.trim().toLowerCase();
    if (!t) return items.slice(0, 50);
    return items.filter(x => (x.note ?? "").toLowerCase().includes(t) || x.date.includes(t)).slice(0, 50);
  }, [items, q]);
  return (
    <div className="flex flex-col">
      <div className="border-b p-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search transactions…" className="h-8 text-sm" autoFocus />
      </div>
      <div className="max-h-72 overflow-y-auto">
        {items == null ? (
          <p className="p-3 text-xs text-muted-foreground">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="p-3 text-xs text-muted-foreground">No transactions found.</p>
        ) : (
          <ul>
            {filtered.map(t => {
              const on = selectedIds.includes(t.id);
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => onToggle(t.id)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted/60",
                      on && "bg-primary/10",
                    )}
                  >
                    <div className="min-w-0">
                      <div className="truncate">{t.note || (t.kind === "income" ? "Income" : "Expense")}</div>
                      <div className="text-[10px] text-muted-foreground tabular-nums">{t.date}</div>
                    </div>
                    <span className={cn("tabular-nums", t.kind === "income" ? "text-emerald-500" : "text-foreground")}>
                      {t.kind === "income" ? "+" : "−"}{fmtUSD(Math.abs(t.amount))}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function SavingsPicker({
  items, selectedIds, onToggle,
}: { items: SavingsGoal[] | null; selectedIds: string[]; onToggle: (id: string) => void }) {
  return (
    <div className="max-h-72 overflow-y-auto">
      {items == null ? (
        <p className="p-3 text-xs text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <p className="p-3 text-xs text-muted-foreground">No savings goals yet. Create one in the Wealth hub.</p>
      ) : (
        <ul>
          {items.map(g => {
            const on = selectedIds.includes(g.id);
            return (
              <li key={g.id}>
                <button
                  type="button"
                  onClick={() => onToggle(g.id)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted/60",
                    on && "bg-primary/10",
                  )}
                >
                  <span className="truncate">{g.name}</span>
                  <span className="text-[11px] tabular-nums text-muted-foreground">
                    {fmtUSD(g.current_amount)} / {fmtUSD(g.target_amount)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}