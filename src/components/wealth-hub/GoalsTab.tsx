import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SectionCard } from "@/components/cards/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Pencil, X, Check, Sprout, PiggyBank, Target } from "lucide-react";
import { toast } from "sonner";
import { fmtMoney, todayISO, CADENCES, daysUntil } from "@/lib/wealth-utils";
import { cn } from "@/lib/utils";

type Goal = {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  color: string | null;
  icon: string | null;
  priority: string;
  status: string;
  notes: string | null;
  contribution_cadence: string | null;
  contribution_amount: number | null;
};

type Contribution = {
  id: string;
  goal_id: string;
  amount: number;
  date: string;
  note: string | null;
};

const PRESET_COLORS = ["#a7c4a0", "#c9b99a", "#a8c0c8", "#d4b5d4", "#e8c5a0", "#b8a0c8"];

function ProgressRing({ pct, color = "hsl(var(--primary))" }: { pct: number; color?: string }) {
  const r = 28, c = 2 * Math.PI * r;
  const off = c * (1 - Math.min(1, Math.max(0, pct / 100)));
  return (
    <svg width="68" height="68" viewBox="0 0 68 68" className="shrink-0">
      <circle cx="34" cy="34" r={r} stroke="hsl(var(--muted))" strokeWidth="6" fill="none" />
      <circle
        cx="34" cy="34" r={r} stroke={color} strokeWidth="6" fill="none"
        strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off}
        transform="rotate(-90 34 34)" style={{ transition: "stroke-dashoffset .6s ease" }}
      />
      <text x="34" y="38" textAnchor="middle" className="fill-foreground" style={{ fontSize: 13, fontWeight: 600 }}>
        {Math.round(pct)}%
      </text>
    </svg>
  );
}

export function GoalsTab({ uid }: { uid: string }) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [contribs, setContribs] = useState<Contribution[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<Goal>>({});
  const [creating, setCreating] = useState(false);
  const [newG, setNewG] = useState<Partial<Goal>>({
    name: "", target_amount: 0, current_amount: 0, priority: "medium",
    color: PRESET_COLORS[0], status: "active",
  });
  const [contribFor, setContribFor] = useState<string | null>(null);
  const [contribAmt, setContribAmt] = useState("");

  async function load() {
    const [g, c] = await Promise.all([
      supabase.from("savings_goals").select("*").eq("user_id", uid).order("sort_order").order("created_at"),
      supabase.from("goal_contributions").select("*").eq("user_id", uid).order("date", { ascending: false }).limit(200),
    ]);
    setGoals((g.data ?? []) as Goal[]);
    setContribs((c.data ?? []) as Contribution[]);
  }
  useEffect(() => { load(); }, [uid]);

  async function create() {
    if (!newG.name?.trim()) { toast.error("Give your goal a name"); return; }
    const { error } = await supabase.from("savings_goals").insert({
      user_id: uid,
      name: newG.name!.trim(),
      target_amount: Number(newG.target_amount) || 0,
      current_amount: Number(newG.current_amount) || 0,
      target_date: newG.target_date || null,
      color: newG.color || PRESET_COLORS[0],
      priority: newG.priority || "medium",
      status: "active",
      contribution_cadence: newG.contribution_cadence || null,
      contribution_amount: newG.contribution_amount ? Number(newG.contribution_amount) : null,
      notes: newG.notes || null,
    });
    if (error) { toast.error(error.message); return; }
    setCreating(false);
    setNewG({ name: "", target_amount: 0, current_amount: 0, priority: "medium", color: PRESET_COLORS[0], status: "active" });
    load();
    toast.success("Goal planted 🌱");
  }

  async function saveEdit(id: string) {
    const { error } = await supabase.from("savings_goals").update({
      name: draft.name,
      target_amount: Number(draft.target_amount) || 0,
      current_amount: Number(draft.current_amount) || 0,
      target_date: draft.target_date || null,
      color: draft.color,
      priority: draft.priority,
      contribution_cadence: draft.contribution_cadence || null,
      contribution_amount: draft.contribution_amount ? Number(draft.contribution_amount) : null,
      notes: draft.notes || null,
    }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    setEditing(null); setDraft({}); load();
  }

  async function remove(id: string) {
    if (!confirm("Archive this goal? Contributions will be kept.")) return;
    await supabase.from("savings_goals").delete().eq("id", id);
    load();
  }

  async function addContribution(goal: Goal) {
    const amt = Number(contribAmt);
    if (!amt || amt <= 0) { toast.error("Enter an amount"); return; }
    const milestoneBefore = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0;
    const after = goal.current_amount + amt;
    const milestoneAfter = goal.target_amount > 0 ? (after / goal.target_amount) * 100 : 0;

    const { error } = await supabase.from("goal_contributions").insert({
      user_id: uid, goal_id: goal.id, amount: amt, date: todayISO(),
    });
    if (error) { toast.error(error.message); return; }
    await supabase.from("savings_goals").update({ current_amount: after }).eq("id", goal.id);

    // milestone celebration
    const crossed = [25, 50, 75, 100].find((m) => milestoneBefore < m && milestoneAfter >= m);
    if (crossed === 100) toast.success(`🎉 You reached ${goal.name}! Beautiful.`);
    else if (crossed) toast.success(`✨ ${crossed}% of the way to ${goal.name}`);
    else toast.success(`+${fmtMoney(amt)} toward ${goal.name}`);

    setContribFor(null); setContribAmt("");
    load();
  }

  const totals = useMemo(() => {
    const saved = goals.reduce((s, g) => s + Number(g.current_amount || 0), 0);
    const target = goals.reduce((s, g) => s + Number(g.target_amount || 0), 0);
    return { saved, target, pct: target > 0 ? (saved / target) * 100 : 0 };
  }, [goals]);

  return (
    <div className="space-y-4">
      <SectionCard title="Savings goals" accent="calm"
        action={
          <Button size="sm" variant="outline" onClick={() => setCreating((v) => !v)}>
            <Plus className="mr-1 h-3.5 w-3.5" /> New goal
          </Button>
        }
      >
        <div className="flex items-center gap-4 rounded-xl border border-border/40 bg-card/40 p-4">
          <ProgressRing pct={totals.pct} />
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">All goals together</p>
            <p className="font-display text-xl tabular-nums">{fmtMoney(totals.saved)} <span className="text-sm text-muted-foreground">of {fmtMoney(totals.target)}</span></p>
            <p className="text-xs text-muted-foreground">{goals.length} active {goals.length === 1 ? "goal" : "goals"} — small steps add up.</p>
          </div>
        </div>

        {creating && (
          <div className="mt-3 space-y-2 rounded-xl border border-primary/30 bg-primary/5 p-4">
            <div className="grid gap-2 sm:grid-cols-2">
              <Input placeholder="Goal name (e.g. Vacation fund)" value={newG.name ?? ""} onChange={(e) => setNewG({ ...newG, name: e.target.value })} />
              <Input type="number" step="0.01" placeholder="Target amount" value={newG.target_amount ?? ""} onChange={(e) => setNewG({ ...newG, target_amount: Number(e.target.value) })} />
              <Input type="number" step="0.01" placeholder="Already saved" value={newG.current_amount ?? ""} onChange={(e) => setNewG({ ...newG, current_amount: Number(e.target.value) })} />
              <Input type="date" value={newG.target_date ?? ""} onChange={(e) => setNewG({ ...newG, target_date: e.target.value })} />
              <Select value={newG.contribution_cadence ?? "none"} onValueChange={(v) => setNewG({ ...newG, contribution_cadence: v === "none" ? null : v })}>
                <SelectTrigger><SelectValue placeholder="Auto contribution" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No recurring contribution</SelectItem>
                  {CADENCES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input type="number" step="0.01" placeholder="Contribution amount" value={newG.contribution_amount ?? ""} onChange={(e) => setNewG({ ...newG, contribution_amount: Number(e.target.value) })} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">Color:</span>
              {PRESET_COLORS.map((c) => (
                <button key={c} onClick={() => setNewG({ ...newG, color: c })}
                  className={cn("h-6 w-6 rounded-full border-2 transition", newG.color === c ? "border-foreground scale-110" : "border-transparent")}
                  style={{ backgroundColor: c }} aria-label={c} />
              ))}
            </div>
            <Textarea placeholder="Notes (optional)" value={newG.notes ?? ""} onChange={(e) => setNewG({ ...newG, notes: e.target.value })} rows={2} />
            <div className="flex gap-2">
              <Button size="sm" onClick={create}><Check className="mr-1 h-3.5 w-3.5" /> Create goal</Button>
              <Button size="sm" variant="ghost" onClick={() => setCreating(false)}><X className="mr-1 h-3.5 w-3.5" /> Cancel</Button>
            </div>
          </div>
        )}

        {goals.length === 0 && !creating && (
          <p className="mt-3 text-sm text-muted-foreground">
            No goals yet. Start with one small intention — even $5/week becomes $260 a year.
          </p>
        )}

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {goals.map((g) => {
            const pct = g.target_amount > 0 ? (g.current_amount / g.target_amount) * 100 : 0;
            const remaining = Math.max(0, g.target_amount - g.current_amount);
            const dd = daysUntil(g.target_date);
            const isEdit = editing === g.id;
            const recentCs = contribs.filter((c) => c.goal_id === g.id).slice(0, 3);

            return (
              <div key={g.id} className="rounded-xl border border-border/50 bg-card/60 p-4"
                style={{ borderColor: g.color ? `${g.color}55` : undefined, background: g.color ? `${g.color}10` : undefined }}>
                {!isEdit ? (
                  <>
                    <div className="flex items-start gap-3">
                      <ProgressRing pct={pct} color={g.color ?? "hsl(var(--primary))"} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate font-medium">{g.name}</p>
                            <p className="text-xs text-muted-foreground tabular-nums">
                              {fmtMoney(g.current_amount)} of {fmtMoney(g.target_amount)}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                              onClick={() => { setEditing(g.id); setDraft(g); }}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                              onClick={() => remove(g.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                          {remaining > 0 ? (
                            <Badge variant="outline" className="font-normal"><Target className="mr-1 h-3 w-3" /> {fmtMoney(remaining)} to go</Badge>
                          ) : (
                            <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
                              <Sprout className="mr-1 h-3 w-3" /> Reached
                            </Badge>
                          )}
                          {dd !== null && remaining > 0 && (
                            <Badge variant="outline" className="font-normal">
                              {dd < 0 ? `${Math.abs(dd)}d past target` : `${dd}d to target`}
                            </Badge>
                          )}
                          {g.contribution_amount && g.contribution_cadence && (
                            <Badge variant="outline" className="font-normal">
                              {fmtMoney(g.contribution_amount)} {g.contribution_cadence}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {contribFor === g.id ? (
                      <div className="mt-3 flex gap-2">
                        <Input type="number" step="0.01" placeholder="Amount" value={contribAmt}
                          onChange={(e) => setContribAmt(e.target.value)} autoFocus
                          onKeyDown={(e) => e.key === "Enter" && addContribution(g)} />
                        <Button size="sm" onClick={() => addContribution(g)}>Add</Button>
                        <Button size="sm" variant="ghost" onClick={() => { setContribFor(null); setContribAmt(""); }}>Cancel</Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" className="mt-3 w-full" onClick={() => setContribFor(g.id)}>
                        <PiggyBank className="mr-1 h-3.5 w-3.5" /> Add contribution
                      </Button>
                    )}

                    {recentCs.length > 0 && (
                      <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                        {recentCs.map((c) => (
                          <div key={c.id} className="flex justify-between">
                            <span>{c.date}</span>
                            <span className="tabular-nums text-foreground">+{fmtMoney(c.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-2">
                    <Input value={draft.name ?? ""} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                    <div className="grid grid-cols-2 gap-2">
                      <Input type="number" step="0.01" placeholder="Target" value={draft.target_amount ?? 0}
                        onChange={(e) => setDraft({ ...draft, target_amount: Number(e.target.value) })} />
                      <Input type="number" step="0.01" placeholder="Saved" value={draft.current_amount ?? 0}
                        onChange={(e) => setDraft({ ...draft, current_amount: Number(e.target.value) })} />
                      <Input type="date" value={draft.target_date ?? ""} onChange={(e) => setDraft({ ...draft, target_date: e.target.value })} />
                      <Select value={draft.priority ?? "medium"} onValueChange={(v) => setDraft({ ...draft, priority: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low priority</SelectItem>
                          <SelectItem value="medium">Medium priority</SelectItem>
                          <SelectItem value="high">High priority</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {PRESET_COLORS.map((c) => (
                        <button key={c} onClick={() => setDraft({ ...draft, color: c })}
                          className={cn("h-5 w-5 rounded-full border-2", draft.color === c ? "border-foreground" : "border-transparent")}
                          style={{ backgroundColor: c }} />
                      ))}
                    </div>
                    <Textarea rows={2} value={draft.notes ?? ""} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => saveEdit(g.id)}><Check className="mr-1 h-3.5 w-3.5" /> Save</Button>
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