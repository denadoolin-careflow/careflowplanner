import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { Goal } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Sparkles, Plus, Sprout, Flame, TrendingUp, Trophy, Heart, Home, Briefcase,
  Palette, Wallet, Users, Moon, HandHeart, Target, Calendar, CheckCircle2,
  Circle, ArrowRight, Edit3, Trash2, Compass, Leaf, Mountain, Flower2,
  Share2, Link2, ListChecks,
} from "lucide-react";
import { toast } from "sonner";

/* ---------------- Types & local persistence ---------------- */

type CheckIn = "energizing" | "steady" | "neutral" | "heavy";
type GoalExtras = {
  why?: string;
  nextStep?: string;
  targetDate?: string;
  milestones?: { id: string; label: string; done: boolean }[];
  startedAt?: string; // ISO
  cover?: "sprout" | "moon" | "mountain" | "flower";
  lastCheckIn?: { tone: CheckIn; at: string };
};

const EXTRAS_KEY = "careflow:goal-extras:v1";
const SEASON_KEY = "careflow:goal-season:v1";
const TOP3_KEY = "careflow:goal-top3:v1";
const TINY_WINS_KEY = "careflow:tiny-wins:v1";

type TinyWin = { id: string; text: string; at: string; goalId?: string };
function loadTinyWins(): TinyWin[] {
  try { return JSON.parse(localStorage.getItem(TINY_WINS_KEY) || "[]"); } catch { return []; }
}
function saveTinyWins(w: TinyWin[]) {
  try { localStorage.setItem(TINY_WINS_KEY, JSON.stringify(w)); } catch {}
}
function addTinyWin(text: string, goalId?: string) {
  const wins = loadTinyWins();
  wins.unshift({ id: crypto.randomUUID(), text, goalId, at: new Date().toISOString() });
  saveTinyWins(wins.slice(0, 100));
  window.dispatchEvent(new Event("careflow:tiny-wins"));
}

const CHECKIN_STALE_DAYS = 7;
function checkInIsStale(at?: string) {
  if (!at) return true;
  return (Date.now() - new Date(at).getTime()) / 86400000 >= CHECKIN_STALE_DAYS;
}

const TONE_META: Record<CheckIn, { label: string; emoji: string; tint: string }> = {
  energizing: { label: "Energizing", emoji: "😊", tint: "bg-emerald-100/70 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" },
  steady:     { label: "Steady",     emoji: "😌", tint: "bg-sky-100/70 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300" },
  neutral:    { label: "Neutral",    emoji: "😐", tint: "bg-stone-100/70 text-stone-700 dark:bg-stone-900/40 dark:text-stone-300" },
  heavy:      { label: "Heavy",      emoji: "😓", tint: "bg-rose-100/70 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300" },
};

function loadExtras(): Record<string, GoalExtras> {
  try { return JSON.parse(localStorage.getItem(EXTRAS_KEY) || "{}"); } catch { return {}; }
}
function saveExtras(x: Record<string, GoalExtras>) {
  try { localStorage.setItem(EXTRAS_KEY, JSON.stringify(x)); } catch {}
}

/* ---------------- Category meta ---------------- */

const CAT_META: Record<Goal["category"], { icon: any; tint: string; text: string; ring: string; emoji: string }> = {
  Family:       { icon: Heart,    tint: "bg-rose-100/70 dark:bg-rose-950/40",    text: "text-rose-700 dark:text-rose-300",       ring: "ring-rose-200/60",    emoji: "❤️" },
  Home:         { icon: Home,     tint: "bg-amber-100/70 dark:bg-amber-950/40",  text: "text-amber-700 dark:text-amber-300",     ring: "ring-amber-200/60",   emoji: "🏠" },
  Health:       { icon: Sprout,   tint: "bg-emerald-100/70 dark:bg-emerald-950/40", text: "text-emerald-700 dark:text-emerald-300", ring: "ring-emerald-200/60", emoji: "🧘" },
  Creative:     { icon: Palette,  tint: "bg-violet-100/70 dark:bg-violet-950/40", text: "text-violet-700 dark:text-violet-300",   ring: "ring-violet-200/60",  emoji: "🎨" },
  Financial:    { icon: Wallet,   tint: "bg-orange-100/70 dark:bg-orange-950/40", text: "text-orange-700 dark:text-orange-300",   ring: "ring-orange-200/60",  emoji: "💰" },
  Relationship: { icon: Users,    tint: "bg-pink-100/70 dark:bg-pink-950/40",    text: "text-pink-700 dark:text-pink-300",       ring: "ring-pink-200/60",    emoji: "🤝" },
  Personal:     { icon: Moon,     tint: "bg-indigo-100/70 dark:bg-indigo-950/40", text: "text-indigo-700 dark:text-indigo-300",   ring: "ring-indigo-200/60",  emoji: "🌙" },
  Caregiving:   { icon: HandHeart,tint: "bg-teal-100/70 dark:bg-teal-950/40",    text: "text-teal-700 dark:text-teal-300",       ring: "ring-teal-200/60",    emoji: "💛" },
};
const CATS = Object.keys(CAT_META) as Goal["category"][];

/* ---------------- Season helpers ---------------- */

function currentSeason(): { label: string; emoji: string; gradient: string; illo: any } {
  const m = new Date().getMonth(); // 0..11
  if (m >= 2 && m <= 4) return { label: "Spring Growth", emoji: "🌱", gradient: "from-emerald-100 via-rose-100 to-amber-100", illo: Sprout };
  if (m >= 5 && m <= 7) return { label: "Summer Bloom",  emoji: "🌼", gradient: "from-amber-100 via-rose-100 to-emerald-100", illo: Flower2 };
  if (m >= 8 && m <= 10) return { label: "Autumn Harvest", emoji: "🍂", gradient: "from-amber-100 via-orange-100 to-rose-100", illo: Mountain };
  return { label: "Winter Stillness", emoji: "🌙", gradient: "from-indigo-100 via-violet-100 to-rose-100", illo: Moon };
}
function currentQuarter() {
  const d = new Date(); const q = Math.floor(d.getMonth()/3)+1; return `Q${q} ${d.getFullYear()}`;
}

/* ---------------- Hub ---------------- */

export function GoalsHub() {
  const { state, addGoal, updateGoal, deleteGoal, addTask, updateTask } = useStore();
  const [extras, setExtras] = useState<Record<string, GoalExtras>>(() => loadExtras());
  const [openId, setOpenId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [areaFilter, setAreaFilter] = useState<Goal["category"] | "all">("all");
  const [view, setView] = useState<"vision" | "list" | "board" | "journey">("vision");
  const [checkInQueueDismissed, setCheckInQueueDismissed] = useState<string[]>([]);

  useEffect(() => { saveExtras(extras); }, [extras]);

  const setExtra = (id: string, patch: Partial<GoalExtras>) =>
    setExtras(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const goals = state.goals;
  const filtered = areaFilter === "all" ? goals : goals.filter(g => g.category === areaFilter);
  const active = goals.filter(g => g.status === "active");

  // momentum stats
  const tinyWins = state.tasks.filter(t => {
    if (!t.done || !t.lastCompletedAt) return false;
    const days = (Date.now() - new Date(t.lastCompletedAt).getTime()) / 86400000;
    return days <= 7 && !!t.goalId;
  }).length;
  const streakWeeks = Math.max(1, Math.min(12, Math.round(tinyWins / 2) || 1));
  const momentum = active.length
    ? Math.round(active.reduce((s, g) => s + (g.progress || 0), 0) / active.length)
    : 0;

  const season = currentSeason();

  // top 3 (pinned via localStorage, fallback to highest progress)
  const [top3Ids, setTop3Ids] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(TOP3_KEY) || "[]"); } catch { return []; }
  });
  useEffect(() => { try { localStorage.setItem(TOP3_KEY, JSON.stringify(top3Ids)); } catch {} }, [top3Ids]);
  const top3 = useMemo(() => {
    const pinned = top3Ids.map(id => active.find(g => g.id === id)).filter(Boolean) as Goal[];
    if (pinned.length >= 3) return pinned.slice(0,3);
    const rest = active.filter(g => !pinned.includes(g)).sort((a,b)=>b.progress-a.progress);
    return [...pinned, ...rest].slice(0,3);
  }, [top3Ids, active]);

  const togglePin = (id: string) =>
    setTop3Ids(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id].slice(-3));

  // Weekly gentle check-in queue: pinned + active goals with stale/missing check-ins
  const needsCheckIn = useMemo(
    () => active
      .filter(g => checkInIsStale(extras[g.id]?.lastCheckIn?.at))
      .filter(g => !checkInQueueDismissed.includes(g.id))
      .slice(0, 5),
    [active, extras, checkInQueueDismissed]
  );

  return (
    <div className="space-y-6">
      {/* HERO */}
      <section className={cn(
        "relative overflow-hidden rounded-3xl border border-border/50 p-6 sm:p-8",
        "bg-gradient-to-br", season.gradient,
      )}>
        <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-foreground/60">
              <Sparkles className="h-3.5 w-3.5" /> Seasonal Intentions
            </div>
            <h1 className="font-display mt-1 text-3xl sm:text-4xl text-foreground/90">
              {season.emoji} {season.label}
            </h1>
            <p className="mt-1 max-w-md text-sm italic text-foreground/70">
              "What are you growing this season?"
            </p>
            <div className="mt-5 grid grid-cols-2 gap-4 sm:flex sm:items-center sm:gap-8">
              <HeroStat icon={Sprout} value={active.length} label="Active Goals" />
              <HeroStat icon={TrendingUp} value={`${momentum}%`} label="Momentum" />
              <HeroStat icon={Sparkles} value={tinyWins} label="Tiny Wins" sub="this week" />
            </div>
          </div>
          <div className="flex flex-col items-end gap-3">
            <season.illo className="hidden h-24 w-24 text-foreground/30 sm:block" strokeWidth={1.2} />
            <div className="flex items-center gap-2">
              <CareyButton
                label="Ask Carey"
                variant="outline"
                context={{
                  active: active.slice(0, 12).map((g: any) => ({ title: g.title, progress: g.progress, area: g.area })),
                  momentum,
                  tinyWins,
                  needsCheckIn: needsCheckIn.map((g: any) => g.title),
                }}
                actions={[
                  { label: "Pick one goal to focus on this week", prompt: "From my active goals, which one deserves my focus this week? Suggest 3 tiny actions for it." },
                  { label: "Which goals am I neglecting?", prompt: "Which of my goals have I been neglecting? Be kind — suggest a gentle restart for one of them." },
                  { label: "Suggest weekly actions for each goal", prompt: "For each active goal, suggest 1-2 small actions I could do this week." },
                  { label: "Help me reflect on momentum", prompt: "Help me reflect on my current momentum across goals. What's working? What needs space?" },
                ]}
              />
              <Button onClick={()=>setCreateOpen(true)} size="lg" className="rounded-full shadow-sm">
                <Plus className="mr-1 h-4 w-4" /> Create Goal
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Weekly gentle check-in */}
      {needsCheckIn.length > 0 && (
        <WeeklyCheckInBanner
          goals={needsCheckIn}
          onCheckIn={(id, tone) => {
            setExtra(id, { lastCheckIn: { tone, at: new Date().toISOString() } });
            if (tone === "heavy") toast("This one feels heavy — try giving it more space.", { description: "Open the goal to pause or stretch it." });
            else toast.success(`Saved · ${TONE_META[tone].label}`);
          }}
          onSkip={(id) => setCheckInQueueDismissed(prev => [...prev, id])}
          onOpen={(id) => setOpenId(id)}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* MAIN COLUMN */}
        <div className="space-y-6 lg:col-span-2">
          {/* Momentum dashboard */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MomentumTile icon={Sprout} accent="emerald" value={active.length} label="Active Goals" />
            <MomentumTile icon={Sparkles} accent="amber" value={tinyWins} label="Tiny Wins" />
            <MomentumTile icon={Flame} accent="orange" value={streakWeeks} label="Week Streak" />
            <MomentumTile icon={TrendingUp} accent="rose" value={`${momentum}%`} label="Momentum" />
          </div>

          {/* Top 3 this season */}
          <div className="rounded-2xl border border-border/60 bg-card/60 p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Top 3 This Season</div>
                <h2 className="font-display text-xl">Where your energy lives</h2>
              </div>
              <span className="text-xs text-muted-foreground">{currentQuarter()}</span>
            </div>
            {top3.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active goals yet. Plant your first intention above.</p>
            ) : (
              <div className="space-y-3">
                {top3.map((g, i) => <Top3Row key={g.id} idx={i+1} goal={g} onOpen={()=>setOpenId(g.id)} />)}
              </div>
            )}
          </div>

          {/* Area filter chips */}
          <div className="flex flex-wrap gap-2">
            <AreaChip active={areaFilter==="all"} onClick={()=>setAreaFilter("all")} label="All Areas" emoji="🌿" />
            {CATS.map(c => (
              <AreaChip key={c} active={areaFilter===c} onClick={()=>setAreaFilter(c)} label={c} emoji={CAT_META[c].emoji} />
            ))}
          </div>

          {/* View tabs */}
          <Tabs value={view} onValueChange={(v:any)=>setView(v)}>
            <TabsList className="rounded-full">
              <TabsTrigger value="vision" className="rounded-full">Vision</TabsTrigger>
              <TabsTrigger value="list" className="rounded-full">List</TabsTrigger>
              <TabsTrigger value="board" className="rounded-full">Board</TabsTrigger>
              <TabsTrigger value="journey" className="rounded-full">Journey</TabsTrigger>
            </TabsList>

            <TabsContent value="vision" className="mt-5">
              {filtered.length === 0 ? <EmptyState onCreate={()=>setCreateOpen(true)} /> : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {filtered.map(g => (
                    <VisionCard key={g.id} goal={g} extras={extras[g.id]} onOpen={()=>setOpenId(g.id)} pinned={top3Ids.includes(g.id)} onPin={()=>togglePin(g.id)} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="list" className="mt-5 space-y-3">
              {filtered.length === 0 ? <EmptyState onCreate={()=>setCreateOpen(true)} /> :
                filtered.map(g => (
                  <ListCard key={g.id} goal={g} extras={extras[g.id]} onOpen={()=>setOpenId(g.id)} />
                ))
              }
            </TabsContent>

            <TabsContent value="board" className="mt-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {CATS.map(c => {
                  const items = filtered.filter(g => g.category === c);
                  if (areaFilter !== "all" && c !== areaFilter) return null;
                  return (
                    <div key={c} className={cn("rounded-2xl border border-border/50 p-3", CAT_META[c].tint)}>
                      <div className={cn("mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider", CAT_META[c].text)}>
                        <span>{CAT_META[c].emoji}</span> {c}
                        <span className="ml-auto opacity-60">{items.length}</span>
                      </div>
                      <div className="space-y-2">
                        {items.length === 0 && <p className="text-xs text-muted-foreground">No goals yet</p>}
                        {items.map(g => (
                          <button key={g.id} onClick={()=>setOpenId(g.id)} className="block w-full rounded-xl bg-background/70 p-2.5 text-left transition-colors hover:bg-background">
                            <div className="text-sm font-medium">{g.title}</div>
                            <Progress value={g.progress} className="mt-1.5 h-1" />
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="journey" className="mt-5 space-y-4">
              {filtered.length === 0 ? <EmptyState onCreate={()=>setCreateOpen(true)} /> :
                filtered.map(g => (
                  <JourneyInline key={g.id} goal={g} extras={extras[g.id]} onOpen={()=>setOpenId(g.id)} />
                ))
              }
            </TabsContent>
          </Tabs>
        </div>

        {/* SIDE COLUMN */}
        <aside className="space-y-4">
          {/* Season compass */}
          <div className="rounded-2xl border border-border/60 bg-card/60 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Compass className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-display text-lg">Season Compass</h3>
              </div>
              <span className="text-xs text-muted-foreground">{currentQuarter()}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Focus: Simplify & Grow</p>
            <div className="mt-4 space-y-2">
              {top3.map((g, i) => {
                const M = CAT_META[g.category];
                return (
                  <button key={g.id} onClick={()=>setOpenId(g.id)} className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-muted/40">
                    <span className={cn("flex h-7 w-7 items-center justify-center rounded-lg", M.tint, M.text)}>
                      <M.icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-xs text-muted-foreground">{i+1}</span>
                    <span className="flex-1 truncate text-sm font-medium">{g.title}</span>
                  </button>
                );
              })}
              {top3.length === 0 && <p className="text-xs text-muted-foreground">Pin up to 3 goals as your seasonal focus.</p>}
            </div>
          </div>

          {/* Recent wins */}
          <div className="rounded-2xl border border-border/60 bg-card/60 p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg">Recent Wins</h3>
            <TinyWinQuickAdd />
          </div>
          <RecentWins />
          </div>
        </aside>
      </div>

      {/* Create dialog */}
      <CreateGoalDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={async (g, ex) => {
          await addGoal(g);
          // Note: extras keyed by id; we can't get id from addGoal here, so we save by title shortly via effect
          setTimeout(() => {
            const created = state.goals.find(x => x.title === g.title);
            if (created) setExtras(prev => ({ ...prev, [created.id]: { ...prev[created.id], ...ex } }));
          }, 250);
        }}
      />

      {/* Journey sheet */}
      <Sheet open={!!openId} onOpenChange={(o)=>!o && setOpenId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {openId && (() => {
            const g = goals.find(x => x.id === openId);
            if (!g) return null;
            const ex = extras[g.id] || {};
            const linkedTasks = state.tasks.filter(t => t.goalId === g.id);
            return (
              <JourneyDetail
                goal={g}
                extras={ex}
                pinned={top3Ids.includes(g.id)}
                onPin={()=>togglePin(g.id)}
                onPatch={(p)=>updateGoal(g.id, p)}
                onExtra={(p)=>setExtra(g.id, p)}
                onDelete={async ()=>{ await deleteGoal(g.id); setOpenId(null); toast.success("Goal released gently"); }}
                linkedTasks={linkedTasks}
                onAddTask={(title)=>addTask({ title, goalId: g.id, area: "Personal", priority: "medium" } as any)}
                onToggleTask={(id, done)=>updateTask(id, { done, lastCompletedAt: done ? new Date().toISOString() : undefined })}
                onUnlinkTask={(id)=>updateTask(id, { goalId: undefined })}
              />
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
}

/* ---------------- Subcomponents ---------------- */

function HeroStat({ icon: Icon, value, label, sub }: { icon: any; value: any; label: string; sub?: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-background/60 text-foreground/70">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <div className="font-display text-xl leading-none text-foreground/90">{value}</div>
        <div className="text-[11px] text-foreground/60">{label}{sub && <span className="block opacity-70">{sub}</span>}</div>
      </div>
    </div>
  );
}

function MomentumTile({ icon: Icon, value, label, accent }: { icon: any; value: any; label: string; accent: string }) {
  const tints: Record<string, string> = {
    emerald: "bg-emerald-100/60 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    amber:   "bg-amber-100/60 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
    orange:  "bg-orange-100/60 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300",
    rose:    "bg-rose-100/60 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
  };
  return (
    <div className="rounded-2xl border border-border/50 bg-card/60 p-4">
      <span className={cn("inline-flex h-8 w-8 items-center justify-center rounded-lg", tints[accent])}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="mt-2 font-display text-2xl leading-tight">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function AreaChip({ label, emoji, active, onClick }: { label: string; emoji: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs transition-all",
        active ? "border-primary/40 bg-primary/10 text-foreground" : "border-border/50 bg-card/50 text-muted-foreground hover:text-foreground"
      )}
    >
      <span className="mr-1">{emoji}</span>{label}
    </button>
  );
}

function Top3Row({ idx, goal, onOpen }: { idx: number; goal: Goal; onOpen: () => void }) {
  const M = CAT_META[goal.category];
  return (
    <button onClick={onOpen} className="group flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-muted/40">
      <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", M.tint, M.text)}>
        <M.icon className="h-4 w-4" />
      </span>
      <span className="text-xs text-muted-foreground">{idx}</span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{goal.title}</div>
        <Progress value={goal.progress} className="mt-1 h-1.5" />
      </div>
      <span className="text-xs text-muted-foreground">{goal.progress}%</span>
      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  );
}

function VisionCard({ goal, extras, onOpen, pinned, onPin }: { goal: Goal; extras?: GoalExtras; onOpen: () => void; pinned: boolean; onPin: () => void }) {
  const M = CAT_META[goal.category];
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card/60 transition-shadow hover:shadow-md">
      <div className={cn("h-28 w-full bg-gradient-to-br", M.tint, "from-background/0 to-background/0")}>
        <div className={cn("flex h-full items-center justify-center text-4xl opacity-70")}>{M.emoji}</div>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className={cn("text-[10px] uppercase tracking-wider", M.text)}>{goal.category}</div>
            <h3 className="font-display text-base leading-tight">{goal.title}</h3>
          </div>
          <button onClick={onPin} title={pinned ? "Unpin" : "Pin as seasonal focus"}
            className={cn("rounded-full p-1.5 text-xs", pinned ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/40")}>
            <Sparkles className="h-3.5 w-3.5" />
          </button>
        </div>
        {extras?.why && <p className="mt-2 line-clamp-2 text-xs italic text-muted-foreground">"{extras.why}"</p>}
        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Progress</span><span>{goal.progress}%</span>
          </div>
          <Progress value={goal.progress} className="mt-1 h-1.5" />
        </div>
        <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{extras?.targetDate || "No target"}</span>
          <button onClick={onOpen} className="inline-flex items-center gap-1 text-primary hover:underline">
            Open <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

function ListCard({ goal, extras, onOpen }: { goal: Goal; extras?: GoalExtras; onOpen: () => void }) {
  const M = CAT_META[goal.category];
  return (
    <button onClick={onOpen} className="group block w-full rounded-2xl border border-border/50 bg-card/60 p-4 text-left transition-shadow hover:shadow-sm">
      <div className="flex items-start gap-3">
        <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", M.tint, M.text)}>
          <M.icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="truncate font-display text-base">{goal.title}</h3>
            <span className="text-xs text-muted-foreground">{goal.progress}%</span>
          </div>
          <Progress value={goal.progress} className="mt-1.5 h-1.5" />
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {extras?.why && <span className="inline-flex items-center gap-1"><Sparkles className="h-3 w-3" /> {extras.why}</span>}
            {extras?.nextStep && <span className="inline-flex items-center gap-1"><Target className="h-3 w-3" /> {extras.nextStep}</span>}
            {extras?.targetDate && <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> {extras.targetDate}</span>}
          </div>
        </div>
      </div>
    </button>
  );
}

function JourneyInline({ goal, extras, onOpen }: { goal: Goal; extras?: GoalExtras; onOpen: () => void }) {
  const M = CAT_META[goal.category];
  const milestones = extras?.milestones || [];
  return (
    <div className="rounded-2xl border border-border/50 bg-card/60 p-5">
      <div className="flex items-start gap-3">
        <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl", M.tint, M.text)}>
          <M.icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{goal.category}</div>
          <h3 className="font-display text-lg">{goal.title}</h3>
          {extras?.why && <p className="mt-1 text-sm italic text-muted-foreground">"{extras.why}"</p>}
        </div>
        <Button variant="ghost" size="sm" onClick={onOpen}>Open</Button>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Progress</div>
          <div className="mt-1 flex items-center gap-2">
            <Progress value={goal.progress} className="h-2" />
            <span className="text-sm font-medium">{goal.progress}%</span>
          </div>
          {extras?.nextStep && <div className="mt-3 text-sm"><span className="text-muted-foreground">Next: </span>{extras.nextStep}</div>}
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Milestones</div>
          <ul className="mt-1 space-y-1 text-sm">
            {milestones.length === 0 && <li className="text-muted-foreground">No milestones yet.</li>}
            {milestones.slice(0,4).map(m => (
              <li key={m.id} className="flex items-center gap-2">
                {m.done ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
                <span className={m.done ? "line-through text-muted-foreground" : ""}>{m.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-border/60 bg-card/40 p-10 text-center">
      <Sprout className="mx-auto h-8 w-8 text-emerald-500/80" />
      <h3 className="mt-3 font-display text-lg">No goals here yet</h3>
      <p className="mt-1 text-sm text-muted-foreground">Plant a gentle intention — something small you'd love to grow this season.</p>
      <Button onClick={onCreate} className="mt-4 rounded-full"><Plus className="mr-1 h-4 w-4" /> Create Goal</Button>
    </div>
  );
}

function RecentWins() {
  const { state } = useStore();
  const [tinyWins, setTinyWins] = useState<TinyWin[]>(() => loadTinyWins());
  useEffect(() => {
    const h = () => setTinyWins(loadTinyWins());
    window.addEventListener("careflow:tiny-wins", h);
    return () => window.removeEventListener("careflow:tiny-wins", h);
  }, []);
  const taskWins = state.tasks
    .filter(t => t.done && t.lastCompletedAt)
    .map(t => ({ id: `t-${t.id}`, text: t.title, at: t.lastCompletedAt!, kind: "task" as const }));
  const items = [
    ...tinyWins.map(w => ({ id: `w-${w.id}`, text: w.text, at: w.at, kind: "tiny" as const })),
    ...taskWins,
  ].sort((a,b)=> new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 6);
  if (items.length === 0) return <p className="mt-2 text-xs text-muted-foreground">Your wins will land here — tasks completed and tiny moments you celebrate.</p>;
  return (
    <ul className="mt-3 space-y-2">
      {items.map(w => (
        <li key={w.id} className="flex items-center gap-2 text-sm">
          {w.kind === "tiny" ? <Sparkles className="h-3.5 w-3.5 text-rose-500" /> : <Trophy className="h-3.5 w-3.5 text-amber-500" />}
          <span className="truncate">{w.text}</span>
        </li>
      ))}
    </ul>
  );
}

function TinyWinQuickAdd() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  return (
    <>
      <button onClick={()=>setOpen(true)} className="rounded-full border border-border/50 bg-background/60 px-2.5 py-1 text-[11px] text-muted-foreground hover:text-foreground">
        <Plus className="mr-1 inline h-3 w-3" /> Tiny win
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="font-display">✨ Celebrate a tiny win</DialogTitle></DialogHeader>
          <Input autoFocus placeholder="What went well, even a little?" value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{
            if (e.key==="Enter" && text.trim()) { addTinyWin(text.trim()); setText(""); setOpen(false); toast.success("Win saved 🌸"); }
          }} />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={()=>setOpen(false)}>Cancel</Button>
            <Button onClick={()=>{ if(!text.trim()) return; addTinyWin(text.trim()); setText(""); setOpen(false); toast.success("Win saved 🌸"); }}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function WeeklyCheckInBanner({ goals, onCheckIn, onSkip, onOpen }: {
  goals: Goal[]; onCheckIn: (id: string, tone: CheckIn) => void;
  onSkip: (id: string) => void; onOpen: (id: string) => void;
}) {
  const g = goals[0];
  const M = CAT_META[g.category];
  return (
    <section className="rounded-2xl border border-border/60 bg-gradient-to-br from-rose-50/60 via-amber-50/60 to-emerald-50/60 p-5 dark:from-rose-950/20 dark:via-amber-950/20 dark:to-emerald-950/20">
      <div className="flex items-start gap-3">
        <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl", M.tint, M.text)}>
          <M.icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Weekly check-in</div>
          <h3 className="font-display text-lg">How does <button onClick={()=>onOpen(g.id)} className="underline-offset-2 hover:underline">{g.title}</button> feel this week?</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {(Object.keys(TONE_META) as CheckIn[]).map(k => (
              <button key={k} onClick={()=>onCheckIn(g.id, k)}
                className={cn("rounded-full border border-border/50 bg-background/70 px-3 py-1 text-xs transition-colors hover:bg-background", TONE_META[k].tint)}>
                {TONE_META[k].emoji} {TONE_META[k].label}
              </button>
            ))}
            <button onClick={()=>onSkip(g.id)} className="ml-1 rounded-full px-2 py-1 text-xs text-muted-foreground hover:text-foreground">Not now</button>
          </div>
          {goals.length > 1 && (
            <p className="mt-2 text-[11px] text-muted-foreground">{goals.length - 1} more goal{goals.length > 2 ? "s" : ""} waiting for a gentle check-in.</p>
          )}
        </div>
      </div>
    </section>
  );
}

function TinyWinInline({ goalId }: { goalId: string }) {
  const [text, setText] = useState("");
  return (
    <div className="mt-2 flex gap-2">
      <Input placeholder="A little something to honor…" value={text} onChange={e=>setText(e.target.value)}
        onKeyDown={e=>{ if(e.key==="Enter" && text.trim()) { addTinyWin(text.trim(), goalId); setText(""); toast.success("Win saved 🌸"); } }} />
      <Button variant="outline" size="sm" onClick={()=>{ if(!text.trim()) return; addTinyWin(text.trim(), goalId); setText(""); toast.success("Win saved 🌸"); }}>
        <Sparkles className="h-4 w-4" />
      </Button>
    </div>
  );
}

/* ---------------- Create dialog ---------------- */

function CreateGoalDialog({
  open, onOpenChange, onCreate,
}: {
  open: boolean; onOpenChange: (o: boolean) => void;
  onCreate: (g: Partial<Goal> & { title: string }, ex: GoalExtras) => void;
}) {
  const [title, setTitle] = useState("");
  const [cat, setCat] = useState<Goal["category"]>("Family");
  const [why, setWhy] = useState("");
  const [nextStep, setNextStep] = useState("");
  const [targetDate, setTargetDate] = useState("");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">🌱 Plant a new intention</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">Goal</label>
            <Input autoFocus placeholder="What are you growing?" value={title} onChange={e=>setTitle(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Life area</label>
            <Select value={cat} onValueChange={(v:any)=>setCat(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATS.map(c => <SelectItem key={c} value={c}>{CAT_META[c].emoji} {c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Why this matters</label>
            <Textarea rows={2} placeholder="The feeling underneath the goal…" value={why} onChange={e=>setWhy(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground">Next step</label>
              <Input placeholder="One small move" value={nextStep} onChange={e=>setNextStep(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Target</label>
              <Input placeholder="Dec 2026" value={targetDate} onChange={e=>setTargetDate(e.target.value)} />
            </div>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={()=>onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => {
            if (!title.trim()) return;
            onCreate({ title: title.trim(), category: cat }, { why, nextStep, targetDate, startedAt: new Date().toISOString() });
            setTitle(""); setWhy(""); setNextStep(""); setTargetDate("");
            onOpenChange(false);
            toast.success("Intention planted 🌱");
          }}>Plant it</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Journey detail (sheet) ---------------- */

function JourneyDetail({
  goal, extras, pinned, onPin, onPatch, onExtra, onDelete,
  linkedTasks, onAddTask, onToggleTask, onUnlinkTask,
}: {
  goal: Goal; extras: GoalExtras; pinned: boolean; onPin: () => void;
  onPatch: (p: Partial<Goal>) => void;
  onExtra: (p: Partial<GoalExtras>) => void;
  onDelete: () => void;
  linkedTasks: import("@/lib/types").Task[];
  onAddTask: (title: string) => void;
  onToggleTask: (id: string, done: boolean) => void;
  onUnlinkTask: (id: string) => void;
}) {
  const M = CAT_META[goal.category];
  const [newMs, setNewMs] = useState("");
  const [newTask, setNewTask] = useState("");
  const milestones = extras.milestones || [];
  const addMilestone = () => {
    if (!newMs.trim()) return;
    onExtra({ milestones: [...milestones, { id: crypto.randomUUID(), label: newMs.trim(), done: false }] });
    setNewMs("");
  };
  const toggleMs = (id: string) =>
    onExtra({ milestones: milestones.map(m => m.id === id ? { ...m, done: !m.done } : m) });
  const removeMs = (id: string) =>
    onExtra({ milestones: milestones.filter(m => m.id !== id) });

  const checkIn = (tone: CheckIn) => {
    onExtra({ lastCheckIn: { tone, at: new Date().toISOString() } });
    if (tone === "heavy") toast("This one feels heavy. Want to simplify or pause?", { description: "We'll suggest gentler options." });
    else toast.success("Check-in saved");
  };

  const msDone = milestones.filter(m => m.done).length;
  const msPct = milestones.length ? Math.round((msDone / milestones.length) * 100) : 0;
  const syncProgressToMilestones = () => { onPatch({ progress: msPct }); toast.success(`Progress synced · ${msPct}%`); };

  const shareGoal = async () => {
    const lines = [
      `🌱 ${goal.title}`,
      `Category: ${goal.category}  ·  Progress: ${goal.progress}%`,
      extras.why ? `Why: ${extras.why}` : "",
      extras.nextStep ? `Next: ${extras.nextStep}` : "",
      extras.targetDate ? `Target: ${extras.targetDate}` : "",
      milestones.length ? `\nMilestones (${msDone}/${milestones.length}):` : "",
      ...milestones.map(m => ` ${m.done ? "✓" : "○"} ${m.label}`),
    ].filter(Boolean).join("\n");
    try {
      if (navigator.share) {
        await navigator.share({ title: `Goal: ${goal.title}`, text: lines });
      } else {
        await navigator.clipboard.writeText(lines);
        toast.success("Goal copied to clipboard");
      }
    } catch { /* user cancelled */ }
  };

  const addLinkedTask = () => {
    if (!newTask.trim()) return;
    onAddTask(newTask.trim());
    setNewTask("");
    toast.success("Task added & linked");
  };

  return (
    <>
      <SheetHeader>
        <div className="flex items-center gap-3">
          <span className={cn("flex h-12 w-12 items-center justify-center rounded-2xl text-2xl", M.tint)}>{M.emoji}</span>
          <div className="min-w-0 flex-1">
            <div className={cn("text-[10px] uppercase tracking-wider", M.text)}>{goal.category}</div>
            <SheetTitle className="font-display text-xl leading-tight">{goal.title}</SheetTitle>
          </div>
          <Button variant="outline" size="sm" onClick={shareGoal} title="Share goal">
            <Share2 className="h-3.5 w-3.5" />
          </Button>
          <Button variant={pinned ? "default" : "outline"} size="sm" onClick={onPin}>
            <Sparkles className="mr-1 h-3.5 w-3.5" /> {pinned ? "Pinned" : "Pin"}
          </Button>
        </div>
      </SheetHeader>

      <div className="mt-6 space-y-6">
        {/* progress */}
        <div>
          <div className="flex items-center justify-between text-xs uppercase tracking-wider text-muted-foreground">
            <span>Current Progress</span>
            <span className="font-display text-2xl text-foreground">{goal.progress}%</span>
          </div>
          <Slider className="mt-2" value={[goal.progress]} max={100} step={5}
            onValueChange={(v)=>onPatch({ progress: v[0] })} />
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <Input className="h-7 w-40" placeholder="Target date"
              value={extras.targetDate || ""} onChange={e=>onExtra({ targetDate: e.target.value })} />
          </div>
        </div>

        {/* why */}
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Why this matters</div>
          <Textarea rows={2} className="mt-1" placeholder="The feeling underneath…"
            value={extras.why || ""} onChange={e=>onExtra({ why: e.target.value })} />
        </div>

        {/* next step */}
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Next action</div>
          <Input className="mt-1" placeholder="One small move"
            value={extras.nextStep || ""} onChange={e=>onExtra({ nextStep: e.target.value })} />
        </div>

        {/* milestones */}
        <div>
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Milestones</div>
            {milestones.length > 0 && (
              <button onClick={syncProgressToMilestones} className="text-[11px] text-primary hover:underline">
                Sync progress · {msDone}/{milestones.length} ({msPct}%)
              </button>
            )}
          </div>
          {milestones.length > 0 && <Progress value={msPct} className="mt-2 h-1" />}
          <ul className="mt-2 space-y-1.5">
            {milestones.map(m => (
              <li key={m.id} className="group flex items-center gap-2">
                <button onClick={()=>toggleMs(m.id)}>
                  {m.done ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
                </button>
                <span className={cn("flex-1 text-sm", m.done && "line-through text-muted-foreground")}>{m.label}</span>
                <button onClick={()=>removeMs(m.id)} className="opacity-0 group-hover:opacity-100">
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex gap-2">
            <Input placeholder="Add a milestone…" value={newMs} onChange={e=>setNewMs(e.target.value)}
              onKeyDown={e=>e.key==="Enter" && addMilestone()} />
            <Button onClick={addMilestone} variant="outline" size="sm"><Plus className="h-4 w-4" /></Button>
          </div>
        </div>

        {/* linked tasks */}
        <div>
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Linked tasks</div>
            <span className="text-[11px] text-muted-foreground">
              {linkedTasks.filter(t=>t.done).length}/{linkedTasks.length} done
            </span>
          </div>
          <ul className="mt-2 space-y-1.5">
            {linkedTasks.length === 0 && <li className="text-xs text-muted-foreground">No tasks linked yet. Add a small next move below.</li>}
            {linkedTasks.map(t => (
              <li key={t.id} className="group flex items-center gap-2">
                <button onClick={()=>onToggleTask(t.id, !t.done)}>
                  {t.done ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
                </button>
                <span className={cn("flex-1 text-sm", t.done && "line-through text-muted-foreground")}>{t.title}</span>
                <button onClick={()=>onUnlinkTask(t.id)} className="opacity-0 group-hover:opacity-100" title="Unlink">
                  <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex gap-2">
            <Input placeholder="Add a task for this goal…" value={newTask} onChange={e=>setNewTask(e.target.value)}
              onKeyDown={e=>e.key==="Enter" && addLinkedTask()} />
            <Button onClick={addLinkedTask} variant="outline" size="sm"><ListChecks className="h-4 w-4" /></Button>
          </div>
        </div>

        {/* tiny win for this goal */}
        <div className="rounded-2xl border border-border/50 bg-rose-50/40 p-4 dark:bg-rose-950/20">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Celebrate a tiny win</div>
          <TinyWinInline goalId={goal.id} />
        </div>

        {/* gentle check-in */}
        <div className="rounded-2xl border border-border/50 bg-muted/30 p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Gentle check-in</div>
          <p className="mt-1 text-sm">How does this goal feel right now?</p>
          {extras.lastCheckIn && (
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Last: {TONE_META[extras.lastCheckIn.tone].emoji} {TONE_META[extras.lastCheckIn.tone].label} · {new Date(extras.lastCheckIn.at).toLocaleDateString()}
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            {([
              { k: "energizing", label: "😊 Energizing" },
              { k: "steady",     label: "😌 Steady" },
              { k: "neutral",    label: "😐 Neutral" },
              { k: "heavy",      label: "😓 Heavy" },
            ] as { k: CheckIn; label: string }[]).map(o => {
              const active = extras.lastCheckIn?.tone === o.k;
              return (
                <button key={o.k} onClick={()=>checkIn(o.k)}
                  className={cn("rounded-full border px-3 py-1 text-xs transition-colors",
                    active ? "border-primary/40 bg-primary/10" : "border-border/50 bg-background hover:bg-muted/40")}>
                  {o.label}
                </button>
              );
            })}
          </div>
          {extras.lastCheckIn?.tone === "heavy" && (
            <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
              <p>This one feels heavy. Try one of these:</p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={()=>{ onPatch({ status: "paused" }); toast.success("Paused for now"); }}>Pause goal</Button>
                <Button size="sm" variant="outline" onClick={()=>{ onPatch({ timeline: "Year" }); toast.success("Moved to Year"); }}>Give it more space</Button>
                <Button size="sm" variant="ghost" onClick={onDelete}>Move on</Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-2">
          <Button variant="ghost" size="sm" onClick={onDelete}>
            <Trash2 className="mr-1 h-3.5 w-3.5" /> Release
          </Button>
          <div className="flex gap-2">
            <Select value={goal.status} onValueChange={(v:any)=>onPatch({ status: v })}>
              <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </>
  );
}