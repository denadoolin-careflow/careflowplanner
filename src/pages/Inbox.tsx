import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { TaskRow } from "@/components/cards/TaskRow";
import {
  Sparkles, Check, RefreshCw, ArrowRight, Pill, Phone, Calendar as CalendarIcon,
  ShoppingCart, FileText, GraduationCap, Cake, Car,
  Home, Users, Heart, BookOpen, Moon, HeartHandshake, Lightbulb, Puzzle,
  Plane, Briefcase, Palette, PawPrint, Leaf, Inbox as InboxIcon, Zap, Tag as TagIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import type { Area, Priority, TaskStatus } from "@/lib/types";
import { UnscheduledTasksRail } from "@/components/calendar/UnscheduledTasksRail";
import { TaskSelectionProvider, useTaskSelection } from "@/lib/task-selection";
import { BulkActionBar } from "@/components/tasks/BulkActionBar";
import { TaskDetailPane } from "@/components/tasks/TaskDetailPane";
import { Link, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { aiInvoke } from "@/lib/ai-invoke";
import { parseTaskInput } from "@/lib/nlp-task";
import { isToday, isFuture, parseISO, format } from "date-fns";
import basketImg from "@/assets/inbox-basket.png";

interface Suggestion {
  task_id: string;
  area?: string;
  project_id?: string | null;
  status?: TaskStatus;
  priority?: Priority;
  suggested_due_date?: string | null;
}

export default function Inbox() {
  return (
    <TaskSelectionProvider storageKey="inbox">
      <InboxInner />
      <BulkActionBar />
    </TaskSelectionProvider>
  );
}

const CAREGIVER_PRESETS: { icon: any; label: string; title: string; area: Area; tint: string }[] = [
  { icon: Pill,          label: "Medication",  title: "Medication — ",        area: "Caregiving",          tint: "bg-rose-50 text-rose-700 ring-rose-100" },
  { icon: Phone,         label: "Call",         title: "Call ",                area: "Family",              tint: "bg-sky-50 text-sky-700 ring-sky-100" },
  { icon: CalendarIcon,  label: "Appointment",  title: "Appointment — ",       area: "Appointments",        tint: "bg-emerald-50 text-emerald-700 ring-emerald-100" },
  { icon: ShoppingCart,  label: "Grocery",      title: "Grocery — ",           area: "Meals",               tint: "bg-amber-50 text-amber-700 ring-amber-100" },
  { icon: FileText,      label: "Paperwork",    title: "Paperwork — ",         area: "Personal",            tint: "bg-stone-50 text-stone-700 ring-stone-100" },
  { icon: GraduationCap, label: "School",       title: "School — ",            area: "Kids",                tint: "bg-teal-50 text-teal-700 ring-teal-100" },
  { icon: Cake,          label: "Birthday",     title: "Birthday — ",          area: "Holidays & Birthdays",tint: "bg-pink-50 text-pink-700 ring-pink-100" },
  { icon: Car,           label: "Errand",       title: "Errand — ",            area: "Personal",            tint: "bg-violet-50 text-violet-700 ring-violet-100" },
];

const CATEGORIES: { icon: any; label: string; tint: string }[] = [
  { icon: Home,          label: "Home",       tint: "bg-emerald-50/70 text-emerald-700 ring-emerald-100" },
  { icon: Users,         label: "Family",     tint: "bg-orange-50/70 text-orange-700 ring-orange-100" },
  { icon: Heart,         label: "Health",     tint: "bg-rose-50/70 text-rose-700 ring-rose-100" },
  { icon: BookOpen,      label: "Learning",   tint: "bg-violet-50/70 text-violet-700 ring-violet-100" },
  { icon: Moon,          label: "Reflection", tint: "bg-indigo-50/70 text-indigo-700 ring-indigo-100" },
  { icon: HeartHandshake,label: "Caregiving", tint: "bg-pink-50/70 text-pink-700 ring-pink-100" },
  { icon: Lightbulb,     label: "Ideas",      tint: "bg-amber-50/70 text-amber-700 ring-amber-100" },
  { icon: Puzzle,        label: "Kids",       tint: "bg-teal-50/70 text-teal-700 ring-teal-100" },
  { icon: Plane,         label: "Travel",     tint: "bg-sky-50/70 text-sky-700 ring-sky-100" },
  { icon: Briefcase,     label: "Work",       tint: "bg-stone-50/70 text-stone-700 ring-stone-100" },
  { icon: Palette,       label: "Creative",   tint: "bg-fuchsia-50/70 text-fuchsia-700 ring-fuchsia-100" },
  { icon: PawPrint,      label: "Pets",       tint: "bg-lime-50/70 text-lime-700 ring-lime-100" },
];

function InboxInner() {
  const { state, addTask, updateTask } = useStore() as any;
  const navigate = useNavigate();
  const { paneOpen, clear } = useTaskSelection();
  const [triaging, setTriaging] = useState(false);
  const [suggestions, setSuggestions] = useState<Record<string, Suggestion>>({});
  const [draft, setDraft] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const items = useMemo(
    () => state.tasks.filter((t: any) => t.inbox && !t.done && !t.parentTaskId && t.status !== "parked"),
    [state.tasks],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") clear(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [clear]);

  const parsed = useMemo(() => (draft.trim().length > 2 ? parseTaskInput(draft) : null), [draft]);

  const submitCapture = async (overrideArea?: Area) => {
    const raw = draft.trim();
    if (!raw) return;
    const p = parseTaskInput(raw);
    await addTask({
      title: p.title || raw,
      dueDate: p.dueDate,
      area: (p.area as Area) ?? overrideArea ?? (activeCategory as Area | undefined),
      energy: p.energy,
      tags: p.tags,
      estMinutes: p.estMinutes,
      inbox: true,
    });
    setDraft("");
    toast.success("Caught it ✨", { description: "Safely held in your inbox." });
  };

  const quickAdd = async (title: string, area: Area) => {
    await addTask({ title, area, inbox: true });
    toast.success(`${title.trim()}`, { description: "Added to inbox." });
  };

  const triage = async () => {
    if (items.length === 0) {
      toast.info("Nothing to organize yet — capture something first.");
      return;
    }
    setTriaging(true);
    try {
      const { data, error } = await aiInvoke("ai-inbox-triage", { body: {} });
      if (error) throw error;
      const map: Record<string, Suggestion> = {};
      for (const s of (data as any)?.suggestions ?? []) {
        if (s?.task_id) map[s.task_id] = s as Suggestion;
      }
      setSuggestions(map);
      toast.success(`Organized ${Object.keys(map).length} item${Object.keys(map).length === 1 ? "" : "s"}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Organize failed");
    } finally {
      setTriaging(false);
    }
  };

  const acceptAllSuggestions = async () => {
    for (const [taskId, s] of Object.entries(suggestions)) {
      await updateTask(taskId, {
        area: (s.area as Area) ?? undefined,
        projectId: s.project_id ?? undefined,
        status: s.status ?? "active",
        priority: s.priority ?? "medium",
        dueDate: s.suggested_due_date ?? undefined,
        inbox: false,
      });
    }
    setSuggestions({});
    toast.success("All set — your inbox is lighter.");
  };

  const stats = useMemo(() => {
    const total = items.length;
    const quickWins = items.filter((t: any) => (t.estMinutes ?? 99) <= 10).length;
    const needScheduling = items.filter((t: any) => {
      if (!t.dueDate) return false;
      const d = parseISO(t.dueDate);
      return isToday(d) || isFuture(d);
    }).length;
    const needCategory = items.filter((t: any) => !t.area).length;
    return { total, quickWins, needScheduling, needCategory };
  }, [items]);

  return (
    <div className="relative min-h-screen bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,hsl(var(--primary)/0.06),transparent_70%)]">
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 md:px-8 md:py-10">
        {/* ────────── Header + Hero ────────── */}
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:gap-8 animate-fade-in">
          <div className="flex flex-col justify-center gap-3">
            <h1 className="font-display text-4xl tracking-tight text-foreground md:text-5xl">Inbox</h1>
            <p className="text-base font-medium text-primary/80">Your mental unloading zone.</p>
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground md:text-[15px]">
              Capture anything so you can focus on what matters now.
            </p>
          </div>

          <div className="relative overflow-hidden rounded-[28px] border border-border/40 bg-gradient-to-br from-[hsl(36_60%_97%)] via-card to-[hsl(150_30%_96%)] p-6 shadow-[0_20px_60px_-30px_hsl(var(--primary)/0.35)] md:p-8 dark:from-card dark:to-card">
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[hsl(20_70%_88%)]/40 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-12 -left-8 h-44 w-44 rounded-full bg-[hsl(150_40%_85%)]/40 blur-3xl" />

            <div className="relative grid gap-5 sm:grid-cols-[160px_minmax(0,1fr)] sm:items-center md:grid-cols-[200px_minmax(0,1fr)] md:gap-7">
              <div className="mx-auto sm:mx-0">
                <img
                  src={basketImg}
                  alt="Wicker basket holding notes and a sage sprig"
                  width={200}
                  height={200}
                  className="h-32 w-32 select-none animate-[float_6s_ease-in-out_infinite] object-contain sm:h-40 sm:w-40 md:h-48 md:w-48"
                  draggable={false}
                />
              </div>
              <div className="space-y-3 text-center sm:text-left">
                <div className="inline-flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h2 className="font-display text-2xl tracking-tight md:text-[28px]">
                    {items.length === 0 ? "Your mind is clear" : `${items.length} ${items.length === 1 ? "thing" : "things"} held gently`}
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  {items.length === 0
                    ? "Nothing is waiting in your inbox."
                    : "Capture more, or let me organize what's here."}
                </p>
                <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-[13px] text-muted-foreground sm:justify-start">
                  {["Tasks", "Ideas", "Appointments", "Reminders", "Notes"].map(l => (
                    <li key={l} className="inline-flex items-center gap-1.5">
                      <Check className="h-3.5 w-3.5 text-emerald-600/80" /> {l}
                    </li>
                  ))}
                </ul>
                <p className="pt-1 text-xs italic text-muted-foreground/80">Everything starts here.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ────────── Quick Capture ────────── */}
        <section className="rounded-[24px] border border-border/50 bg-card/70 p-5 shadow-[0_10px_40px_-25px_hsl(var(--primary)/0.4)] backdrop-blur-md md:p-7">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="font-display text-lg tracking-tight">Quick Capture</h3>
            </div>
            <Button
              onClick={triage}
              disabled={triaging}
              className="h-9 gap-2 rounded-full bg-primary px-4 text-[13px] font-medium shadow-sm hover:shadow-md"
            >
              {triaging ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Organize for Me
            </Button>
          </div>

          <div className="relative">
            <div className="absolute left-3 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full bg-primary/10 text-primary">
              <span className="text-base leading-none">＋</span>
            </div>
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void submitCapture(); } }}
              placeholder="What needs your attention?"
              className="h-14 rounded-2xl border-border/40 bg-background/70 pl-14 pr-28 text-[15px] shadow-inner placeholder:text-muted-foreground/70 focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/15"
            />
            {draft.trim() && (
              <Button
                onClick={() => void submitCapture()}
                size="sm"
                className="absolute right-2 top-1/2 h-10 -translate-y-1/2 rounded-xl px-4 text-[13px]"
              >
                Capture
              </Button>
            )}
          </div>

          {parsed && (parsed.dueDate || parsed.area || parsed.energy || parsed.tags?.length) ? (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-primary/20 bg-primary/[0.04] px-3 py-2.5 text-[12.5px] animate-fade-in">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="text-muted-foreground">I noticed:</span>
              {parsed.dueDate && (
                <span className="inline-flex items-center gap-1 rounded-full bg-card px-2 py-0.5 ring-1 ring-border/60">
                  <CalendarIcon className="h-3 w-3" /> {format(parseISO(parsed.dueDate), "EEE, MMM d")}
                </span>
              )}
              {parsed.area && (
                <span className="inline-flex items-center gap-1 rounded-full bg-card px-2 py-0.5 ring-1 ring-border/60">
                  <Heart className="h-3 w-3" /> {parsed.area}
                </span>
              )}
              {parsed.energy && (
                <span className="inline-flex items-center gap-1 rounded-full bg-card px-2 py-0.5 capitalize ring-1 ring-border/60">
                  <Zap className="h-3 w-3" /> {parsed.energy} energy
                </span>
              )}
              {parsed.tags?.map(t => (
                <span key={t} className="inline-flex items-center gap-1 rounded-full bg-card px-2 py-0.5 ring-1 ring-border/60">
                  <TagIcon className="h-3 w-3" /> {t}
                </span>
              ))}
              <button
                onClick={() => void submitCapture()}
                className="ml-auto inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-[12px] font-medium text-primary-foreground hover:opacity-90"
              >
                <Check className="h-3 w-3" /> Accept suggestions
              </button>
            </div>
          ) : null}

          {/* Caregiver quick actions */}
          <div className="mt-5 flex flex-wrap gap-2">
            {CAREGIVER_PRESETS.map(p => {
              const Icon = p.icon;
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => void quickAdd(p.title, p.area)}
                  className={cn(
                    "group inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-medium ring-1 transition-all hover:-translate-y-0.5 hover:shadow-sm",
                    p.tint,
                  )}
                >
                  <Icon className="h-3.5 w-3.5" /> {p.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* ────────── Categories ────────── */}
        <section className="rounded-[24px] border border-border/50 bg-card/60 p-5 backdrop-blur-md md:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg tracking-tight">Quick Capture Categories</h3>
            <Link to="/tags" className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground">
              Manage Tags <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(c => {
              const Icon = c.icon;
              const active = activeCategory === c.label;
              return (
                <button
                  key={c.label}
                  type="button"
                  onClick={() => setActiveCategory(active ? null : c.label)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium ring-1 transition-all hover:-translate-y-0.5 hover:shadow-sm",
                    c.tint,
                    active && "ring-2 ring-primary/40",
                  )}
                  aria-pressed={active}
                >
                  <Icon className="h-3.5 w-3.5" /> {c.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* ────────── Current Inbox Items (only when present) ────────── */}
        {items.length > 0 && (
          <section className="rounded-[24px] border border-border/50 bg-card/60 p-4 backdrop-blur-md md:p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-lg tracking-tight">Held in your inbox</h3>
              {Object.keys(suggestions).length > 0 && (
                <Button size="sm" variant="outline" onClick={acceptAllSuggestions} className="h-8 gap-1.5 rounded-full text-[12px]">
                  <Check className="h-3 w-3" /> Apply all suggestions
                </Button>
              )}
            </div>
            <div className="space-y-1.5">
              {items.map((t: any) => (
                <div key={t.id} className="rounded-2xl transition-colors hover:bg-muted/40">
                  <TaskRow task={t} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ────────── Inbox at a Glance ────────── */}
        <section className="rounded-[24px] border border-border/50 bg-card/60 p-5 backdrop-blur-md md:p-6">
          <h3 className="mb-4 font-display text-lg tracking-tight">Inbox at a Glance</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <GlanceCard icon={<InboxIcon className="h-4 w-4" />} tint="bg-stone-50 text-stone-600" value={stats.total} label="Inbox Items" hint="waiting" />
            <GlanceCard icon={<Zap className="h-4 w-4" />} tint="bg-amber-50 text-amber-700" value={stats.quickWins} label="Quick Wins" hint="easy to clear" />
            <GlanceCard icon={<CalendarIcon className="h-4 w-4" />} tint="bg-emerald-50 text-emerald-700" value={stats.needScheduling} label="Need Scheduling" hint="time to plan" />
            <GlanceCard icon={<TagIcon className="h-4 w-4" />} tint="bg-rose-50 text-rose-600" value={stats.needCategory} label="Need Categories" hint="needs a home" />
            <button
              type="button"
              onClick={triage}
              className="group flex flex-col justify-between rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-4 text-left text-primary-foreground shadow-[0_15px_40px_-20px_hsl(var(--primary)/0.7)] transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_50px_-20px_hsl(var(--primary)/0.8)]"
            >
              <div className="flex items-center justify-between">
                <span className="font-display text-base tracking-tight">Process Inbox</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </div>
              <p className="mt-3 text-[11.5px] leading-relaxed opacity-85">
                Review and organize your items step by step.
              </p>
            </button>
          </div>
        </section>

        {/* ────────── Gentle Reminder ────────── */}
        <section className="overflow-hidden rounded-[24px] border border-border/40 bg-gradient-to-br from-[hsl(150_35%_96%)] via-card to-[hsl(36_55%_97%)] p-5 shadow-sm md:p-6 dark:from-card dark:to-card">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-100/70 text-emerald-700 ring-1 ring-emerald-200/60">
                <Leaf className="h-5 w-5" />
              </div>
              <div>
                <p className="font-display text-[17px] tracking-tight">Gentle Reminder 🌿</p>
                <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
                  You don't have to carry everything in your head. Capture it here and come back later.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => navigate("/lunar")}
              className="h-10 shrink-0 gap-2 rounded-full border-border/60 bg-background/70 px-4 text-[13px] backdrop-blur"
            >
              <Moon className="h-3.5 w-3.5" /> See Lunar Insight
            </Button>
          </div>
        </section>
      </div>

      {paneOpen && <TaskDetailPane />}
      <UnscheduledTasksRail />
    </div>
  );
}

function GlanceCard({ icon, tint, value, label, hint }: { icon: React.ReactNode; tint: string; value: number; label: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-border/40 bg-background/70 p-4 transition-all hover:-translate-y-0.5 hover:shadow-sm">
      <div className={cn("inline-grid h-8 w-8 place-items-center rounded-xl", tint)}>{icon}</div>
      <div className="mt-3 font-display text-3xl tracking-tight">{value}</div>
      <div className="mt-0.5 text-[13px] font-medium">{label}</div>
      <div className="text-[11.5px] text-muted-foreground">{hint}</div>
    </div>
  );
}

interface Suggestion {
  task_id: string;
  area?: string;
  project_id?: string | null;
  status?: TaskStatus;
  priority?: Priority;
  suggested_due_date?: string | null;
}

export default function Inbox() {
  const isMobile = useIsMobile();
  if (isMobile) return <MobileInbox />;
  return (
    <TaskSelectionProvider storageKey="inbox">
      <InboxInner />
      <BulkActionBar />
    </TaskSelectionProvider>
  );
}

function InboxInner() {
  const { state, updateTask } = useStore();
  const { paneOpen, togglePane, setOrderedIds, clear, selectionMode, toggleSelectionMode, selectAll, count } = useTaskSelection();
  const [prefs, setPrefs] = useTaskListPrefs("inbox");
  const [triaging, setTriaging] = useState(false);
  const [suggestions, setSuggestions] = useState<Record<string, Suggestion>>({});
  const groups = useMemo(() => {
    const base = state.tasks.filter(t => t.inbox && !t.done && !t.parentTaskId && t.status !== "parked");
    const filtered = applyFilters(base, prefs.filter);
    const sorted = sortTasks(filtered, prefs.sort, prefs.sortDir);
    return groupTasks(sorted, prefs.group, state.projects ?? []);
  }, [state.tasks, state.projects, prefs]);
  const items = useMemo(() => groups.flatMap(g => g.tasks), [groups]);

  useEffect(() => { setOrderedIds(items.map(t => t.id)); }, [items, setOrderedIds]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") clear(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [clear]);

  const triage = async () => {
    if (items.length === 0) return;
    setTriaging(true);
    try {
      const { data, error } = await aiInvoke("ai-inbox-triage", { body: {} });
      if (error) throw error;
      const map: Record<string, Suggestion> = {};
      for (const s of (data as any)?.suggestions ?? []) {
        if (s?.task_id) map[s.task_id] = s as Suggestion;
      }
      setSuggestions(map);
      toast.success(`Triaged ${Object.keys(map).length} task${Object.keys(map).length === 1 ? "" : "s"}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Triage failed");
    } finally {
      setTriaging(false);
    }
  };

  const accept = async (taskId: string) => {
    const s = suggestions[taskId];
    if (!s) return;
    await updateTask(taskId, {
      area: (s.area as Area) ?? undefined,
      projectId: s.project_id ?? undefined,
      status: s.status ?? "active",
      priority: s.priority ?? "medium",
      dueDate: s.suggested_due_date ?? undefined,
      inbox: false,
    });
    setSuggestions(p => { const n = { ...p }; delete n[taskId]; return n; });
  };

  const dismiss = (taskId: string) =>
    setSuggestions(p => { const n = { ...p }; delete n[taskId]; return n; });

  const { tags } = useTags();
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [controlsVisible, setControlsVisible] = useState<boolean>(() => {
    try { return localStorage.getItem("inbox:controls") !== "0"; } catch { return true; }
  });
  const toggleControls = () => {
    setControlsVisible(v => {
      const next = !v;
      try { localStorage.setItem("inbox:controls", next ? "1" : "0"); } catch {}
      return next;
    });
  };
  const [tagLibraryVisible, setTagLibraryVisible] = useState<boolean>(() => {
    try { return localStorage.getItem("inbox:tagLibrary") !== "0"; } catch { return true; }
  });
  const toggleTagLibrary = () => {
    setTagLibraryVisible(v => {
      const next = !v;
      try { localStorage.setItem("inbox:tagLibrary", next ? "1" : "0"); } catch {}
      return next;
    });
  };
  const filteredGroups = useMemo(() => {
    if (!tagFilter) return groups;
    return groups
      .map(g => ({ ...g, tasks: g.tasks.filter(t => (t.tags ?? []).some(n => n.toLowerCase() === tagFilter.toLowerCase())) }))
      .filter(g => g.tasks.length > 0);
  }, [groups, tagFilter]);

  return (
    <div className="flex gap-6">
      <div className="min-w-0 flex-1 mx-auto w-full max-w-3xl space-y-4 p-4 md:p-6">
      <header className="flex flex-col gap-1">
        {/* Title row */}
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary sm:h-10 sm:w-10">
            <InboxIcon className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold tracking-tight sm:text-2xl">Inbox</h1>
            <p className="truncate text-[11px] text-muted-foreground sm:text-sm">
              {items.length} waiting · capture now, organize later
            </p>
          </div>
        </div>

        {/* Action buttons row */}
        <div className="flex flex-wrap items-center justify-end gap-1 sm:gap-1.5">
          {/* Mobile: icon-only essentials */}
          <Button
            variant={selectionMode ? "default" : "ghost"}
            size="icon"
            onClick={toggleSelectionMode}
            className="h-8 w-8 sm:hidden"
            title={selectionMode ? "Exit select mode" : "Select multiple tasks"}
            aria-label="Select tasks"
          >
            <CheckSquare className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={triage}
            disabled={triaging || items.length === 0}
            className="h-8 w-8 sm:hidden"
            title="Smart triage"
            aria-label="Smart triage"
          >
            {triaging ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
          </Button>
          <Button
            variant={controlsVisible ? "default" : "ghost"}
            size="icon"
            onClick={toggleControls}
            className="h-8 w-8 sm:hidden"
            title="Options"
            aria-label="Options"
            aria-pressed={controlsVisible}
          >
            <SlidersHorizontal className="h-3 w-3" />
          </Button>

          {/* Desktop / tablet */}
          <div className="hidden flex-wrap items-center justify-end gap-1.5 sm:flex">
            <Button
              variant={selectionMode ? "default" : "outline"}
              size="sm"
              onClick={toggleSelectionMode}
              className="h-8 gap-1.5 text-xs"
              title={selectionMode ? "Exit select mode" : "Select multiple tasks"}
            >
              <CheckSquare className="h-3 w-3" />
              {selectionMode ? "Done" : "Select"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={triage}
              disabled={triaging || items.length === 0}
              className="h-8 gap-1.5 text-xs"
            >
              {triaging ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              Smart triage
            </Button>
            <Button
              variant={controlsVisible ? "default" : "outline"}
              size="sm"
              onClick={toggleControls}
              className="h-8 gap-1.5 text-xs"
              title={controlsVisible ? "Hide group / filter / sort" : "Show group / filter / sort"}
              aria-pressed={controlsVisible}
            >
              <SlidersHorizontal className="h-3 w-3" />
              <span>Options</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={toggleTagLibrary}
              title={tagLibraryVisible ? "Hide tag library" : "Show tag library"}
              aria-label="Toggle tag library"
            >
              {tagLibraryVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="hidden h-8 w-8 lg:inline-flex"
              onClick={togglePane}
              title={paneOpen ? "Hide details pane" : "Show details pane"}
              aria-label="Toggle details pane"
            >
              {paneOpen ? <PanelRightClose className="h-3.5 w-3.5" /> : <PanelRightOpen className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>

        {/* Controls row — appears below buttons when Options is on */}
        {controlsVisible && (
          <div className="flex flex-wrap items-center gap-2">
            <TaskListControls prefs={prefs} onChange={setPrefs} />
          </div>
        )}
      </header>

      {selectionMode && (
        <div className="flex items-center justify-between rounded-xl border border-primary/40 bg-primary/5 px-3 py-2 text-xs">
          <span className="font-medium text-primary">
            {count === 0 ? "Tap tasks to select" : `${count} selected`}
          </span>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={selectAll}>
              Select all
            </Button>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={clear}>
              Clear
            </Button>
          </div>
        </div>
      )}

      <InlineTaskComposer
        defaults={{ inbox: true }}
        defaultTags={tagFilter ? [tagFilter] : undefined}
        nlp
        placeholder="Capture anything — try “Call vet tomorrow at 3pm p2 #pet”"
      />

      {tags.length > 0 && (
        <div
          data-no-swipe
          className="sticky top-0 z-20 -mx-4 border-b border-border/60 bg-background/85 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/70 sm:hidden"
        >
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/60">
            <button
              type="button"
              onClick={() => setTagFilter(null)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-[11px] font-medium transition-colors",
                !tagFilter ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
              )}
              aria-pressed={!tagFilter}
            >
              All <span className="opacity-70">· {items.length}</span>
            </button>
            {tags.map(t => {
              const active = tagFilter?.toLowerCase() === t.name.toLowerCase();
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTagFilter(active ? null : t.name)}
                  className="shrink-0"
                  aria-pressed={active}
                >
                  <TagChip name={t.name} subtle={!active} size="sm" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {tags.length > 0 && tagLibraryVisible && (
        <div className="rounded-2xl border border-border/60 bg-card/40 p-2.5">
          <div className="mb-1.5 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
              <TagsIcon className="h-3 w-3" /> Tag library
            </div>
            <div className="flex items-center gap-2">
              {tagFilter && (
                <button
                  onClick={() => setTagFilter(null)}
                  className="text-[11px] text-muted-foreground hover:text-foreground"
                >Clear</button>
              )}
              <Link to="/tags" className="text-[11px] text-muted-foreground hover:text-foreground">Manage →</Link>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {tags.map(t => {
              const active = tagFilter?.toLowerCase() === t.name.toLowerCase();
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTagFilter(active ? null : t.name)}
                  className="transition-transform hover:-translate-y-px"
                  aria-pressed={active}
                >
                  <TagChip name={t.name} subtle={!active} size="sm" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border/60 bg-card/60 p-2">
        {filteredGroups.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Your inbox is clear ✨</div>
        ) : (
          <div className="space-y-3">
            {filteredGroups.map(g => (
              <div key={g.key} className="space-y-1">
                {prefs.group !== "none" && (
                  <div className="px-2 pt-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    {g.label} <span className="opacity-60">· {g.tasks.length}</span>
                  </div>
                )}
                {g.tasks.map(t => {
              const s = suggestions[t.id];
              const project = s?.project_id ? state.projects?.find(p => p.id === s.project_id) : undefined;
              return (
                <div key={t.id}>
                  <TaskRow task={t} />
                  {s && (
                    <div className="mx-2 mb-2 -mt-1 flex flex-wrap items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-1.5 text-[11px] animate-fade-in">
                      <Sparkles className="h-3 w-3 text-primary" />
                      <span className="text-muted-foreground">Suggest:</span>
                      {s.area && <span className="rounded-full bg-card px-1.5 py-0.5">{s.area}</span>}
                      {project && <span className="rounded-full bg-card px-1.5 py-0.5" style={project.color ? { color: project.color } : undefined}>{project.name}</span>}
                      {s.status && <span className="rounded-full bg-card px-1.5 py-0.5 capitalize">{s.status.replace("_"," ")}</span>}
                      {s.priority && <span className="rounded-full bg-card px-1.5 py-0.5 capitalize">{s.priority}</span>}
                      {s.suggested_due_date && <span className="rounded-full bg-card px-1.5 py-0.5">{s.suggested_due_date.slice(5)}</span>}
                      <div className="ml-auto flex items-center gap-1">
                        <button onClick={() => accept(t.id)} className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-primary-foreground hover:opacity-90">
                          <Check className="h-3 w-3" /> Apply
                        </button>
                        <button onClick={() => dismiss(t.id)} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-muted-foreground hover:text-foreground">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
      </div>
      {paneOpen && <TaskDetailPane />}
      <UnscheduledTasksRail />
    </div>
  );
}

/* ---------- Mobile Inbox ---------- */
function MobileInbox() {
  const { state } = useStore();
  const [filter, setFilter] = useState<InboxFilter>("all");
  const [tagsOpen, setTagsOpen] = useState(false);
  const { tags } = useTags();

  const base = useMemo(
    () => state.tasks.filter(t => t.inbox && !t.done && !t.parentTaskId && t.status !== "parked"),
    [state.tasks],
  );
  const items = useMemo(() => {
    return base.filter(t => {
      if (filter === "all") return true;
      const d = t.dueDate ? parseISO(t.dueDate) : null;
      if (filter === "today") return d ? isToday(d) : false;
      if (filter === "upcoming") return d ? isFuture(d) && !isToday(d) : false;
      if (filter === "scheduled") return !!d;
      if (filter === "overdue") return d ? (isPast(d) && !isToday(d)) : false;
      return true;
    });
  }, [base, filter]);

  const counts = useMemo(() => ({
    all: base.length,
    today: base.filter(t => t.dueDate && isToday(parseISO(t.dueDate))).length,
    upcoming: base.filter(t => t.dueDate && isFuture(parseISO(t.dueDate)) && !isToday(parseISO(t.dueDate))).length,
    scheduled: base.filter(t => !!t.dueDate).length,
    overdue: base.filter(t => t.dueDate && isPast(parseISO(t.dueDate)) && !isToday(parseISO(t.dueDate))).length,
  }), [base]);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background/85 backdrop-blur px-4 pt-3 pb-3">
        <div className="flex items-center gap-3">
          <h1 className="text-[22px] font-display tracking-tight">Inbox</h1>
        </div>
      </header>

      <div className="px-4 space-y-4">
        {/* Capture */}
        <MobileCaptureCard />

        {/* Filter chips */}
        <MobileFilterChips value={filter} onChange={setFilter} counts={counts} />

        {/* Tag library — collapsed by default */}
        {tags.length > 0 && (
          <section className="cf-card overflow-hidden">
            <button type="button" onClick={() => setTagsOpen(o => !o)} className="flex w-full items-center gap-2 px-4 py-3 text-left">
              <span className="text-[14px] font-medium">Tags</span>
              <span className="text-[12.5px] text-muted-foreground">· {tags.length}</span>
              <ChevronDown className={cn("ml-auto h-4 w-4 transition-transform", tagsOpen && "rotate-180")} />
            </button>
            {tagsOpen && (
              <div className="flex flex-wrap gap-1.5 border-t border-border/60 p-3">
                {tags.map(t => (
                  <Link key={t.id} to={`/tags/${encodeURIComponent(t.name)}`}>
                    <TagChip name={t.name} subtle size="sm" />
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Task list */}
        <div className="space-y-2.5">
          {items.length === 0 ? (
            <div className="cf-card p-8 text-center text-sm text-muted-foreground">Your inbox is clear ✨</div>
          ) : items.map(t => <MobileTaskCard key={t.id} task={t} />)}
        </div>
      </div>
    </div>
  );
}