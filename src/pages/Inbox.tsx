import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { TaskRow } from "@/components/cards/TaskRow";
import {
  Sparkles, Check, RefreshCw, ArrowRight, Pill, Phone, Calendar as CalendarIcon,
  ShoppingCart, FileText, GraduationCap, Cake, Car,
  Home, Users, Heart, BookOpen, Moon, HeartHandshake, Lightbulb, Puzzle,
  Plane, Briefcase, Palette, PawPrint, Leaf, Inbox as InboxIcon, Zap, Tag as TagIcon,
  Mic, Loader2, X, Pencil, ListChecks, UtensilsCrossed, StickyNote, ChevronDown,
  MessageCircle, Flag, Folder, MapPin, CheckSquare, Plus, Wand2,
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
import { useAudioRecorder } from "@/hooks/use-audio-recorder";
import { isToday, isFuture, parseISO, format } from "date-fns";
import basketImg from "@/assets/inbox-basket.png";
import { ProcessInboxDialog } from "@/components/inbox/ProcessInboxDialog";
import { VoiceReviewSheet, type DraftTask } from "@/components/inbox/VoiceReviewSheet";
import { TagPicker } from "@/components/tags/TagPicker";
import { TagChip } from "@/components/tags/TagChip";
import { haptics } from "@/lib/haptics";
import { createNote, getOrCreateDailyNote } from "@/lib/notes";
import { openTaskEditor } from "@/lib/open-task-editor";
import { NlpHighlightedInput } from "@/components/inbox/NlpHighlightedInput";
import { WhenPopover, type DayPart } from "@/components/inbox/WhenPopover";
import { InboxSortableRow } from "@/components/inbox/InboxSortableRow";
import {
  DndContext, PointerSensor, TouchSensor, KeyboardSensor, useSensor, useSensors,
  closestCenter, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy,
} from "@dnd-kit/sortable";

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
    await addTask({
      title: p.title || raw,
      dueDate: overrideDue || p.dueDate,
      area: (overrideArea || (p.area as Area) || (activeCategories[0] as Area | undefined)) as Area | undefined,
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
                  className="h-32 w-32 select-none object-contain transition-transform duration-700 hover:-translate-y-1 sm:h-40 sm:w-40 md:h-48 md:w-48"
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
        <section className="rounded-[24px] border border-border/50 bg-card/70 p-4 shadow-[0_10px_40px_-25px_hsl(var(--primary)/0.4)] backdrop-blur-md sm:p-5 md:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="font-display text-lg tracking-tight">Quick Capture</h3>
            </div>
            <div className="flex items-center gap-2">
              <Button
              onClick={() => {
                if (items.length === 0) {
                  toast.info("Nothing to organize yet — capture something first.");
                  return;
                }
                setProcessOpen(true);
              }}
              disabled={triaging}
              className="h-9 gap-2 rounded-full bg-primary px-4 text-[13px] font-medium shadow-sm hover:shadow-md"
            >
              {triaging ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Organize for Me
              </Button>
            </div>
          </div>

          {/* Selected tag chips */}
          {!!combinedTags.length && (
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {combinedTags.map((t) => {
                const isCat = activeCategories.some((c) => c.toLowerCase() === t);
                return (
                  <span key={t} className="shrink-0">
                    <TagChip
                      name={t}
                      size="xs"
                      onRemove={() => {
                        if (isCat) setActiveCategories((cs) => cs.filter((c) => c.toLowerCase() !== t));
                        else setExtraTags((ts) => ts.filter((x) => x !== t));
                      }}
                    />
                  </span>
                );
              })}
              <button
                onClick={() => { setActiveCategories([]); setExtraTags([]); }}
                className="ml-auto shrink-0 rounded-full px-2 py-0.5 text-[11px] text-muted-foreground underline-offset-2 hover:underline"
              >
                Clear
              </button>
            </div>
          )}

          {/* Kind chips + Today's note — combined quick add */}
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            <div className="inline-flex flex-wrap items-center gap-0.5 rounded-full border border-border/60 bg-background/60 p-0.5 text-[11px]">
              {(() => {
                const ALL = [
                  { k: "task",    Icon: ListChecks,     label: "Task" },
                  { k: "home",    Icon: Home,           label: "Home" },
                  { k: "care",    Icon: HeartHandshake, label: "Care" },
                  { k: "meal",    Icon: UtensilsCrossed,label: "Meal" },
                  { k: "note",    Icon: StickyNote,     label: "Note" },
                  { k: "connect", Icon: MessageCircle,  label: "Connect" },
                  { k: "commute", Icon: Car,            label: "Commute" },
                ] as const;
                const visible = kindsOpen ? ALL : ALL.filter(c => c.k === "task" || c.k === captureKind);
                return visible.map(({ k, Icon, label }) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setCaptureKind(k)}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 transition-colors",
                      captureKind === k ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon className="h-3 w-3" />
                    {label}
                  </button>
                ));
              })()}
              <button
                type="button"
                onClick={() => setKindsOpen(o => !o)}
                className="ml-0.5 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-muted-foreground hover:text-foreground"
                aria-label={kindsOpen ? "Fewer types" : "More types"}
              >
                <ChevronDown className={cn("h-3 w-3 transition-transform", kindsOpen && "rotate-180")} />
              </button>
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
              <div className="absolute left-3 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full bg-primary/10 text-primary">
                <span className="text-base leading-none">＋</span>
              </div>
              <NlpHighlightedInput
                value={draft}
                onChange={setDraft}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void submitCapture(); } }}
                placeholder={
                  recorder.state === "recording"
                    ? (willCancel ? "Release to cancel…" : `Listening · ${fmtElapsed(recorder.elapsedMs)}`)
                    : captureKind === "task" ? "What needs your attention?"
                    : captureKind === "home" ? "Add a home or cleaning task…"
                    : captureKind === "care" ? "Add a care task…"
                    : captureKind === "meal" ? "Add a meal for today…"
                    : captureKind === "connect" ? "Who to reach out to or visit?"
                    : captureKind === "commute" ? "Where are you going?"
                    : "Add a note…"
                }
                disabled={recorder.state !== "idle"}
                className={cn(recorder.state === "recording" && "border-rose-300/70 bg-rose-50/40")}
              />
              <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
                {draft.trim() && recorder.state === "idle" && (
                  <>
                    <button
                      type="button"
                      onClick={openReviewForDraft}
                      aria-label="Edit details before saving"
                      className="grid h-10 w-10 place-items-center rounded-xl bg-muted/60 text-muted-foreground transition hover:bg-muted"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <Button
                      onClick={() => void submitCapture()}
                      size="sm"
                      className="h-10 rounded-xl px-3 text-[13px]"
                    >
                      Capture
                    </Button>
                  </>
                )}
                {recorder.supported && !draft.trim() && (
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
                      "relative grid h-12 w-12 place-items-center rounded-2xl ring-1 select-none",
                      recorder.state === "recording"
                        ? willCancel
                          ? "bg-stone-200 text-stone-600 ring-stone-300"
                          : "bg-rose-500 text-white ring-rose-400 shadow-[0_0_0_10px_hsl(0_84%_60%/0.14)]"
                        : "bg-rose-50 text-rose-600 ring-rose-100 hover:bg-rose-100 active:scale-95",
                    )}
                  >
                    {recorder.state === "recording" && !willCancel && (
                      <>
                        {/* Calm breathing halos — slower than animate-ping, softer opacity */}
                        <span
                          className="pointer-events-none absolute -inset-2 rounded-3xl bg-rose-400/20 motion-reduce:hidden"
                          style={{ animation: "careflow-breath 2.4s ease-in-out infinite" }}
                        />
                        <span
                          className="pointer-events-none absolute -inset-1 rounded-3xl bg-rose-300/25 motion-reduce:hidden"
                          style={{ animation: "careflow-breath 2.4s ease-in-out infinite 0.6s" }}
                        />
                      </>
                    )}
                    {recorder.state === "recording" && willCancel ? (
                      <X className="relative h-5 w-5" />
                    ) : (
                      <Mic className="relative h-5 w-5" />
                    )}
                  </button>
                )}
              </div>
              {recorder.state === "recording" && (
                <div className="mt-2 flex items-center justify-between gap-2 px-1 text-[11.5px] text-muted-foreground animate-fade-in">
                  <div className="inline-flex items-center gap-2">
                    {/* Breathing dot */}
                    <span
                      className="inline-flex h-2 w-2 rounded-full bg-rose-500 motion-reduce:animate-none"
                      style={{ animation: "careflow-breath 2.4s ease-in-out infinite" }}
                    />
                    <span className="tabular-nums">{fmtElapsed(recorder.elapsedMs)}</span>
                    {/* 3-dot calm wave */}
                    <span className="ml-1 inline-flex items-end gap-[3px] motion-reduce:hidden" aria-hidden>
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="block w-[3px] rounded-full bg-rose-400/70"
                          style={{
                            height: 6,
                            animation: "careflow-wave 1.2s ease-in-out infinite",
                            animationDelay: `${i * 0.18}s`,
                          }}
                        />
                      ))}
                    </span>
                  </div>
                  <div
                    className={cn("transition-colors duration-200", willCancel ? "font-medium text-rose-600" : "")}
                    style={{ transform: `translateX(${holdDx * 0.4}px)` }}
                  >
                    {willCancel ? "Release to cancel" : "← Slide to cancel"}
                  </div>
                </div>
              )}
            </div>
          )}

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

          {/* Schedule + Priority + Area + Project pickers */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11.5px]">
            {/* Combined When picker (Things 3 style) — date + day-part in one popover */}
            <WhenPopover
              value={{ date: overrideDue || undefined, dayPart }}
              autoDayPart={autoDayPart}
              onChange={(v) => {
                setOverrideDue(v.date ?? "");
                setDayPart(v.dayPart as DayPart);
              }}
            />

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

            {(overrideArea || overridePriority || overrideProjectId || overrideDue || dayPart !== autoDayPart) && (
              <button
                type="button"
                onClick={() => {
                  setOverrideArea(""); setOverridePriority(""); setOverrideProjectId("");
                  setOverrideDue(""); setDayPart(autoDayPart);
                }}
                className="ml-1 rounded-full px-2 py-0.5 text-[11px] text-muted-foreground underline-offset-2 hover:underline"
              >
                Reset
              </button>
            )}
          </div>

          {/* Caregiver quick actions */}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {CAREGIVER_PRESETS.map(p => {
              const Icon = p.icon;
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => quickAdd(p.title, p.area)}
                  className={cn(
                    "group inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[12.5px] font-medium ring-1 transition-all hover:-translate-y-0.5 hover:shadow-sm",
                    p.tint,
                  )}
                >
                  <Icon className="h-3.5 w-3.5" /> {p.label}
                </button>
              );
            })}
          </div>

          {/* Merged: Categories + Tags */}
          <div className="mt-5 border-t border-border/50 pt-4">
            <button
              type="button"
              onClick={() => setTagsOpen((o) => !o)}
              aria-expanded={tagsOpen}
              className="flex w-full items-center justify-between gap-2 text-left"
            >
              <span className="inline-flex items-center gap-2 text-[12.5px] font-medium text-foreground/80">
                <TagIcon className="h-3.5 w-3.5 text-muted-foreground" />
                Categories & Tags
                {(activeCategories.length + extraTags.length) > 0 && (
                  <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10.5px] font-medium text-primary">
                    {activeCategories.length + extraTags.length}
                  </span>
                )}
              </span>
              <span className="inline-flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
                {tagsOpen ? "Hide" : "Show"}
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", tagsOpen && "rotate-180")} />
              </span>
            </button>
            {tagsOpen && (
            <div className="mt-3 flex flex-wrap items-center gap-2 pb-1 animate-fade-in">
              {CATEGORIES.map((c) => {
                const Icon = c.icon;
                const active = activeCategories.includes(c.label);
                return (
                  <button
                    key={c.label}
                    type="button"
                    onClick={() => setActiveCategories((cs) =>
                      cs.includes(c.label) ? cs.filter((x) => x !== c.label) : [...cs, c.label],
                    )}
                    aria-pressed={active}
                    className={cn(
                      "inline-flex shrink-0 snap-start items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium ring-1 transition-all min-h-[34px] sm:px-3.5 sm:py-2 sm:text-[12.5px] sm:min-h-[36px] hover:-translate-y-0.5 hover:shadow-sm",
                      c.tint,
                      active && "ring-2 ring-primary/50 shadow-sm",
                    )}
                  >
                    {active ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                    {c.label}
                  </button>
                );
              })}
              <TagPicker
                value={extraTags}
                onChange={setExtraTags}
                inline={false}
                triggerLabel="More tags"
                triggerClassName="shrink-0 snap-start min-h-[34px] sm:min-h-[36px] rounded-full px-3 sm:px-3.5 text-[12px] sm:text-[12.5px]"
              />
              <Link
                to="/tags"
                className="sm:hidden shrink-0 snap-end inline-flex items-center gap-1 rounded-full border border-dashed border-border/60 bg-background px-3 text-[12px] text-muted-foreground hover:text-foreground min-h-[34px]"
                aria-label="Manage tags"
              >
                Manage
              </Link>
            </div>
            )}
          </div>
        </section>

        {/* ────────── Current Inbox Items (only when present) ────────── */}
        {items.length > 0 ? (
          <section className="rounded-[24px] border border-border/50 bg-card/60 p-4 backdrop-blur-md md:p-5">
            <InboxHeldHeader hasSuggestions={Object.keys(suggestions).length > 0} onApplyAll={acceptAllSuggestions} />
            <SectionedInboxList
              items={items}
              autoDayPart={autoDayPart}
              updateTask={updateTask}
              onAddToBucket={async (b) => {
                const today = format(new Date(), "yyyy-MM-dd");
                const t = await addTask({
                  title: "New item",
                  inbox: true,
                  dueDate: b === "needsDate" ? undefined : today,
                  area: b === "needsCategory" ? undefined : undefined,
                  dayPart: autoDayPart,
                });
                haptics.snap?.();
                if (t?.id) openTaskEditor(t.id);
              }}
              onProcess={() => setProcessOpen(true)}
            />
          </section>
        ) : (
          <section className="rounded-[24px] border border-dashed border-border/60 bg-card/40 p-6 text-center backdrop-blur-md">
            <div className="mx-auto grid h-10 w-10 place-items-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
              <Check className="h-4 w-4" />
            </div>
            <p className="mt-3 font-display text-base tracking-tight">Inbox zero, gently held.</p>
            <p className="mx-auto mt-1 max-w-sm text-[12.5px] leading-relaxed text-muted-foreground">
              Capture above whenever something pops in. New items will appear here sorted into calm sections.
            </p>
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
              onClick={() => {
                if (items.length === 0) {
                  toast.info("Nothing to organize yet — capture something first.");
                  return;
                }
                setProcessOpen(true);
              }}
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
              onClick={() => navigate("/rhythm")}
              className="h-10 shrink-0 gap-2 rounded-full border-border/60 bg-background/70 px-4 text-[13px] backdrop-blur"
            >
              <Moon className="h-3.5 w-3.5" /> See Lunar Insight
            </Button>
          </div>
        </section>
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

// ────────── Asana-style sectioned inbox ──────────

type Bucket = "just" | "needsDate" | "needsCategory" | "ready";

const BUCKET_META: Record<Bucket, { label: string; hint: string; tint: string }> = {
  just:          { label: "Just captured",   hint: "Added in the last hour",          tint: "bg-sky-50/70 text-sky-700 ring-sky-100" },
  needsDate:     { label: "Needs a date",    hint: "Decide when this happens",         tint: "bg-amber-50/70 text-amber-800 ring-amber-100" },
  needsCategory: { label: "Needs a category",hint: "Give it a home",                   tint: "bg-rose-50/70 text-rose-700 ring-rose-100" },
  ready:         { label: "Ready to plan",   hint: "Has a date and a category",        tint: "bg-emerald-50/70 text-emerald-700 ring-emerald-100" },
};

const BUCKET_ORDER: Bucket[] = ["just", "needsDate", "needsCategory", "ready"];

const BUCKET_ICON: Record<Bucket, typeof Sparkles> = {
  just: Sparkles,
  needsDate: CalendarIcon,
  needsCategory: TagIcon,
  ready: Check,
};

function bucketFor(t: any): Bucket {
  const createdAt = t.createdAt ? new Date(t.createdAt).getTime() : 0;
  const ageMs = Date.now() - createdAt;
  if (createdAt && ageMs < 60 * 60 * 1000) return "just";
  if (!t.dueDate) return "needsDate";
  if (!t.area) return "needsCategory";
  return "ready";
}

function InboxHeldHeader({ hasSuggestions, onApplyAll }: { hasSuggestions: boolean; onApplyAll: () => void }) {
  const { selectionMode, toggleSelectionMode, count, clear, selectAll } = useTaskSelection();
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h3 className="font-display text-lg tracking-tight">Held in your inbox</h3>
      <div className="flex items-center gap-1.5">
        {selectionMode ? (
          <>
            <span className="text-[12px] tabular-nums text-muted-foreground">{count} selected</span>
            <Button size="sm" variant="ghost" onClick={selectAll} className="h-8 gap-1 rounded-full text-[12px]">
              Select all
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { clear(); }} className="h-8 gap-1 rounded-full text-[12px]">
              Done
            </Button>
          </>
        ) : (
          <Button size="sm" variant="outline" onClick={toggleSelectionMode} className="h-8 gap-1.5 rounded-full text-[12px]">
            <CheckSquare className="h-3 w-3" /> Select
          </Button>
        )}
        {hasSuggestions && (
          <Button size="sm" variant="outline" onClick={onApplyAll} className="h-8 gap-1.5 rounded-full text-[12px]">
            <Check className="h-3 w-3" /> Apply all suggestions
          </Button>
        )}
      </div>
    </div>
  );
}

function SectionedInboxList({ items, autoDayPart, updateTask, onAddToBucket, onProcess }: {
  items: any[];
  autoDayPart: DayPart;
  updateTask: (id: string, patch: any) => Promise<void> | void;
  onAddToBucket?: (b: Bucket) => void | Promise<void>;
  onProcess?: () => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Bucket and sort by sortOrder so manual reorder persists across renders.
  const groups = useMemo(() => {
    const map = new Map<Bucket, any[]>();
    for (const b of BUCKET_ORDER) map.set(b, []);
    for (const t of items) map.get(bucketFor(t))!.push(t);
    for (const b of BUCKET_ORDER) {
      map.get(b)!.sort((a, b2) => (a.sortOrder ?? 0) - (b2.sortOrder ?? 0));
    }
    return map;
  }, [items]);

  const handleDragEnd = (bucket: Bucket) => async (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const list = groups.get(bucket)!;
    const ids = list.map((t) => `inbox:${t.id}`);
    const oldIdx = ids.indexOf(String(active.id));
    const newIdx = ids.indexOf(String(over.id));
    if (oldIdx < 0 || newIdx < 0) return;
    const reordered = arrayMove(list, oldIdx, newIdx);
    // Re-stride sortOrder with comfortable gaps so future inserts fit between.
    haptics.snap?.();
    await Promise.all(
      reordered.map((t, i) => updateTask(t.id, { sortOrder: (i + 1) * 100 })),
    );
  };

  return (
    <div className="space-y-4">
      {BUCKET_ORDER.map((b) => {
        const list = groups.get(b)!;
        if (list.length === 0) return null;
        const meta = BUCKET_META[b];
        const Icon = BUCKET_ICON[b];
        const ids = list.map((t) => `inbox:${t.id}`);
        return (
          <div key={b}>
            <div className="mb-1.5 flex items-center justify-between gap-2 px-1">
              <div className="inline-flex items-center gap-2">
                <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1", meta.tint)}>
                  <Icon className="h-3 w-3" />
                  {meta.label}
                  <span className="rounded-full bg-background/60 px-1.5 text-[10.5px] font-semibold">{list.length}</span>
                </span>
                <span className="hidden text-[11px] text-muted-foreground sm:inline">{meta.hint}</span>
              </div>
              <div className="flex items-center gap-1">
                {onAddToBucket && (
                  <button
                    type="button"
                    onClick={() => void onAddToBucket(b)}
                    aria-label="Quick add to this section"
                    title="Quick add"
                    className="grid h-6 w-6 place-items-center rounded-full text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                )}
                {onProcess && b !== "ready" && (
                  <button
                    type="button"
                    onClick={onProcess}
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] text-muted-foreground transition hover:bg-muted/60 hover:text-foreground"
                  >
                    <Wand2 className="h-3 w-3" />
                    Process
                  </button>
                )}
              </div>
            </div>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd(b)}>
              <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                <div className="space-y-1.5">
                  {list.map((t: any) => (
                    <InboxSortableRow key={t.id} task={t} autoDayPart={autoDayPart} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        );
      })}
    </div>
  );
}
