import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Gift, Heart, Flag, Mountain, Cake, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { TodaysRhythmCard } from "@/components/calendar/TodaysRhythmCard";
import { useStore } from "@/lib/store";
import { useCelebrations, useBucketLists, useBucketItems, useTraditions, useTraditionItems, useSeasonalGoals, useMemoryBook, useHolidayPlans } from "@/lib/seasons/hooks";
import { SEASON_META, seasonFor, daysLeftInSeason, daysUntilDate, ageOn } from "@/lib/seasons/season-utils";
import { usHolidaysFor } from "@/lib/us-holidays";
import { format, parseISO } from "date-fns";
import { CelebrationEditor } from "@/components/seasons/CelebrationEditor";

const ICONS: Record<string, any> = { birthday: Cake, anniversary: Heart, special_event: Sparkles, family_milestone: Mountain, care_milestone: Heart, therapy_win: Sparkles, adoption: Heart, graduation: Flag, custom: Sparkles };

export default function Seasons() {
  const today = new Date();
  const season = seasonFor(today);
  const meta = SEASON_META[season];
  const { days } = daysLeftInSeason(today);
  const { state } = useStore();
  const { celebrations, add: addCeleb } = useCelebrations();
  const { lists } = useBucketLists();
  const { traditions } = useTraditions();
  const { entries: memoryEntries } = useMemoryBook();
  const { plans } = useHolidayPlans();
  const { goals, add: addGoal, toggle: toggleGoal } = useSeasonalGoals(season, today.getFullYear());
  const [editorOpen, setEditorOpen] = useState(false);

  const upcomingCelebrations = useMemo(() => {
    const todayIso = today.toISOString().slice(0,10);
    return [...celebrations]
      .filter(c => c.date >= todayIso)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 6);
  }, [celebrations, today]);

  const upcomingBirthdays = useMemo(() => {
    const out: Array<{ id: string; name: string; date: string; days: number }> = [];
    const ty = today.getFullYear();
    for (const b of state.birthdays) {
      const [, m, d] = b.date.split("-").map(Number);
      let nxt = new Date(ty, m - 1, d);
      if (nxt < new Date(ty, today.getMonth(), today.getDate())) nxt = new Date(ty + 1, m - 1, d);
      const dist = Math.ceil((nxt.getTime() - today.getTime()) / 86400000);
      if (dist <= 120) out.push({ id: b.id, name: b.name, date: nxt.toISOString().slice(0, 10), days: dist });
    }
    return out.sort((a, b) => a.days - b.days).slice(0, 5);
  }, [state.birthdays, today]);

  const nextHoliday = useMemo(() => {
    const all = [...usHolidaysFor(today.getFullYear()), ...usHolidaysFor(today.getFullYear() + 1)];
    const todayIso = today.toISOString().slice(0,10);
    return all.find(h => h.date >= todayIso) ?? null;
  }, [today]);

  const summerList = lists.find(l => l.season === season) ?? lists[0] ?? null;

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-6 p-4 sm:p-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl tracking-tight">Seasons & Celebrations</h1>
          <p className="text-sm text-muted-foreground">Plan, celebrate, and create beautiful memories together.</p>
        </div>
        <Button onClick={() => setEditorOpen(true)} className="gap-2 rounded-full">
          <Plus className="h-4 w-4" /> New celebration
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          {/* Hero seasonal card */}
          <Card className={`overflow-hidden border-0 bg-gradient-to-br ${meta.gradient}`}>
            <div className="grid md:grid-cols-[2fr_1fr] gap-6 p-6">
              <div>
                <div className="text-sm text-foreground/70">Hello 🌿</div>
                <h2 className={`mt-2 font-display text-3xl ${meta.accent}`}>{meta.label} is here! {meta.emoji}</h2>
                <p className="mt-2 max-w-md text-sm text-foreground/80">{meta.quote}</p>
                <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-background/70 px-3 py-1.5 text-xs backdrop-blur">
                  <Sparkles className="h-3.5 w-3.5" /> {days} days left in {meta.label}
                </div>
              </div>
              <Card className="bg-background/80 backdrop-blur p-4 space-y-2">
                <div className="text-sm font-semibold">Seasonal Focus</div>
                {meta.focus.map(f => (
                  <div key={f} className="flex items-center gap-2 text-sm">
                    <Sparkles className="h-3.5 w-3.5 text-muted-foreground" /> {f}
                  </div>
                ))}
                <Link to="/seasons/bucket-lists">
                  <Button variant="outline" size="sm" className="w-full mt-2">Set Seasonal Goals</Button>
                </Link>
              </Card>
            </div>
          </Card>

          {/* Upcoming Highlights carousel */}
          <section>
            <h3 className="mb-3 text-sm font-semibold">Upcoming Highlights</h3>
            <ScrollArea className="w-full whitespace-nowrap">
              <div className="flex gap-3 pb-3">
                {upcomingCelebrations.length === 0 && (
                  <Card className="p-6 w-72 text-center text-sm text-muted-foreground">
                    No upcoming celebrations yet. Add your first one above.
                  </Card>
                )}
                {upcomingCelebrations.map(c => {
                  const Icon = ICONS[c.kind] ?? Sparkles;
                  const d = daysUntilDate(c.date, today);
                  return (
                    <Link key={c.id} to={`/seasons/celebrations/${c.id}`}>
                      <Card className="w-72 p-4 transition-all hover:shadow-md cursor-pointer">
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          <Icon className="h-4 w-4 text-primary" /> {c.title}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">{format(parseISO(c.date), "MMMM d, yyyy")}</div>
                        <div className="my-3">
                          <div className="text-2xl font-display">{d}</div>
                          <div className="text-xs text-muted-foreground">days to go!</div>
                        </div>
                        <Badge variant="secondary" className="text-[10px]">
                          {c.status === "planning" ? "Planning" : c.status === "in_progress" ? "Plan in progress" : "Done"}
                        </Badge>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </ScrollArea>
          </section>

          {/* Four small cards row */}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {/* Celebration Planner */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold">Celebration Planner</h4>
                <Link to="/seasons/celebrations" className="text-xs text-primary">View all</Link>
              </div>
              <div className="space-y-2">
                {upcomingCelebrations.slice(0, 3).map(c => (
                  <Link key={c.id} to={`/seasons/celebrations/${c.id}`} className="flex items-center justify-between text-sm hover:bg-muted/40 rounded p-1">
                    <span className="truncate">{c.title}</span>
                    <Badge variant="outline" className="text-[10px]">{c.status === "planning" ? "Planning" : "Upcoming"}</Badge>
                  </Link>
                ))}
                {upcomingCelebrations.length === 0 && <p className="text-xs text-muted-foreground">No celebrations yet</p>}
                <button onClick={() => setEditorOpen(true)} className="flex items-center gap-1 text-xs text-primary mt-2">
                  <Plus className="h-3 w-3" /> Add Celebration
                </button>
              </div>
            </Card>

            {/* Traditions */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold">Traditions This Month</h4>
                <Link to="/seasons/traditions" className="text-xs text-primary">View all</Link>
              </div>
              <div className="space-y-1.5">
                {traditions.slice(0, 4).map(t => (
                  <div key={t.id} className="flex items-center gap-2 text-sm">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" /> {t.title}
                  </div>
                ))}
                {traditions.length === 0 && <p className="text-xs text-muted-foreground">No traditions saved yet</p>}
              </div>
              <Link to="/seasons/traditions" className="mt-3 inline-flex items-center gap-1 text-xs text-primary">
                <Plus className="h-3 w-3" /> Add Tradition
              </Link>
            </Card>

            {/* Bucket list */}
            <BucketTile listId={summerList?.id ?? null} label={`${meta.label} Bucket List`} />

            {/* Memory highlight */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold">Memory Highlight</h4>
                <Link to="/seasons/memory-book" className="text-xs text-primary">View all</Link>
              </div>
              {memoryEntries[0] ? (
                <div>
                  <div className="font-medium text-sm">{memoryEntries[0].title}</div>
                  <div className="text-xs text-muted-foreground mt-1">{format(parseISO(memoryEntries[0].date), "MMM d, yyyy")}</div>
                  {memoryEntries[0].body && <p className="mt-2 text-xs line-clamp-3 text-muted-foreground">{memoryEntries[0].body}</p>}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No memories yet. Add your first.</p>
              )}
            </Card>
          </div>

          {/* Birthdays · Care milestones · Holiday prep · Budget */}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold">Upcoming Birthdays</h4>
                <Link to="/seasons/celebrations" className="text-xs text-primary">View all</Link>
              </div>
              <div className="flex items-end gap-2 overflow-x-auto">
                {upcomingBirthdays.length === 0 && <p className="text-xs text-muted-foreground">No birthdays nearby</p>}
                {upcomingBirthdays.map(b => (
                  <div key={b.id} className="text-center min-w-[60px]">
                    <div className="h-12 w-12 mx-auto rounded-full bg-pink-100 dark:bg-pink-900/30 grid place-items-center">
                      <Cake className="h-5 w-5 text-pink-600" />
                    </div>
                    <div className="text-xs font-medium mt-1 truncate">{b.name}</div>
                    <div className="text-[10px] text-muted-foreground">{b.days}d</div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-4">
              <h4 className="text-sm font-semibold mb-3">Care Milestones</h4>
              <div className="space-y-2">
                {celebrations.filter(c => c.kind === "care_milestone" || c.kind === "therapy_win").slice(0,3).map(c => (
                  <Card key={c.id} className="p-2 bg-muted/30">
                    <div className="text-xs font-medium">{c.title}</div>
                    <div className="text-[10px] text-muted-foreground">{format(parseISO(c.date), "MMM d")}</div>
                  </Card>
                ))}
                {celebrations.filter(c => c.kind === "care_milestone" || c.kind === "therapy_win").length === 0 && (
                  <p className="text-xs text-muted-foreground">No care milestones recorded yet</p>
                )}
              </div>
            </Card>

            <Card className="p-4">
              <h4 className="text-sm font-semibold mb-3">Holiday Prep Progress</h4>
              {plans.slice(0, 3).map(p => (
                <div key={p.id} className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span>{p.customName ?? "Holiday"}</span>
                  </div>
                  <Progress value={p.status === "done" ? 100 : p.status === "in_progress" ? 60 : 20} />
                </div>
              ))}
              {plans.length === 0 && <p className="text-xs text-muted-foreground">No holiday plans yet. <Link to="/seasons/holidays" className="text-primary">Create one</Link></p>}
            </Card>

            <Card className="p-4">
              <h4 className="text-sm font-semibold mb-3">Celebration Budget</h4>
              {celebrations.filter(c => (c.budgetCents ?? 0) > 0).slice(0,2).map(c => {
                const pct = Math.min(100, Math.round(((c.spentCents ?? 0) / Math.max(1, c.budgetCents ?? 1)) * 100));
                return (
                  <div key={c.id} className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span>{c.title}</span>
                      <span>${((c.spentCents ?? 0)/100).toFixed(0)} / ${((c.budgetCents ?? 0)/100).toFixed(0)}</span>
                    </div>
                    <Progress value={pct} />
                  </div>
                );
              })}
              {celebrations.filter(c => (c.budgetCents ?? 0) > 0).length === 0 && (
                <p className="text-xs text-muted-foreground">No celebration budgets set yet</p>
              )}
            </Card>
          </div>
        </div>

        {/* Right rail */}
        <div className="space-y-6">
          <TodaysRhythmCard />

          {nextHoliday && (
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold">Next Holiday</h4>
                <Link to="/seasons/holidays" className="text-xs text-primary">View all</Link>
              </div>
              <div className="font-display text-lg">{nextHoliday.name}</div>
              <div className="text-xs text-muted-foreground">{format(parseISO(nextHoliday.date), "EEEE, MMMM d, yyyy")}</div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-display">{daysUntilDate(nextHoliday.date, today)}</span>
                <span className="text-xs text-muted-foreground">days to go!</span>
              </div>
            </Card>
          )}

          {/* Seasonal goals editor */}
          <Card className="p-4">
            <h4 className="text-sm font-semibold mb-3">Seasonal Goals · {meta.label}</h4>
            <div className="space-y-1.5 mb-3">
              {goals.map(g => (
                <label key={g.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={g.done} onChange={e => toggleGoal(g.id, e.target.checked)} />
                  <span className={g.done ? "line-through text-muted-foreground" : ""}>{g.title}</span>
                </label>
              ))}
              {goals.length === 0 && <p className="text-xs text-muted-foreground">Set what matters most this {meta.label.toLowerCase()}.</p>}
            </div>
            <QuickAdd onAdd={addGoal} placeholder="Add a seasonal goal…" />
          </Card>
        </div>
      </div>

      <CelebrationEditor open={editorOpen} onOpenChange={setEditorOpen} onSave={async (input) => { await addCeleb(input); }} />
    </div>
  );
}

function BucketTile({ listId, label }: { listId: string | null; label: string }) {
  const { items, toggle } = useBucketItems(listId);
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold">{label}</h4>
        <Link to="/seasons/bucket-lists" className="text-xs text-primary">View all</Link>
      </div>
      {!listId && <p className="text-xs text-muted-foreground">No bucket list for this season yet. <Link to="/seasons/bucket-lists" className="text-primary">Create one</Link></p>}
      <div className="space-y-1.5">
        {items.slice(0, 5).map(it => (
          <label key={it.id} className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={it.done} onChange={e => toggle(it.id, e.target.checked)} />
            <span className={it.done ? "line-through text-muted-foreground" : ""}>{it.title}</span>
          </label>
        ))}
      </div>
    </Card>
  );
}

function QuickAdd({ onAdd, placeholder }: { onAdd: (title: string) => Promise<void> | void; placeholder?: string }) {
  const [val, setVal] = useState("");
  return (
    <form
      onSubmit={async (e) => { e.preventDefault(); const v = val.trim(); if (!v) return; await onAdd(v); setVal(""); }}
      className="flex items-center gap-2"
    >
      <input
        value={val}
        onChange={e => setVal(e.target.value)}
        placeholder={placeholder}
        className="flex-1 rounded-md border border-input bg-background px-2 py-1 text-sm"
      />
      <Button type="submit" size="sm" variant="ghost" className="h-7">
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </form>
  );
}