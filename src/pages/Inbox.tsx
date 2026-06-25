import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { TaskRow } from "@/components/cards/TaskRow";
import {
  Sparkles, Check, RefreshCw, ArrowRight, Pill, Phone, Calendar as CalendarIcon,
  ShoppingCart, FileText, GraduationCap, Cake, Car,
  Home, Users, Heart, BookOpen, Moon, HeartHandshake, Lightbulb, Puzzle,
  Plane, Briefcase, Palette, PawPrint, Leaf, Inbox as InboxIcon, Zap, Tag as TagIcon,
  Mic, Loader2, X, Pencil, ListChecks, UtensilsCrossed, StickyNote, ChevronDown,
  MessageCircle, Flag, Folder, MapPin, CloudSun, Sun, MoreHorizontal,
  MessageSquare, HelpCircle, Sparkles as SparkleIcon, Brush, CreditCard,
  Flame, Search, PenLine,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { useAudioRecorder } from "@/hooks/use-audio-recorder";
import { isToday, isFuture, parseISO, format } from "date-fns";
import { ProcessInboxDialog } from "@/components/inbox/ProcessInboxDialog";
import { VoiceReviewSheet, type DraftTask } from "@/components/inbox/VoiceReviewSheet";
import { TagPicker } from "@/components/tags/TagPicker";
import { TagChip } from "@/components/tags/TagChip";
import { haptics } from "@/lib/haptics";
import { createNote, getOrCreateDailyNote } from "@/lib/notes";
import { personalGreeting, timeOfDayGreeting } from "@/lib/greeting";

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

// Quick Action pills shown beneath the capture textarea. Each pill maps to an
// "Action" label that becomes a tag on the next captured task, and also routes
// the task into a sensible Area.
const QUICK_ACTIONS: { key: string; label: string; icon: any; tint: string; area?: Area }[] = [
  { key: "Call",         label: "Call",        icon: Phone,         tint: "text-sky-600",      area: "Family" },
  { key: "Text / Email", label: "Text / Email",icon: MessageSquare, tint: "text-violet-600",   area: "Family" },
  { key: "Medication",   label: "Medication",  icon: Pill,          tint: "text-rose-600",     area: "Caregiving" },
  { key: "Grocery",      label: "Grocery",     icon: ShoppingCart,  tint: "text-amber-600",    area: "Meals" },
  { key: "Appointment",  label: "Appointment", icon: CalendarIcon,  tint: "text-emerald-600",  area: "Appointments" },
  { key: "Errand",       label: "Errand",      icon: Car,           tint: "text-violet-600",   area: "Personal" },
  { key: "Paperwork",    label: "Paperwork",   icon: FileText,      tint: "text-stone-600",    area: "Personal" },
  { key: "Help",         label: "Help",        icon: HelpCircle,    tint: "text-teal-600" },
  { key: "Cook",         label: "Cook",        icon: UtensilsCrossed, tint: "text-orange-600", area: "Meals" },
  { key: "Clean",        label: "Clean",       icon: Brush,         tint: "text-emerald-600",  area: "Home" },
];

// Lookup for rendering Action column from a task's tags.
const ACTION_BY_KEY: Record<string, { icon: any; tint: string }> = Object.fromEntries(
  QUICK_ACTIONS.map(a => [a.key.toLowerCase(), { icon: a.icon, tint: a.tint }]),
);

// Priority Check-in card metadata.
const PRIORITY_META = [
  { key: "low"     as const, label: "Gentle",  icon: Leaf,  tint: "bg-emerald-50 text-emerald-700 ring-emerald-100" },
  { key: "medium"  as const, label: "Normal",  icon: Sun,   tint: "bg-amber-50 text-amber-700 ring-amber-100" },
  { key: "high"    as const, label: "Focus",   icon: Flame, tint: "bg-rose-50 text-rose-700 ring-rose-100" },
  { key: "someday" as const, label: "Someday", icon: Moon,  tint: "bg-violet-50 text-violet-700 ring-violet-100" },
];

function InboxInner() {
  const { state, addTask, addMeal, updateTask, deleteTask } = useStore() as any;
  const navigate = useNavigate();
  const { paneOpen, clear } = useTaskSelection();
  const [triaging, setTriaging] = useState(false);
  const [suggestions, setSuggestions] = useState<Record<string, Suggestion>>({});
  const [draft, setDraft] = useState("");
  const [activeCategories, setActiveCategories] = useState<string[]>([]);
  const [extraTags, setExtraTags] = useState<string[]>([]);
  const [captureKind, setCaptureKind] = useState<
    "task" | "home" | "care" | "meal" | "note" | "connect" | "commute"
  >("task");
  const [tagsOpen, setTagsOpen] = useState(false);
  const [kindsOpen, setKindsOpen] = useState(false);
  // Auto-detected day part — user can override via the chip below the input.
  const autoDayPart = useMemo<"Morning" | "Afternoon" | "Evening">(() => {
    const h = new Date().getHours();
    return h < 12 ? "Morning" : h < 17 ? "Afternoon" : "Evening";
  }, []);
  const [dayPart, setDayPart] = useState<"Morning" | "Afternoon" | "Evening">(autoDayPart);
  const [overrideArea, setOverrideArea] = useState<Area | "">("");
  const [overridePriority, setOverridePriority] = useState<Priority | "">("");
  const [overrideProjectId, setOverrideProjectId] = useState<string>("");
  const [overrideDue, setOverrideDue] = useState<string>("");
  const [processOpen, setProcessOpen] = useState(false);
  const recorder = useAudioRecorder();
  const [transcribing, setTranscribing] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewDrafts, setReviewDrafts] = useState<DraftTask[]>([]);
  const [reviewTranscript, setReviewTranscript] = useState<string | undefined>(undefined);

  // New redesigned-inbox UI state
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<"all" | Priority | "someday">("all");
  const [sortMode, setSortMode] = useState<"recent" | "priority" | "due">("recent");
  const [moreOptionsOpen, setMoreOptionsOpen] = useState(false);

  // Hold-to-record state
  const [holdActive, setHoldActive] = useState(false);
  const [willCancel, setWillCancel] = useState(false);
  const [holdStartX, setHoldStartX] = useState<number | null>(null);
  const [holdDx, setHoldDx] = useState(0);
  const holdTimerRef = useRef<number | null>(null);
  const tickRef = useRef<number | null>(null);
  const lastTickRef = useRef(0);

  const fmtElapsed = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${String(Math.floor(s / 60)).padStart(1, "0")}:${String(s % 60).padStart(2, "0")}`;
  };

  const startVoice = async () => {
    if (!recorder.supported) {
      toast.error("Voice capture isn't supported in this browser.");
      return;
    }
    await recorder.start();
    // Distinct "armed" cue so the user feels the recording begin.
    haptics.pickup?.() ?? haptics.tap();
    lastTickRef.current = 0;
    if (tickRef.current) window.clearInterval(tickRef.current);
    // Gentle tick every 15s so long recordings feel grounded.
    tickRef.current = window.setInterval(() => {
      const sec = Math.floor((recorder.elapsedMs ?? 0) / 1000);
      if (sec > 0 && sec % 15 === 0 && sec !== lastTickRef.current) {
        lastTickRef.current = sec;
        haptics.swipe?.();
      }
    }, 1000);
  };

  const cancelVoice = () => {
    recorder.cancel();
    haptics.warning?.();
    if (tickRef.current) { window.clearInterval(tickRef.current); tickRef.current = null; }
    toast("Discarded", { description: "Nothing was saved." });
  };

  const finishVoice = async () => {
    const out = await recorder.stop();
    if (!out) return;
    haptics.snap?.() ?? haptics.tap();
    if (tickRef.current) { window.clearInterval(tickRef.current); tickRef.current = null; }
    setTranscribing(true);
    try {
      const { data, error } = await aiInvoke("ai-voice-capture", {
        body: { audioBase64: out.base64, mimeType: out.mimeType },
      });
      if (error) throw error;
      const payload = data as { transcript?: string; summary?: string; tasks?: any[] };
      const tasks = payload?.tasks ?? [];
      if (!payload?.transcript) {
        toast.info("I didn't catch anything — try again.");
        return;
      }
      const initial: DraftTask[] = tasks.length
        ? tasks.map((t) => ({
            title: t.title ?? payload.transcript ?? "",
            area: (t.area as Area) ?? undefined,
            priority: (t.priority as Priority) ?? undefined,
            dueDate: t.dueDate ?? undefined,
            estMinutes: t.estMinutes ?? undefined,
            tags: Array.isArray(t.tags) ? t.tags : undefined,
            notes: t.notes ?? undefined,
            energy: (t.energy as any) ?? undefined,
          }))
        : [{ title: payload.transcript ?? "", notes: payload.summary }];
      setReviewDrafts(initial);
      setReviewTranscript(payload.transcript);
      setReviewOpen(true);
      haptics.success?.();
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't process voice note");
    } finally {
      setTranscribing(false);
    }
  };

  // ── Hold-to-record gesture (touch + mouse) ─────────────────────────────
  const HOLD_DELAY = 180;
  const armHold = (e: React.PointerEvent) => {
    if (transcribing || recorder.state !== "idle") return;
    setHoldStartX(e.clientX);
    setWillCancel(false);
    setHoldDx(0);
    setHoldActive(true);
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    const id = window.setTimeout(() => {
      if (recorder.state === "idle") void startVoice();
    }, HOLD_DELAY);
    holdTimerRef.current = id;
  };
  const moveHold = (e: React.PointerEvent) => {
    if (!holdActive || holdStartX == null) return;
    const dx = e.clientX - holdStartX;
    // Clamp to a comfortable visual range and only track leftward drag.
    const tracked = Math.max(-140, Math.min(0, dx));
    setHoldDx(tracked);
    const next = dx < -70;
    if (next !== willCancel) {
      setWillCancel(next);
      // Soft tick when crossing the cancel threshold either way.
      haptics.swipe?.();
    }
  };
  const releaseHold = async () => {
    if (!holdActive) return;
    setHoldActive(false);
    setHoldDx(0);
    if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null; }
    if (recorder.state === "idle" && !transcribing) {
      toast("Hold the mic to record", { description: "Press and hold, release to send." });
      return;
    }
    if (willCancel) { cancelVoice(); setWillCancel(false); return; }
    await finishVoice();
    setWillCancel(false);
  };

  const items = useMemo(
    () => state.tasks.filter((t: any) => t.inbox && !t.done && !t.parentTaskId && t.status !== "parked"),
    [state.tasks],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") clear(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [clear]);

  useEffect(() => () => {
    if (holdTimerRef.current) window.clearTimeout(holdTimerRef.current);
    if (tickRef.current) window.clearInterval(tickRef.current);
  }, []);

  const parsed = useMemo(() => (draft.trim().length > 2 ? parseTaskInput(draft) : null), [draft]);

  const combinedTags = useMemo(() => {
    const lower = new Set<string>();
    activeCategories.forEach((c) => lower.add(c.toLowerCase()));
    extraTags.forEach((t) => lower.add(t.toLowerCase()));
    return Array.from(lower);
  }, [activeCategories, extraTags]);

  const submitCapture = async (overrideArea?: Area) => {
    const raw = draft.trim();
    if (!raw) return;
    // When kind is not "task", route into today's schedule instead of inbox.
    if (captureKind !== "task") {
      const today = format(new Date(), "yyyy-MM-dd");
      const h = new Date().getHours();
      const mealSlot = h < 12 ? "Breakfast" : h < 17 ? "Lunch" : "Dinner";
      if (captureKind === "home") {
        await addTask({ title: raw, dueDate: today, dayPart, area: "Home" });
        toast.success(`Added home task → ${dayPart}`);
      } else if (captureKind === "care") {
        await addTask({ title: raw, dueDate: today, dayPart, area: "Caregiving" });
        toast.success(`Added care task → ${dayPart}`);
      } else if (captureKind === "connect") {
        await addTask({ title: raw, dueDate: today, dayPart, area: "Family" });
        toast.success(`Added connect → ${dayPart}`);
      } else if (captureKind === "commute") {
        await addTask({ title: raw, dueDate: today, dayPart, area: "Personal" });
        toast.success(`Added commute → ${dayPart}`);
      } else if (captureKind === "meal") {
        await addMeal({ name: raw, date: today, slot: mealSlot });
        toast.success(`Added ${mealSlot} → ${raw}`);
      } else if (captureKind === "note") {
        try {
          const n = await createNote({ title: raw });
          setDraft("");
          toast.success("Note created");
          navigate(`/notes/${n.id}`);
          return;
        } catch {
          toast.error("Couldn't create note");
          return;
        }
      }
      setDraft("");
      return;
    }
    const p = parseTaskInput(raw);
    const mergedTags = Array.from(new Set([...(p.tags ?? []), ...combinedTags]));
    // If a Quick Action is selected, prefix it as a tag and infer an area.
    const actionMeta = activeAction
      ? QUICK_ACTIONS.find(a => a.key === activeAction)
      : null;
    if (actionMeta && !mergedTags.some(t => t.toLowerCase() === actionMeta.key.toLowerCase())) {
      mergedTags.push(actionMeta.key);
    }
    await addTask({
      title: p.title || raw,
      dueDate: overrideDue || p.dueDate,
      area: (overrideArea || (p.area as Area) || actionMeta?.area || (activeCategories[0] as Area | undefined)) as Area | undefined,
      priority: (overridePriority || undefined) as Priority | undefined,
      projectId: overrideProjectId || undefined,
      dayPart,
      energy: p.energy,
      tags: mergedTags.length ? mergedTags : undefined,
      estMinutes: p.estMinutes,
      inbox: true,
    });
    setDraft("");
    setExtraTags([]);
    setOverrideDue("");
    setActiveAction(null);
    toast.success("Caught it ✨", { description: "Safely held in your inbox." });
  };

  const openReviewForDraft = () => {
    const raw = draft.trim();
    const p = raw ? parseTaskInput(raw) : null;
    const tags = Array.from(new Set([...(p?.tags ?? []), ...combinedTags]));
    setReviewDrafts([{
      title: p?.title || raw || "",
      dueDate: p?.dueDate,
      area: (p?.area as Area) ?? (activeCategories[0] as Area | undefined),
      energy: p?.energy as any,
      tags: tags.length ? tags : undefined,
      estMinutes: p?.estMinutes,
    }]);
    setReviewTranscript(undefined);
    setReviewOpen(true);
  };

  const quickAdd = (title: string, area: Area) => {
    setReviewDrafts([{ title, area, tags: combinedTags.length ? combinedTags : undefined }]);
    setReviewTranscript(undefined);
    setReviewOpen(true);
  };

  const saveReviewDrafts = async (drafts: DraftTask[]) => {
    for (const d of drafts) {
      await addTask({
        title: d.title,
        area: d.area,
        priority: d.priority ?? "medium",
        dueDate: d.dueDate,
        energy: d.energy,
        estMinutes: d.estMinutes,
        tags: d.tags?.length ? d.tags : undefined,
        notes: d.notes,
        inbox: true,
      });
    }
    setDraft("");
    setExtraTags([]);
    toast.success(`Saved ${drafts.length} ${drafts.length === 1 ? "item" : "items"} ✨`, { description: "Held gently in your inbox." });
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

  // Priority counts for the right-rail Check-in card.
  const priorityCounts = useMemo(() => {
    const counts: Record<"low" | "medium" | "high" | "someday", number> = {
      low: 0, medium: 0, high: 0, someday: 0,
    };
    for (const t of items as any[]) {
      if (!t.dueDate && (!t.priority || t.priority === "low")) counts.someday += 1;
      const p = (t.priority ?? "medium") as Priority;
      counts[p] += 1;
    }
    return counts;
  }, [items]);

  // Tasks scheduled today (excluding inbox).
  const scheduledToday = useMemo(() => {
    return (state.tasks as any[]).filter(t =>
      !t.inbox && !t.done && t.dueDate && isToday(parseISO(t.dueDate))
    ).length;
  }, [state.tasks]);

  // Filter inbox items by selected priority chip.
  const filteredItems = useMemo(() => {
    let list = items as any[];
    if (priorityFilter === "someday") {
      list = list.filter(t => !t.dueDate);
    } else if (priorityFilter !== "all") {
      list = list.filter(t => (t.priority ?? "medium") === priorityFilter);
    }
    if (sortMode === "priority") {
      const rank: Record<string, number> = { high: 0, medium: 1, low: 2 };
      list = [...list].sort((a, b) => (rank[a.priority ?? "medium"] ?? 3) - (rank[b.priority ?? "medium"] ?? 3));
    } else if (sortMode === "due") {
      list = [...list].sort((a, b) => (a.dueDate ?? "z").localeCompare(b.dueDate ?? "z"));
    }
    return list;
  }, [items, priorityFilter, sortMode]);

  // One light "Suggested for you" card derived from oldest inbox item.
  const suggested = useMemo(() => {
    const candidate = (items as any[])[0];
    if (!candidate) return null;
    return candidate;
  }, [items]);

  const greeting = personalGreeting(state.settings?.name).replace(/\.$/, "");

  // Helpers for rendering rows.
  const friendlyDate = (iso?: string | null): { label: string; tone: string } => {
    if (!iso) return { label: "Someday", tone: "text-muted-foreground" };
    const d = parseISO(iso);
    if (isToday(d)) return { label: "Today", tone: "text-foreground" };
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    if (d.toDateString() === tomorrow.toDateString()) return { label: "Tomorrow", tone: "text-foreground" };
    const diffDays = Math.round((d.getTime() - Date.now()) / 86400000);
    if (diffDays > 0 && diffDays <= 7) return { label: "This week", tone: "text-foreground" };
    if (diffDays > 7 && diffDays <= 14) return { label: "Next week", tone: "text-foreground" };
    return { label: format(d, "MMM d"), tone: "text-foreground" };
  };

  const actionFor = (task: any) => {
    if (!Array.isArray(task.tags)) return null;
    for (const t of task.tags as string[]) {
      const hit = ACTION_BY_KEY[String(t).toLowerCase()];
      if (hit) return { label: t, ...hit };
    }
    return null;
  };

  const priorityFor = (task: any) => {
    if (!task.dueDate && (!task.priority || task.priority === "low")) {
      return PRIORITY_META.find(p => p.key === "someday")!;
    }
    const p = (task.priority ?? "medium") as Priority;
    return PRIORITY_META.find(m => m.key === p)!;
  };

  const completeTask = (id: string) => updateTask(id, { done: true });
  const scheduleTask = (id: string) => {
    const today = format(new Date(), "yyyy-MM-dd");
    updateTask(id, { dueDate: today, inbox: false, status: "active" });
    toast.success("Scheduled for today");
  };

  return (
    <div className="relative min-h-screen bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,hsl(var(--primary)/0.05),transparent_70%)]">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-10">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8">

          {/* ════════════════ MAIN COLUMN ════════════════ */}
          <div className="space-y-6">

            {/* ───── 1. Capture Card ───── */}
            <section className="rounded-3xl border border-border/40 bg-card/80 p-5 shadow-[0_20px_50px_-30px_hsl(var(--primary)/0.35)] backdrop-blur-md md:p-7">
              <div className="mb-4 flex items-start gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="font-display text-xl tracking-tight md:text-2xl">Capture something</h2>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Get it out of your head. We'll help with the rest.
                  </p>
                </div>
              </div>

              {transcribing ? (
                <div className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-4 shadow-inner">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <div className="leading-tight">
                    <div className="text-sm font-medium">Organizing your thoughts…</div>
                    <div className="text-[12px] text-muted-foreground">Hold on a moment.</div>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <Textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        void submitCapture();
                      }
                    }}
                    placeholder={
                      recorder.state === "recording"
                        ? (willCancel ? "Release to cancel…" : `Listening · ${fmtElapsed(recorder.elapsedMs)}`)
                        : "What's on your mind?"
                    }
                    rows={4}
                    disabled={recorder.state !== "idle"}
                    className={cn(
                      "min-h-[120px] resize-none rounded-2xl border-border/40 bg-background/70 px-4 py-3.5 pr-4 pb-14 text-[15px] leading-relaxed shadow-inner placeholder:text-muted-foreground/70 focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/15",
                      recorder.state === "recording" && "border-rose-300/70 bg-rose-50/40",
                    )}
                  />

                  {/* Bottom action row inside the textarea */}
                  <div className="pointer-events-none absolute inset-x-3 bottom-3 flex items-center justify-between">
                    <div className="pointer-events-auto flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
                      {activeAction && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11.5px] font-medium text-primary">
                          <Check className="h-3 w-3" /> {activeAction}
                          <button
                            type="button"
                            onClick={() => setActiveAction(null)}
                            className="ml-0.5 opacity-70 hover:opacity-100"
                            aria-label="Clear action"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      )}
                    </div>
                    <div className="pointer-events-auto flex items-center gap-1.5">
                      {recorder.supported && (
                        <button
                          type="button"
                          onPointerDown={armHold}
                          onPointerMove={moveHold}
                          onPointerUp={() => void releaseHold()}
                          onPointerCancel={() => void releaseHold()}
                          onPointerLeave={(e) => { if (holdActive && e.buttons === 0) void releaseHold(); }}
                          onContextMenu={(e) => e.preventDefault()}
                          aria-label="Hold to record"
                          style={{
                            touchAction: "none",
                            transform: holdActive
                              ? `translateX(${holdDx}px) scale(${willCancel ? 0.95 : 1.08})`
                              : undefined,
                            transition: "transform 220ms cubic-bezier(0.22, 1, 0.36, 1)",
                          }}
                          className={cn(
                            "relative grid h-10 w-10 place-items-center rounded-xl ring-1 select-none transition",
                            recorder.state === "recording"
                              ? willCancel
                                ? "bg-stone-200 text-stone-600 ring-stone-300"
                                : "bg-rose-500 text-white ring-rose-400 shadow-[0_0_0_8px_hsl(0_84%_60%/0.14)]"
                              : "bg-muted/60 text-muted-foreground ring-border/40 hover:bg-muted",
                          )}
                        >
                          {recorder.state === "recording" && !willCancel && (
                            <span
                              className="pointer-events-none absolute -inset-1 rounded-2xl bg-rose-400/20 motion-reduce:hidden"
                              style={{ animation: "careflow-breath 2.4s ease-in-out infinite" }}
                            />
                          )}
                          {recorder.state === "recording" && willCancel
                            ? <X className="relative h-4 w-4" />
                            : <Mic className="relative h-4 w-4" />}
                        </button>
                      )}
                      <Button
                        onClick={() => void submitCapture()}
                        disabled={!draft.trim() || recorder.state !== "idle"}
                        size="sm"
                        className="h-10 gap-1.5 rounded-xl bg-primary px-3.5 text-[13px] font-medium shadow-sm hover:shadow-md"
                      >
                        <span className="text-base leading-none">＋</span> Add
                      </Button>
                    </div>
                  </div>

                  {recorder.state === "recording" && (
                    <div className="mt-2 flex items-center justify-between gap-2 px-1 text-[11.5px] text-muted-foreground animate-fade-in">
                      <div className="inline-flex items-center gap-2">
                        <span
                          className="inline-flex h-2 w-2 rounded-full bg-rose-500 motion-reduce:animate-none"
                          style={{ animation: "careflow-breath 2.4s ease-in-out infinite" }}
                        />
                        <span className="tabular-nums">{fmtElapsed(recorder.elapsedMs)}</span>
                      </div>
                      <div className={cn("transition-colors duration-200", willCancel && "font-medium text-rose-600")}>
                        {willCancel ? "Release to cancel" : "← Slide to cancel"}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ───── 2. Quick Actions ───── */}
              <div className="mt-5">
                <div className="mb-2 text-[12px] font-medium text-foreground/70">Quick Actions</div>
                <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:flex-wrap md:overflow-visible">
                  {QUICK_ACTIONS.map(qa => {
                    const Icon = qa.icon;
                    const active = activeAction === qa.key;
                    return (
                      <button
                        key={qa.key}
                        type="button"
                        onClick={() => setActiveAction(active ? null : qa.key)}
                        aria-pressed={active}
                        className={cn(
                          "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-border/50 bg-background/80 px-3 text-[12.5px] font-medium text-foreground/85 transition-all hover:-translate-y-0.5 hover:border-border hover:shadow-sm",
                          active && "border-primary/40 bg-primary/10 text-primary ring-1 ring-primary/30",
                        )}
                      >
                        <Icon className={cn("h-3.5 w-3.5", active ? "text-primary" : qa.tint)} />
                        {qa.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ───── 3. AI Helper Message ───── */}
              <div className="mt-4 flex items-center justify-center gap-1.5 text-[12px] text-muted-foreground">
                <Sparkles className="h-3 w-3 text-primary" />
                <span>I'll suggest details after you add it.</span>
              </div>

              {/* Collapsible: kind, dayPart, pickers, tags */}
              <div className="mt-4 border-t border-border/40 pt-3">
                <button
                  type="button"
                  onClick={() => setMoreOptionsOpen(o => !o)}
                  className="flex w-full items-center justify-between gap-2 text-[12px] text-muted-foreground transition hover:text-foreground"
                  aria-expanded={moreOptionsOpen}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <MoreHorizontal className="h-3.5 w-3.5" />
                    More options
                    {(activeCategories.length + extraTags.length + (overrideArea ? 1 : 0) + (overridePriority ? 1 : 0) + (overrideDue ? 1 : 0)) > 0 && (
                      <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10.5px] font-medium text-primary">
                        {activeCategories.length + extraTags.length + (overrideArea ? 1 : 0) + (overridePriority ? 1 : 0) + (overrideDue ? 1 : 0)}
                      </span>
                    )}
                  </span>
                  <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", moreOptionsOpen && "rotate-180")} />
                </button>

                {moreOptionsOpen && (
                  <div className="mt-3 space-y-3 animate-fade-in">
                    {/* Kind chips */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <div className="inline-flex flex-wrap items-center gap-0.5 rounded-full border border-border/60 bg-background/60 p-0.5 text-[11px]">
                        {[
                          { k: "task",    Icon: ListChecks,     label: "Task" },
                          { k: "home",    Icon: Home,           label: "Home" },
                          { k: "care",    Icon: HeartHandshake, label: "Care" },
                          { k: "meal",    Icon: UtensilsCrossed,label: "Meal" },
                          { k: "note",    Icon: StickyNote,     label: "Note" },
                          { k: "connect", Icon: MessageCircle,  label: "Connect" },
                          { k: "commute", Icon: Car,            label: "Commute" },
                        ].map(({ k, Icon, label }) => (
                          <button
                            key={k}
                            type="button"
                            onClick={() => setCaptureKind(k as any)}
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 transition-colors",
                              captureKind === k ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground",
                            )}
                          >
                            <Icon className="h-3 w-3" />
                            {label}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const iso = format(new Date(), "yyyy-MM-dd");
                            const n = await getOrCreateDailyNote(iso);
                            navigate(`/notes/${n.id}`);
                          } catch { toast.error("Couldn't open today's note"); }
                        }}
                        className="ml-auto inline-flex items-center gap-1 rounded-full border border-border/60 bg-card/60 px-2 py-0.5 text-[11px] text-muted-foreground transition hover:text-foreground"
                      >
                        <FileText className="h-3 w-3" />
                        Today's note
                      </button>
                    </div>

                    {/* Day part + inline pickers */}
                    <div className="flex flex-wrap items-center gap-1.5 text-[11.5px]">
                      <div className="inline-flex items-center gap-0.5 rounded-full border border-border/60 bg-background/60 p-0.5">
                        {([
                          { v: "Morning",   Icon: Sun },
                          { v: "Afternoon", Icon: CloudSun },
                          { v: "Evening",   Icon: Moon },
                        ] as const).map(({ v, Icon }) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setDayPart(v)}
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 transition-colors",
                              dayPart === v ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground",
                            )}
                          >
                            <Icon className="h-3 w-3" /> {v}
                          </button>
                        ))}
                      </div>
                      <PickerLabel icon={CalendarIcon}>
                        <input
                          type="date"
                          value={overrideDue}
                          onChange={(e) => setOverrideDue(e.target.value)}
                          className="bg-transparent text-[11.5px] outline-none"
                        />
                      </PickerLabel>
                      <PickerLabel icon={Flag}>
                        <select
                          value={overridePriority}
                          onChange={(e) => setOverridePriority(e.target.value as Priority | "")}
                          className="bg-transparent text-[11.5px] capitalize outline-none"
                        >
                          <option value="">Priority</option>
                          {(["low","medium","high"] as Priority[]).map(p => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      </PickerLabel>
                      <PickerLabel icon={MapPin}>
                        <select
                          value={overrideArea}
                          onChange={(e) => setOverrideArea(e.target.value as Area | "")}
                          className="bg-transparent text-[11.5px] outline-none"
                        >
                          <option value="">Area</option>
                          {(["Family","Kids","Caregiving","Home","Meals","Appointments","Holidays & Birthdays","Personal","Creative Projects","Money"] as Area[]).map(a => (
                            <option key={a} value={a}>{a}</option>
                          ))}
                        </select>
                      </PickerLabel>
                      {(state.projects ?? []).length > 0 && (
                        <PickerLabel icon={Folder}>
                          <select
                            value={overrideProjectId}
                            onChange={(e) => setOverrideProjectId(e.target.value)}
                            className="bg-transparent text-[11.5px] outline-none max-w-[10rem] truncate"
                          >
                            <option value="">Project</option>
                            {(state.projects ?? []).slice(0, 50).map((p: any) => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        </PickerLabel>
                      )}
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap items-center gap-2">
                      {combinedTags.map((t) => {
                        const isCat = activeCategories.some((c) => c.toLowerCase() === t);
                        return (
                          <TagChip
                            key={t}
                            name={t}
                            size="xs"
                            onRemove={() => {
                              if (isCat) setActiveCategories((cs) => cs.filter((c) => c.toLowerCase() !== t));
                              else setExtraTags((ts) => ts.filter((x) => x !== t));
                            }}
                          />
                        );
                      })}
                      <TagPicker
                        value={extraTags}
                        onChange={setExtraTags}
                        inline={false}
                        triggerLabel="Add tag"
                        triggerClassName="shrink-0 min-h-[28px] rounded-full px-2.5 text-[11.5px]"
                      />
                      <Link to="/tags" className="text-[11px] text-muted-foreground underline-offset-2 hover:underline">
                        Manage
                      </Link>
                    </div>

                    {/* NLP parsed suggestions */}
                    {parsed && (parsed.dueDate || parsed.area || parsed.energy || parsed.tags?.length) ? (
                      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-primary/20 bg-primary/[0.04] px-3 py-2 text-[12px] animate-fade-in">
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
                            <Zap className="h-3 w-3" /> {parsed.energy}
                          </span>
                        )}
                        {parsed.tags?.map(t => (
                          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-card px-2 py-0.5 ring-1 ring-border/60">
                            <TagIcon className="h-3 w-3" /> {t}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </section>

            {/* ───── 4. Held in your Inbox ───── */}
            <section className="rounded-3xl border border-border/40 bg-card/70 p-5 backdrop-blur-md md:p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="font-display text-lg tracking-tight md:text-xl">
                    Held in your inbox
                    <span className="ml-2 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-muted px-2 text-[12px] font-medium text-muted-foreground">
                      {items.length}
                    </span>
                  </h3>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={triaging || items.length === 0}
                    onClick={() => setProcessOpen(true)}
                    className="h-8 gap-1.5 rounded-full border-primary/30 bg-primary/5 px-3 text-[12px] text-primary hover:bg-primary/10"
                  >
                    {triaging ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    Organize this for me
                  </Button>
                </div>
                <Select value={sortMode} onValueChange={(v) => setSortMode(v as any)}>
                  <SelectTrigger className="h-8 w-[180px] rounded-full border-border/50 bg-background/60 text-[12px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Sort: Recently added</SelectItem>
                    <SelectItem value="priority">Sort: Priority</SelectItem>
                    <SelectItem value="due">Sort: Due date</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {items.length === 0 ? (
                <div className="grid place-items-center gap-2 rounded-2xl border border-dashed border-border/60 bg-background/40 px-4 py-10 text-center">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                    <InboxIcon className="h-5 w-5" />
                  </div>
                  <p className="font-display text-base tracking-tight">Your mind is clear</p>
                  <p className="text-[12.5px] text-muted-foreground">Nothing is waiting in your inbox.</p>
                </div>
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="hidden md:block">
                    <div className="grid grid-cols-[28px_minmax(0,1fr)_160px_140px_120px_36px] gap-3 border-b border-border/50 px-3 pb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      <span aria-hidden />
                      <span>Task</span>
                      <span>Action</span>
                      <span>Date</span>
                      <span>Priority</span>
                      <span aria-hidden />
                    </div>
                    <ul className="divide-y divide-border/40">
                      {filteredItems.map((t: any) => {
                        const action = actionFor(t);
                        const d = friendlyDate(t.dueDate);
                        const prio = priorityFor(t);
                        const PrioIcon = prio.icon;
                        const ActionIcon = action?.icon;
                        return (
                          <li
                            key={t.id}
                            tabIndex={0}
                            onClick={() => navigate(`/tasks/${t.id}`)}
                            onKeyDown={(e) => { if (e.key === "Enter") navigate(`/tasks/${t.id}`); }}
                            className="group grid cursor-pointer grid-cols-[28px_minmax(0,1fr)_160px_140px_120px_36px] items-center gap-3 rounded-xl px-3 py-3.5 transition-all hover:-translate-y-px hover:bg-muted/40 hover:shadow-sm"
                          >
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); void completeTask(t.id); }}
                              aria-label="Mark complete"
                              className="grid h-5 w-5 place-items-center rounded-full border border-border/70 text-transparent transition hover:border-primary hover:text-primary"
                            >
                              <Check className="h-3 w-3" />
                            </button>
                            <div className="min-w-0">
                              <div className="truncate text-[14px] font-medium text-foreground">{t.title}</div>
                              {(t.area || (Array.isArray(t.tags) && t.tags.length > 0)) && (
                                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                  {t.area && (
                                    <span className="inline-flex items-center rounded-full bg-muted/60 px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground">
                                      {t.area}
                                    </span>
                                  )}
                                  {(t.tags ?? []).slice(0, 3).map((tg: string) => (
                                    <span key={tg} className="inline-flex items-center rounded-full bg-primary/5 px-2 py-0.5 text-[10.5px] font-medium text-primary/80">
                                      {tg}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="text-[13px] text-foreground/85">
                              {action && ActionIcon ? (
                                <span className="inline-flex items-center gap-1.5">
                                  <ActionIcon className={cn("h-3.5 w-3.5", action.tint)} />
                                  {action.label}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </div>
                            <div className={cn("inline-flex items-center gap-1.5 text-[13px]", d.tone)}>
                              <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" /> {d.label}
                            </div>
                            <div className="inline-flex items-center gap-1.5 text-[13px] text-foreground/85">
                              <PrioIcon className="h-3.5 w-3.5 text-muted-foreground" /> {prio.label}
                            </div>
                            <button
                              type="button"
                              aria-label="More"
                              onClick={(e) => { e.stopPropagation(); navigate(`/tasks/${t.id}`); }}
                              className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:bg-muted"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  {/* Mobile cards with swipe */}
                  <ul className="space-y-2 md:hidden">
                    {filteredItems.map((t: any) => (
                      <InboxTaskCard
                        key={t.id}
                        task={t}
                        action={actionFor(t)}
                        date={friendlyDate(t.dueDate)}
                        priority={priorityFor(t)}
                        onOpen={() => navigate(`/tasks/${t.id}`)}
                        onComplete={() => completeTask(t.id)}
                        onSchedule={() => scheduleTask(t.id)}
                        onOrganize={() => setProcessOpen(true)}
                      />
                    ))}
                  </ul>
                </>
              )}
            </section>
          </div>

          {/* ════════════════ RIGHT RAIL ════════════════ */}
          <aside className="space-y-4">

            {/* ───── 5. Daily Rhythm ───── */}
            <section className="rounded-3xl border border-border/40 bg-card/70 p-5 backdrop-blur-md">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h3 className="font-display text-base tracking-tight">{greeting}</h3>
              </div>
              <p className="mb-3 text-[12px] font-medium text-muted-foreground">Here's your rhythm</p>
              <div className="space-y-2.5">
                <RhythmRow icon={CalendarIcon} tint="text-emerald-600 bg-emerald-50" value={scheduledToday} label="Tasks scheduled" />
                <RhythmRow icon={Lightbulb} tint="text-amber-600 bg-amber-50" value={stats.quickWins} label="Ideas captured" />
                <RhythmRow icon={InboxIcon} tint="text-primary bg-primary/10" value={stats.total} label="Inbox items" />
              </div>
            </section>

            {/* ───── 6. Suggested for you ───── */}
            {suggested && (
              <section className="rounded-3xl border border-border/40 bg-card/70 p-5 backdrop-blur-md">
                <div className="mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h3 className="font-display text-base tracking-tight">Suggested for you</h3>
                </div>
                <div className="rounded-2xl border border-border/40 bg-background/60 p-3">
                  <p className="text-[14px] font-medium leading-snug">{suggested.title}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {(suggested.tags ?? []).slice(0, 3).map((tg: string) => (
                      <span key={tg} className="inline-flex items-center rounded-full bg-primary/8 px-2 py-0.5 text-[10.5px] font-medium text-primary/90">
                        {tg}
                      </span>
                    ))}
                    {suggested.area && (
                      <span className="inline-flex items-center rounded-full bg-muted/60 px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground">
                        {suggested.area}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-[12px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <CalendarIcon className="h-3 w-3" /> {friendlyDate(suggested.dueDate).label}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      {(() => { const P = priorityFor(suggested).icon; return <P className="h-3 w-3" />; })()}
                      {priorityFor(suggested).label}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => updateTask(suggested.id, { inbox: false, status: "active" })}
                      className="h-8 flex-1 rounded-full text-[12px]"
                    >
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/tasks/${suggested.id}`)}
                      className="h-8 flex-1 rounded-full text-[12px]"
                    >
                      Edit
                    </Button>
                  </div>
                </div>
              </section>
            )}

            {/* ───── 7. Priority Check-in ───── */}
            <section className="rounded-3xl border border-border/40 bg-card/70 p-5 backdrop-blur-md">
              <div className="mb-1 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h3 className="font-display text-base tracking-tight">Priority Check-in</h3>
              </div>
              <p className="mb-3 text-[12px] text-muted-foreground">How's your workload right now?</p>
              <div className="grid grid-cols-2 gap-2">
                {PRIORITY_META.map(p => {
                  const Icon = p.icon;
                  const count = priorityCounts[p.key];
                  const active = priorityFilter === p.key;
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => setPriorityFilter(active ? "all" : p.key)}
                      aria-pressed={active}
                      className={cn(
                        "flex flex-col items-start gap-1.5 rounded-2xl border border-border/40 bg-background/70 p-3 text-left ring-1 ring-transparent transition-all hover:-translate-y-0.5 hover:shadow-sm",
                        active && "ring-primary/40 shadow-sm",
                      )}
                    >
                      <span className={cn("inline-grid h-7 w-7 place-items-center rounded-xl", p.tint)}>
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <span className="text-[12px] font-medium text-foreground">{p.label}</span>
                      <span className="font-display text-xl tracking-tight">{count}</span>
                      <span className="text-[10.5px] text-muted-foreground">tasks</span>
                    </button>
                  );
                })}
              </div>
              {priorityFilter !== "all" && (
                <button
                  type="button"
                  onClick={() => setPriorityFilter("all")}
                  className="mt-3 inline-flex items-center gap-1 text-[11.5px] text-muted-foreground underline-offset-2 hover:underline"
                >
                  Clear filter
                </button>
              )}
            </section>

            {/* ───── 8. Let AI help you ───── */}
            <section className="overflow-hidden rounded-3xl border border-border/40 bg-gradient-to-br from-primary/10 via-card to-card p-5 shadow-sm backdrop-blur-md">
              <div className="mb-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h3 className="font-display text-base tracking-tight">Let AI help you</h3>
              </div>
              <p className="mb-3 text-[12.5px] leading-relaxed text-muted-foreground">
                I can organize, schedule, and break things down.
              </p>
              <Button
                onClick={() => navigate("/carey")}
                className="h-10 w-full rounded-full bg-primary text-[13px] font-medium shadow-sm hover:shadow-md"
              >
                <MessageCircle className="mr-1.5 h-3.5 w-3.5" /> Ask CareFlow
              </Button>
            </section>
          </aside>
        </div>
      </div>

      {paneOpen && <TaskDetailPane />}
      <UnscheduledTasksRail />
      <ProcessInboxDialog
        open={processOpen}
        onOpenChange={setProcessOpen}
        items={items}
        updateTask={updateTask}
        deleteTask={deleteTask}
      />
      <VoiceReviewSheet
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        initialDrafts={reviewDrafts}
        transcript={reviewTranscript}
        onSave={saveReviewDrafts}
        onSaveAndProcess={async (d) => { await saveReviewDrafts(d); setProcessOpen(true); }}
      />
    </div>
  );
}

function RhythmRow({ icon: Icon, tint, value, label }: { icon: any; tint: string; value: number; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className={cn("inline-grid h-9 w-9 place-items-center rounded-2xl", tint)}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="flex flex-1 items-baseline justify-between gap-2">
        <span className="font-display text-xl tracking-tight tabular-nums">{value}</span>
        <span className="text-[12.5px] text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}

function InboxTaskCard({
  task, action, date, priority, onOpen, onComplete, onSchedule, onOrganize,
}: {
  task: any;
  action: { label: string; icon: any; tint: string } | null;
  date: { label: string; tone: string };
  priority: { label: string; icon: any; tint: string };
  onOpen: () => void;
  onComplete: () => void;
  onSchedule: () => void;
  onOrganize: () => void;
}) {
  const [dx, setDx] = useState(0);
  const startRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const longPressRef = useRef<number | null>(null);
  const movedRef = useRef(false);

  const reset = () => setDx(0);
  const onPointerDown = (e: React.PointerEvent) => {
    startRef.current = { x: e.clientX, y: e.clientY, t: Date.now() };
    movedRef.current = false;
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    longPressRef.current = window.setTimeout(() => {
      if (!movedRef.current) { haptics.pickup?.() ?? haptics.tap(); onOrganize(); }
    }, 600);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!startRef.current) return;
    const ddx = e.clientX - startRef.current.x;
    const ddy = e.clientY - startRef.current.y;
    if (Math.abs(ddx) > 8 || Math.abs(ddy) > 8) movedRef.current = true;
    if (Math.abs(ddx) > Math.abs(ddy)) {
      setDx(Math.max(-140, Math.min(140, ddx)));
    }
  };
  const onPointerUp = () => {
    if (longPressRef.current) { clearTimeout(longPressRef.current); longPressRef.current = null; }
    const final = dx;
    if (final > 80) { haptics.success?.(); onComplete(); }
    else if (final < -80) { haptics.swipe?.(); onSchedule(); }
    else if (!movedRef.current && startRef.current && Date.now() - startRef.current.t < 250) {
      onOpen();
    }
    reset();
    startRef.current = null;
  };

  const PrioIcon = priority.icon;
  const ActionIcon = action?.icon;

  return (
    <li className="relative overflow-hidden rounded-2xl">
      {/* Swipe backgrounds */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-between px-4 text-[12px] font-medium">
        <span className={cn("inline-flex items-center gap-1.5 text-emerald-700 transition-opacity", dx > 20 ? "opacity-100" : "opacity-0")}>
          <Check className="h-4 w-4" /> Complete
        </span>
        <span className={cn("inline-flex items-center gap-1.5 text-primary transition-opacity", dx < -20 ? "opacity-100" : "opacity-0")}>
          <CalendarIcon className="h-4 w-4" /> Schedule
        </span>
      </div>
      <div
        role="button"
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => { if (longPressRef.current) clearTimeout(longPressRef.current); reset(); startRef.current = null; }}
        onKeyDown={(e) => { if (e.key === "Enter") onOpen(); }}
        style={{ transform: `translateX(${dx}px)`, transition: dx === 0 ? "transform 220ms cubic-bezier(0.22, 1, 0.36, 1)" : undefined, touchAction: "pan-y" }}
        className="flex select-none items-start gap-3 rounded-2xl border border-border/40 bg-card/95 p-3.5 shadow-sm"
      >
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onComplete(); }}
          aria-label="Mark complete"
          className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-border/70 text-transparent transition hover:border-primary hover:text-primary"
        >
          <Check className="h-3 w-3" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-medium leading-snug text-foreground">{task.title}</div>
          {(task.area || (Array.isArray(task.tags) && task.tags.length > 0)) && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {task.area && (
                <span className="inline-flex items-center rounded-full bg-muted/60 px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground">
                  {task.area}
                </span>
              )}
              {(task.tags ?? []).slice(0, 2).map((tg: string) => (
                <span key={tg} className="inline-flex items-center rounded-full bg-primary/8 px-2 py-0.5 text-[10.5px] font-medium text-primary/90">
                  {tg}
                </span>
              ))}
            </div>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-muted-foreground">
            {action && ActionIcon && (
              <span className="inline-flex items-center gap-1">
                <ActionIcon className={cn("h-3 w-3", action.tint)} /> {action.label}
              </span>
            )}
            <span className={cn("inline-flex items-center gap-1", date.tone)}>
              <CalendarIcon className="h-3 w-3" /> {date.label}
            </span>
            <span className="inline-flex items-center gap-1">
              <PrioIcon className="h-3 w-3" /> {priority.label}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onOpen(); }}
          aria-label="More"
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>
    </li>
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

function PickerLabel({ icon: Icon, children }: { icon: any; children: React.ReactNode }) {
  return (
    <label className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/60 px-2 py-0.5 text-muted-foreground hover:text-foreground">
      <Icon className="h-3 w-3" />
      {children}
    </label>
  );
}
