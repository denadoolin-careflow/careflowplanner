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
  Mail, ChefHat, Sparkles as SparklesIcon, HandHelping, Package,
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
import { detectAreaAndProject } from "@/lib/task-auto-detect";
import { useAudioRecorder } from "@/hooks/use-audio-recorder";
import { isToday, isFuture, parseISO, format } from "date-fns";
import { InboxIllustration } from "@/components/inbox/InboxIllustration";
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

// Unified compact Quick Action chips. Neutral outlined pill, only the icon
// + label receive a tone color. Tapping prefills the capture input with a
// starter phrase so the user just adds the specifics.
const QUICK_ACTIONS: { icon: any; label: string; phrase: string; tone: string }[] = [
  { icon: Mail,          label: "Text / Email", phrase: "Text/Email ",    tone: "text-sky-600 dark:text-sky-300" },
  { icon: ChefHat,       label: "Cook",         phrase: "Cook ",          tone: "text-amber-600 dark:text-amber-300" },
  { icon: SparklesIcon,  label: "Clean",        phrase: "Clean ",         tone: "text-emerald-600 dark:text-emerald-300" },
  { icon: HandHelping,   label: "Help",         phrase: "Help ",          tone: "text-pink-600 dark:text-pink-300" },
  { icon: Package,       label: "Order",        phrase: "Order ",         tone: "text-violet-600 dark:text-violet-300" },
  { icon: Pill,          label: "Medication",   phrase: "Medication — ",  tone: "text-pink-600 dark:text-pink-300" },
  { icon: Phone,         label: "Call",         phrase: "Call ",          tone: "text-sky-600 dark:text-sky-300" },
  { icon: CalendarIcon,  label: "Appointment",  phrase: "Appointment — ", tone: "text-emerald-600 dark:text-emerald-300" },
  { icon: ShoppingCart,  label: "Grocery",      phrase: "Grocery — ",     tone: "text-amber-600 dark:text-amber-300" },
  { icon: FileText,      label: "Paperwork",    phrase: "Paperwork — ",   tone: "text-stone-500 dark:text-stone-300" },
  { icon: GraduationCap, label: "School",       phrase: "School — ",      tone: "text-emerald-600 dark:text-emerald-300" },
  { icon: Cake,          label: "Birthday",     phrase: "Birthday — ",    tone: "text-pink-600 dark:text-pink-300" },
  { icon: Car,           label: "Errand",       phrase: "Errand — ",      tone: "text-violet-600 dark:text-violet-300" },
];

// Categories adopt the same compact outlined-chip aesthetic as Quick Actions:
// neutral pill outline, only the icon + label are tinted.
const CATEGORIES: { icon: any; label: string; tone: string }[] = [
  { icon: Home,          label: "Home",       tone: "text-emerald-600 dark:text-emerald-300" },
  { icon: Users,         label: "Family",     tone: "text-orange-600 dark:text-orange-300" },
  { icon: Heart,         label: "Health",     tone: "text-rose-600 dark:text-rose-300" },
  { icon: BookOpen,      label: "Learning",   tone: "text-violet-600 dark:text-violet-300" },
  { icon: Moon,          label: "Reflection", tone: "text-indigo-600 dark:text-indigo-300" },
  { icon: HeartHandshake,label: "Caregiving", tone: "text-pink-600 dark:text-pink-300" },
  { icon: Lightbulb,     label: "Ideas",      tone: "text-amber-600 dark:text-amber-300" },
  { icon: Puzzle,        label: "Kids",       tone: "text-teal-600 dark:text-teal-300" },
  { icon: Plane,         label: "Travel",     tone: "text-sky-600 dark:text-sky-300" },
  { icon: Briefcase,     label: "Work",       tone: "text-stone-600 dark:text-stone-300" },
  { icon: Palette,       label: "Creative",   tone: "text-fuchsia-600 dark:text-fuchsia-300" },
  { icon: PawPrint,      label: "Pets",       tone: "text-lime-600 dark:text-lime-300" },
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
  const [careRecipientIds, setCareRecipientIds] = useState<string[]>([]);
  const careRecipientId = careRecipientIds[0] ?? "auto";
  const setCareRecipientSingle = (v: string) => {
    if (!v || v === "auto") setCareRecipientIds([]);
    else setCareRecipientIds([v]);
  };
  const toggleCareRecipient = (id: string) => {
    setCareRecipientIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };
  const [processOpen, setProcessOpen] = useState(false);
  const recorder = useAudioRecorder();
  const [transcribing, setTranscribing] = useState(false);
  const captureInputRef = useRef<HTMLInputElement>(null);
  const [inlineAdd, setInlineAdd] = useState<string | null>(null);
  const inlineAddRef = useRef<HTMLInputElement>(null);

  const startInlineAdd = () => {
    setInlineAdd("");
    haptics.tap?.();
    requestAnimationFrame(() => inlineAddRef.current?.focus());
  };

  const commitInlineAdd = async () => {
    const title = (inlineAdd ?? "").trim();
    if (!title) { setInlineAdd(null); return; }
    await addTask({ title, inbox: true, dayPart });
    haptics.snap?.();
    toast.success("Added to inbox");
    setInlineAdd(null);
  };

  const prefillDraft = (phrase: string) => {
    setCaptureKind("task");
    setDraft((d) => {
      const base = d.trim();
      if (!base) return phrase;
      // If already starts with this phrase, just focus.
      if (base.toLowerCase().startsWith(phrase.trim().toLowerCase())) return d;
      return `${phrase}${base}`;
    });
    haptics.tap?.();
    // Focus + place caret at end on next frame.
    requestAnimationFrame(() => {
      const el = captureInputRef.current;
      if (el) {
        el.focus();
        const len = el.value.length;
        try { el.setSelectionRange(len, len); } catch {}
      }
    });
  };

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

  // Recipient name detection: scan the draft for any caregiving profile name
  // and surface confirm/override chips so the match isn't silently applied.
  const recipientMatches = useMemo(() => {
    const text = draft.trim().toLowerCase();
    if (text.length < 2) return [] as { id: string; name: string; matched: string }[];
    const out: { id: string; name: string; matched: string }[] = [];
    for (const r of (state.recipients ?? []) as any[]) {
      const full = String(r.name ?? "").toLowerCase().trim();
      if (!full) continue;
      const first = full.split(/\s+/)[0];
      const wordRe = new RegExp(`\\b${first.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      if (wordRe.test(text) || (full.length >= 3 && text.includes(full))) {
        out.push({ id: r.id, name: r.name, matched: first });
      }
    }
    return out;
  }, [draft, state.recipients]);

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
        let recipientIds: string[] = [...careRecipientIds];
        if (recipientIds.length === 0) {
          const guess = detectAreaAndProject({
            title: raw,
            areas: state.areas,
            projects: state.projects,
            recipients: state.recipients,
          });
          if (guess.recipientId) recipientIds = [guess.recipientId];
        }
        if (recipientIds.length === 0) {
          await addTask({ title: raw, dueDate: today, dayPart, area: "Caregiving" });
          toast.success(`Added care task → ${dayPart}`);
        } else {
          for (const rid of recipientIds) {
            await addTask({
              title: raw,
              dueDate: today,
              dayPart,
              area: "Caregiving",
              recipientId: rid,
            });
          }
          const names = recipientIds
            .map((id) => state.recipients?.find((r: any) => r.id === id)?.name)
            .filter(Boolean) as string[];
          toast.success(
            names.length === 1
              ? `Added care task for ${names[0]} → ${dayPart}`
              : `Added care task for ${names.length} people → ${dayPart}`,
          );
          setCareRecipientIds([]);
        }
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

          <div className="relative overflow-hidden rounded-[28px] border border-border/40 bg-[radial-gradient(ellipse_140%_140%_at_10%_30%,hsl(150_35%_92%/0.85),hsl(36_50%_97%/0.6)_45%,hsl(var(--card))_85%)] p-6 shadow-[0_20px_60px_-30px_hsl(var(--primary)/0.35)] md:p-8 dark:bg-[radial-gradient(ellipse_140%_140%_at_10%_30%,hsl(150_25%_22%/0.5),hsl(var(--card))_70%)]">
            <div className="pointer-events-none absolute -inset-20 rounded-full bg-[hsl(150_40%_85%)]/30 blur-[80px]" />
            <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-[hsl(36_60%_90%)]/25 blur-[90px]" />

            <div className="relative grid gap-5 sm:grid-cols-[160px_minmax(0,1fr)] sm:items-center md:grid-cols-[200px_minmax(0,1fr)] md:gap-7">
              <div className="mx-auto sm:mx-0">
                <InboxIllustration isEmpty={items.length === 0} count={items.length} />
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
                ref={captureInputRef}
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
                      "relative grid h-9 w-9 place-items-center rounded-full ring-1 select-none",
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
                      <X className="relative h-4 w-4" />
                    ) : (
                      <Mic className="relative h-4 w-4" />
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

          {recipientMatches.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-pink-300/40 bg-pink-50/40 px-3 py-2.5 text-[12.5px] animate-fade-in dark:border-pink-400/20 dark:bg-pink-500/[0.06]">
              <HeartHandshake className="h-3.5 w-3.5 text-pink-600 dark:text-pink-300" />
              <span className="text-muted-foreground">
                {recipientMatches.length === 1
                  ? "Is this for"
                  : careRecipientIds.length > 1
                    ? `For ${careRecipientIds.length} people?`
                    : "Who is this for? (tap multiple)"}
              </span>
              {recipientMatches.map((r) => {
                const active = careRecipientIds.includes(r.id);
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      toggleCareRecipient(r.id);
                      if (!active && captureKind !== "care") setCaptureKind("care");
                      haptics.tap?.();
                    }}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-medium ring-1 transition-all",
                      active
                        ? "bg-pink-500/15 text-pink-700 ring-pink-400/60 dark:text-pink-200"
                        : "bg-card text-foreground/80 ring-border/60 hover:ring-pink-400/50",
                    )}
                    aria-pressed={active}
                    title={active ? "Tap to remove" : `Add ${r.name}`}
                  >
                    {active && <Check className="h-3 w-3" />}
                    {r.name}
                  </button>
                );
              })}
              {(state.recipients ?? []).length > recipientMatches.length && (
                <select
                  value=""
                  onChange={(e) => {
                    const v = e.target.value;
                    if (!v) return;
                    if (!careRecipientIds.includes(v)) {
                      setCareRecipientIds((prev) => [...prev, v]);
                    }
                    if (captureKind !== "care") setCaptureKind("care");
                  }}
                  className="ml-1 rounded-full border border-border/60 bg-card px-2 py-0.5 text-[11.5px] text-muted-foreground outline-none"
                  aria-label="Add another person"
                >
                  <option value="">Add someone else…</option>
                  {(state.recipients ?? [])
                    .filter((r: any) => !recipientMatches.some((m) => m.id === r.id) && !careRecipientIds.includes(r.id))
                    .map((r: any) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                </select>
              )}
              {careRecipientIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCareRecipientIds([])}
                  className="ml-auto rounded-full px-2 py-0.5 text-[11px] text-muted-foreground underline-offset-2 hover:underline"
                >
                  Clear
                </button>
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
          <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[12px]">
            {/* Combined When picker (Things 3 style) — date + day-part in one popover */}
            <WhenPopover
              value={{ date: overrideDue || undefined, dayPart }}
              autoDayPart={autoDayPart}
              onChange={(v) => {
                setOverrideDue(v.date ?? "");
                setDayPart(v.dayPart as DayPart);
              }}
            />

            <ChipSelect
              icon={Flag}
              placeholder="Priority"
              value={overridePriority}
              tone={overridePriority === "high" ? "text-rose-600 dark:text-rose-300"
                : overridePriority === "medium" ? "text-amber-600 dark:text-amber-300"
                : overridePriority === "low" ? "text-emerald-600 dark:text-emerald-300"
                : undefined}
              onChange={(v) => setOverridePriority(v as Priority | "")}
              options={[
                { value: "", label: "Any priority" },
                { value: "low", label: "Low" },
                { value: "medium", label: "Medium" },
                { value: "high", label: "High" },
              ]}
            />

            <ChipSelect
              icon={MapPin}
              placeholder="Area"
              value={overrideArea}
              tone={overrideArea ? "text-sky-600 dark:text-sky-300" : undefined}
              onChange={(v) => setOverrideArea(v as Area | "")}
              options={[
                { value: "", label: "No area" },
                ...(["Family","Kids","Caregiving","Home","Meals","Appointments","Holidays & Birthdays","Personal","Creative Projects","Money"] as Area[])
                  .map(a => ({ value: a, label: a })),
              ]}
            />

            {captureKind === "care" && (
              (state.recipients ?? []).length === 0 ? (
                <button
                  type="button"
                  onClick={() => navigate("/caregiving")}
                  className="inline-flex h-[30px] shrink-0 items-center gap-1.5 rounded-full border border-dashed border-border/60 bg-transparent px-3 text-[12px] font-medium text-muted-foreground hover:border-border hover:text-foreground"
                >
                  <HeartHandshake className="h-[14px] w-[14px]" strokeWidth={1.75} />
                  Add a person
                </button>
              ) : (
                <ChipSelect
                  icon={HeartHandshake}
                  placeholder="Who?"
                  value={careRecipientId}
                  tone={careRecipientId !== "auto" ? "text-pink-600 dark:text-pink-300" : undefined}
                  onChange={setCareRecipientSingle}
                  options={[
                    { value: "auto", label: "Auto-detect from text" },
                    ...(state.recipients ?? []).map((r: any) => ({ value: r.id, label: r.name })),
                  ]}
                />
              )
            )}

            {(state.projects ?? []).length > 0 && (
              <ChipSelect
                icon={Folder}
                placeholder="Project"
                value={overrideProjectId}
                tone={overrideProjectId ? "text-violet-600 dark:text-violet-300" : undefined}
                onChange={setOverrideProjectId}
                options={[
                  { value: "", label: "No project" },
                  ...(state.projects ?? []).slice(0, 50).map((p: any) => ({ value: p.id, label: p.name })),
                ]}
              />
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

          {/* Quick Actions — compact outlined chips. Neutral pill, colored icon+label only. */}
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between px-0.5">
              <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary/70" /> Quick Actions
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_ACTIONS.map((q) => {
                const Icon = q.icon;
                return (
                  <button
                    key={q.label}
                    type="button"
                    onClick={() => prefillDraft(q.phrase)}
                    className={cn(
                      "inline-flex h-[34px] shrink-0 items-center gap-1.5 rounded-full border border-border/60 bg-transparent px-3 text-[13px] font-medium transition-all",
                      "hover:border-border hover:bg-card/60 active:scale-[0.97]",
                      q.tone,
                    )}
                  >
                    <Icon className="h-[15px] w-[15px]" strokeWidth={1.75} />
                    <span>{q.label}</span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={startInlineAdd}
                className="inline-flex h-[34px] shrink-0 items-center gap-1.5 rounded-full border border-dashed border-border/60 bg-transparent px-3 text-[13px] font-medium text-muted-foreground transition-all hover:border-border hover:text-foreground active:scale-[0.97]"
              >
                <Plus className="h-[15px] w-[15px]" strokeWidth={1.75} />
                <span>Add</span>
              </button>
            </div>
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
                      "inline-flex h-[34px] shrink-0 items-center gap-1.5 rounded-full border border-border/60 bg-transparent px-3 text-[13px] font-medium transition-all hover:border-border hover:bg-card/60 active:scale-[0.97]",
                      c.tone,
                      active && "border-primary/60 bg-primary/[0.06] shadow-sm",
                    )}
                  >
                    {active ? (
                      <Check className="h-[15px] w-[15px]" strokeWidth={1.75} />
                    ) : (
                      <Icon className="h-[15px] w-[15px]" strokeWidth={1.75} />
                    )}
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
            {inlineAdd !== null && (
              <div className="mb-3 flex items-center gap-2 rounded-2xl border border-primary/30 bg-background/80 px-3 py-2 shadow-[0_0_0_4px_hsl(var(--primary)/0.08)]">
                <Plus className="h-4 w-4 text-primary/70" />
                <input
                  ref={inlineAddRef}
                  value={inlineAdd}
                  onChange={(e) => setInlineAdd(e.target.value)}
                  onBlur={() => void commitInlineAdd()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); void commitInlineAdd(); }
                    else if (e.key === "Escape") { e.preventDefault(); setInlineAdd(null); }
                  }}
                  placeholder="New inbox item…"
                  className="h-7 flex-1 bg-transparent text-[14px] text-foreground outline-none placeholder:text-muted-foreground/70"
                />
                <span className="text-[10.5px] text-muted-foreground">Enter to save · Esc to cancel</span>
              </div>
            )}
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
            {inlineAdd !== null && (
              <div className="mb-4 flex items-center gap-2 rounded-2xl border border-primary/30 bg-background/80 px-3 py-2 text-left shadow-[0_0_0_4px_hsl(var(--primary)/0.08)]">
                <Plus className="h-4 w-4 text-primary/70" />
                <input
                  ref={inlineAddRef}
                  value={inlineAdd}
                  onChange={(e) => setInlineAdd(e.target.value)}
                  onBlur={() => void commitInlineAdd()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); void commitInlineAdd(); }
                    else if (e.key === "Escape") { e.preventDefault(); setInlineAdd(null); }
                  }}
                  placeholder="New inbox item…"
                  className="h-7 flex-1 bg-transparent text-[14px] text-foreground outline-none placeholder:text-muted-foreground/70"
                />
              </div>
            )}
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

/**
 * Compact outlined chip wrapping a native <select> — visually matches the
 * Quick Action chips: neutral pill outline + tinted icon/label only.
 */
function ChipSelect({
  icon: Icon, value, onChange, options, placeholder, tone,
}: {
  icon: any;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
  tone?: string;
}) {
  const current = options.find((o) => o.value === value);
  const isActive = !!value && value !== "" && value !== "auto";
  const label = current && isActive ? current.label : placeholder;
  return (
    <label
      className={cn(
        "group relative inline-flex h-[30px] shrink-0 items-center gap-1.5 rounded-full border border-border/60 bg-transparent px-3 pr-7 text-[12px] font-medium transition-all hover:border-border hover:bg-card/60",
        isActive ? tone : "text-muted-foreground hover:text-foreground",
        isActive && "border-primary/40 bg-primary/[0.05]",
      )}
    >
      <Icon className="h-[14px] w-[14px]" strokeWidth={1.75} />
      <span className="max-w-[10rem] truncate">{label}</span>
      <ChevronDown className="pointer-events-none absolute right-2 h-3 w-3 opacity-60" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 cursor-pointer opacity-0"
        aria-label={placeholder}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}

// ────────── Asana-style sectioned inbox ──────────

type Bucket = "just" | "scheduledToday" | "needsDate" | "needsCategory" | "ready";

const BUCKET_META: Record<Bucket, { label: string; hint: string; tint: string }> = {
  just:          { label: "Just captured",   hint: "Added in the last hour",          tint: "bg-sky-50/70 text-sky-700 ring-sky-100" },
  scheduledToday:{ label: "Scheduled for today", hint: "Held here until you process it", tint: "bg-primary/10 text-primary ring-primary/20" },
  needsDate:     { label: "Needs a date",    hint: "Decide when this happens",         tint: "bg-amber-50/70 text-amber-800 ring-amber-100" },
  needsCategory: { label: "Needs a category",hint: "Give it a home",                   tint: "bg-rose-50/70 text-rose-700 ring-rose-100" },
  ready:         { label: "Ready to plan",   hint: "Has a date and a category",        tint: "bg-emerald-50/70 text-emerald-700 ring-emerald-100" },
};

const BUCKET_ORDER: Bucket[] = ["just", "scheduledToday", "needsDate", "needsCategory", "ready"];

const BUCKET_ICON: Record<Bucket, typeof Sparkles> = {
  just: Sparkles,
  scheduledToday: CalendarIcon,
  needsDate: CalendarIcon,
  needsCategory: TagIcon,
  ready: Check,
};

function bucketFor(t: any): Bucket {
  const todayIso = format(new Date(), "yyyy-MM-dd");
  const createdAt = t.createdAt ? new Date(t.createdAt).getTime() : 0;
  const ageMs = Date.now() - createdAt;
  if (createdAt && ageMs < 60 * 60 * 1000) return "just";
  if (t.dueDate === todayIso) return "scheduledToday";
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
