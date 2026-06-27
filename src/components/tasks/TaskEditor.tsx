import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  CalendarIcon, X, Tag, Flag, Zap, Clock, Repeat, FolderKanban, Target,
  Star, Trash2, FileText, Link2, AlignLeft, Paperclip, ListTree, User, FolderTree,
  ChevronDown, ChevronRight, Wand2, Hash, ListChecks, Timer, History,
  Sunrise, Sun, Sunset, Moon, PanelRightOpen, PanelRightClose,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { Task, AREAS, Priority, Energy, RecurrenceType } from "@/lib/types";
import { useStore } from "@/lib/store";
import { toast } from "sonner";
import { LinkedNotesPanel } from "@/components/notes/LinkedNotesPanel";
import { BlockEditor } from "@/components/notes/BlockEditor";
import { LucideIconPicker } from "@/components/common/LucideIconPicker";
import { inferTaskIcon } from "@/lib/task-icons";
import { AttachmentsField } from "@/components/attachments/AttachmentsField";
import { NoteAIButton } from "@/components/notes/NoteAIButton";
import { SubtaskAddMenu } from "@/components/tasks/SubtaskAddMenu";
import { Checkbox } from "@/components/ui/checkbox";
import { TagPicker } from "@/components/tags/TagPicker";
import { supabase } from "@/integrations/supabase/client";
import { detectAreaAndProject } from "@/lib/task-auto-detect";
import { Sparkles } from "lucide-react";
import { aiInvoke } from "@/lib/ai-invoke";
import { parseTaskInput } from "@/lib/nlp-task";
import { copyToClipboard, formatTaskForCopy } from "@/lib/clipboard";
import { Copy } from "lucide-react";
import { useAtmosphere } from "@/lib/atmospheres";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { TaskAIAssistPopover } from "@/components/tasks/TaskAIAssistPopover";
import { PomodoroDialog } from "@/components/routines/PomodoroDialog";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  task: Task | null;
  onUnschedule?: () => void | Promise<void>;
  unscheduleLabel?: string;
};

/* ---------- shared bits ---------- */

function Field({ icon: Icon, label, children, className }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 space-y-1", className)}>
      <Label className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </Label>
      {children}
    </div>
  );
}

function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      {title && (
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
          {title}
        </h3>
      )}
      {children}
    </section>
  );
}

function ProjectGoalLinks({ draft, set }: { draft: Task; set: <K extends keyof Task>(k: K, v: Task[K]) => void }) {
  const { state } = useStore();
  const projects = state.projects ?? [];
  return (
    <>
      <Field icon={FolderKanban} label="Project">
        <Select value={draft.projectId ?? "none"} onValueChange={v => set("projectId", v === "none" ? undefined : v)}>
          <SelectTrigger className="w-full"><SelectValue placeholder="—" /></SelectTrigger>
          <SelectContent className="z-[60] max-h-64" position="popper" sideOffset={6} collisionPadding={12}>
            <SelectItem value="none" icon={<X className="h-4 w-4 text-muted-foreground" />}>No project</SelectItem>
            {projects.map(p => <SelectItem key={p.id} value={p.id} icon={<FolderKanban className="h-4 w-4 text-muted-foreground" />}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
      <Field icon={Target} label="Goal">
        <Select value={draft.goalId ?? "none"} onValueChange={v => set("goalId", v === "none" ? undefined : v)}>
          <SelectTrigger className="w-full"><SelectValue placeholder="—" /></SelectTrigger>
          <SelectContent className="z-[60] max-h-64" position="popper" sideOffset={6} collisionPadding={12}>
            <SelectItem value="none" icon={<X className="h-4 w-4 text-muted-foreground" />}>No goal</SelectItem>
            {state.goals.map(g => <SelectItem key={g.id} value={g.id} icon={<Target className="h-4 w-4 text-muted-foreground" />}>{g.title}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
      <Field icon={User} label="Linked person">
        <Select value={draft.recipientId ?? "none"} onValueChange={v => set("recipientId", v === "none" ? undefined : v)}>
          <SelectTrigger className="w-full"><SelectValue placeholder="—" /></SelectTrigger>
          <SelectContent className="z-[60] max-h-64" position="popper" sideOffset={6} collisionPadding={12}>
            <SelectItem value="none" icon={<X className="h-4 w-4 text-muted-foreground" />}>No one</SelectItem>
            {(state.recipients ?? []).map(r => <SelectItem key={r.id} value={r.id} icon={<User className="h-4 w-4 text-muted-foreground" />}>{r.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
    </>
  );
}

export function TaskEditor({ open, onOpenChange, task, onUnschedule, unscheduleLabel = "Unschedule" }: Props) {
  const { updateTask, deleteTask, addTask, toggleTask, state } = useStore();
  const [draft, setDraft] = useState<Task | null>(task);
  const [subDraft, setSubDraft] = useState("");
  const [addingSub, setAddingSub] = useState(false);
  const [subAiLoading, setSubAiLoading] = useState(false);
  const [autoBusy, setAutoBusy] = useState(false);
  const [timerOpen, setTimerOpen] = useState(false);
  const [notesExpanded, setNotesExpanded] = useState(() => !!(task?.notes && task.notes.trim().length > 0));
  const [nlpOn, setNlpOn] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("cf.taskedit.nlp") !== "0";
  });
  const [sideHidden, setSideHidden] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("cf.taskedit.sideHidden") === "1";
  });
  const toggleSide = () => {
    setSideHidden(v => {
      const next = !v;
      try { localStorage.setItem("cf.taskedit.sideHidden", next ? "1" : "0"); } catch {}
      return next;
    });
  };
  const toggleNlp = () => {
    setNlpOn(v => {
      const next = !v;
      try { localStorage.setItem("cf.taskedit.nlp", next ? "1" : "0"); } catch {}
      return next;
    });
  };

  useEffect(() => { setDraft(task); }, [task]);
  useEffect(() => {
    if (task) {
      setNotesExpanded(!!(task.notes && task.notes.trim().length > 0));
    }
  }, [task?.id]);

  const parsed = nlpOn && draft?.title.trim() ? parseTaskInput(draft.title) : null;

  if (!draft) return null;

  const set = <K extends keyof Task>(k: K, v: Task[K]) => setDraft(d => d ? { ...d, [k]: v } : d);

  const applyNlp = () => {
    if (!draft || !parsed) return;
    const next: Partial<Task> = {};
    if (parsed.title && parsed.title !== draft.title) next.title = parsed.title;
    if (parsed.dueDate && !draft.dueDate) next.dueDate = parsed.dueDate;
    if (parsed.time && !draft.startTime) next.startTime = parsed.time;
    if (parsed.priority && draft.priority == null) next.priority = parsed.priority;
    if (parsed.area && !draft.area) next.area = parsed.area;
    if (parsed.energy && !draft.energy) next.energy = parsed.energy;
    if (parsed.estMinutes && !draft.estMinutes) next.estMinutes = parsed.estMinutes;
    if (parsed.recurrenceType && !draft.recurrenceType) {
      next.recurrenceType = parsed.recurrenceType;
      if (parsed.recurrenceInterval) next.recurrenceInterval = parsed.recurrenceInterval;
      if (parsed.recurrenceDays) next.recurrenceDays = parsed.recurrenceDays;
    }
    if (parsed.tags && parsed.tags.length) {
      const merged = Array.from(new Set([...(draft.tags ?? []), ...parsed.tags]));
      if (merged.length !== (draft.tags?.length ?? 0)) next.tags = merged;
    }
    if (parsed.projectName && !draft.projectId) {
      const lc = parsed.projectName.toLowerCase();
      const match = (state.projects ?? []).find(p => p.name.toLowerCase() === lc)
        ?? (state.projects ?? []).find(p => p.name.toLowerCase().includes(lc));
      if (match) next.projectId = match.id;
    }
    if (Object.keys(next).length === 0) return;
    setDraft(d => d ? { ...d, ...next } : d);
    const labels = parsed.chips.map(c => c.label).join(" · ");
    toast.success("NLP applied", { description: labels });
  };

  const runAutoDetect = () => {
    if (!draft) return;
    setAutoBusy(true);
    try {
      const guess = detectAreaAndProject({
        title: draft.title,
        notes: draft.notes,
        areas: state.areas,
        projects: state.projects,
        recipients: state.recipients,
      });
      const next: Partial<Task> = {};
      if (guess.area && guess.area !== draft.area) next.area = guess.area as Task["area"];
      if (guess.projectId && guess.projectId !== draft.projectId) next.projectId = guess.projectId;
      if (guess.recipientId && guess.recipientId !== draft.recipientId) next.recipientId = guess.recipientId;
      if (!next.area && !next.projectId && !next.recipientId) {
        toast("No confident match — set them manually.");
        return;
      }
      setDraft(d => d ? { ...d, ...next } : d);
      const bits: string[] = [];
      if (next.area) bits.push(`Area → ${next.area}`);
      if (guess.projectName && next.projectId) bits.push(`Project → ${guess.projectName}`);
      if (next.recipientId) {
        const r = state.recipients?.find(x => x.id === next.recipientId);
        if (r) bits.push(`For → ${r.name}`);
      }
      toast.success("Auto-detected", { description: bits.join(" · ") });
    } finally {
      setAutoBusy(false);
    }
  };

  const subtasks = (state.tasks ?? []).filter(t => t.parentTaskId === draft.id);
  const realSubtasks = subtasks.filter(s => !/^##\s+/.test(s.title));

  const addSubtaskNow = async (title: string) => {
    const t = title.trim();
    if (!t) return;
    await addTask({ title: t, area: draft.area, parentTaskId: draft.id, projectId: draft.projectId });
    setSubDraft("");
  };

  const generateSubtasksAI = async () => {
    if (subAiLoading) return;
    setSubAiLoading(true);
    try {
      const { data, error } = await aiInvoke("ai-subtasks", {
        body: { title: draft.title, notes: draft.notes, area: draft.area, count: 5 },
      });
      if (error) throw error;
      const list: string[] = Array.isArray((data as any)?.subtasks) ? (data as any).subtasks : [];
      if (list.length === 0) { toast.error("No subtasks generated"); return; }
      for (const title of list) {
        await addTask({ title, area: draft.area, parentTaskId: draft.id, projectId: draft.projectId });
      }
      toast.success(`Added ${list.length} steps`);
    } catch (e: any) {
      toast.error("AI breakdown failed", { description: e?.message ?? String(e) });
    } finally {
      setSubAiLoading(false);
    }
  };

  const save = async () => {
    if (!draft.title.trim()) { toast.error("Title is needed."); return; }
    await updateTask(draft.id, draft);
    toast.success("Saved.");
    onOpenChange(false);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex h-[100dvh] max-h-[100dvh] w-screen max-w-[100vw] flex-col gap-0 overflow-hidden overflow-x-hidden rounded-none p-0 sm:h-auto sm:max-h-[88vh] sm:w-[min(96vw,60rem)] sm:max-w-none sm:rounded-lg lg:w-[min(96vw,72rem)] lg:max-h-[90vh]"
      >
        {/* Sticky header */}
        <DialogHeader className="shrink-0 border-b border-border/60 bg-background/95 px-4 py-3 backdrop-blur sm:px-5">
          <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:flex-nowrap sm:gap-2.5">
            <Checkbox
              checked={draft.done}
              onCheckedChange={() => toggleTask(draft.id)}
              className="h-6 w-6 shrink-0 sm:h-5 sm:w-5"
              aria-label="Mark complete"
            />
            <LucideIconPicker
              value={draft.icon?.startsWith("lc:") ? draft.icon : undefined}
              onChange={v => set("icon", v)}
              fallbackIcon={inferTaskIcon(draft.title, draft.notes)}
            />
            <Input
              value={draft.title}
              onChange={e => set("title", e.target.value)}
              onBlur={() => { if (nlpOn && parsed && parsed.chips.length) applyNlp(); }}
              placeholder="Task title"
              className="order-last h-11 w-full min-w-0 max-w-full flex-1 basis-full border-0 bg-transparent px-0 text-[17px] font-semibold text-foreground caret-primary placeholder:text-muted-foreground/60 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 sm:order-none sm:h-10 sm:basis-auto sm:w-auto"
            />
            <div className="ml-auto flex items-center gap-1 sm:ml-0 sm:contents">
            <TaskAIAssistPopover
              title={draft.title}
              notes={draft.notes}
              area={draft.area as string | undefined}
              currentEstMinutes={draft.estMinutes}
              currentTags={draft.tags ?? []}
              onAcceptTitle={(next) => set("title", next)}
              onAcceptEstimate={(m) => set("estMinutes", m)}
              onAcceptSubtask={async (t) => {
                await addTask({ title: t, area: draft.area, parentTaskId: draft.id, projectId: draft.projectId });
              }}
              onAcceptAllSubtasks={async (titles) => {
                for (const t of titles) {
                  await addTask({ title: t, area: draft.area, parentTaskId: draft.id, projectId: draft.projectId });
                }
              }}
              onAcceptTag={(tag) => {
                const merged = Array.from(new Set([...(draft.tags ?? []), tag]));
                set("tags", merged);
              }}
              onAcceptAllTags={(tags) => {
                const merged = Array.from(new Set([...(draft.tags ?? []), ...tags]));
                set("tags", merged);
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn("h-9 w-9 shrink-0 sm:h-8 sm:w-8", draft.isTopThree ? "text-amber-500" : "text-muted-foreground hover:text-foreground")}
              onClick={() => set("isTopThree", !draft.isTopThree)}
              aria-label="Favorite / Top three"
              title="Top three today"
            >
              <Star className={cn("h-4 w-4", draft.isTopThree && "fill-current")} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 text-muted-foreground hover:text-primary sm:h-8 sm:w-8"
              onClick={() => setTimerOpen(true)}
              aria-label="Start timer"
              title="Start focus timer"
            >
              <Timer className="h-4 w-4" />
            </Button>
            </div>
            <div className="mx-1 hidden h-5 w-px bg-border/60 sm:block" />
            <DialogTitle className="sr-only">Edit task</DialogTitle>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="hidden gap-1.5 text-muted-foreground hover:text-foreground sm:inline-flex"
              onClick={async () => {
                const proj = state.projects?.find(p => p.id === draft.projectId);
                const subs = (state.tasks ?? []).filter(t => t.parentTaskId === draft.id);
                const ok = await copyToClipboard(formatTaskForCopy({
                  title: draft.title, done: draft.done, area: draft.area,
                  projectName: proj?.name, dueDate: draft.dueDate, priority: draft.priority,
                  tags: draft.tags, notes: draft.notes,
                  subtasks: subs.map(s => ({ title: s.title, done: s.done })),
                }));
                if (ok) toast.success("Copied to clipboard"); else toast.error("Copy failed");
              }}
            >
              <Copy className="h-3.5 w-3.5" /> Copy
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="hidden gap-1.5 text-muted-foreground hover:text-foreground sm:inline-flex"
              onClick={async () => {
                await addTask({
                  title: draft.title,
                  notes: draft.notes,
                  area: draft.area,
                  projectId: draft.projectId,
                  priority: draft.priority,
                  tags: draft.tags,
                  dueDate: draft.dueDate,
                  estMinutes: draft.estMinutes,
                  energy: draft.energy,
                } as any);
                toast.success("Duplicated");
              }}
            >
              <FileText className="h-3.5 w-3.5" /> Duplicate
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="hidden gap-1.5 text-muted-foreground hover:text-foreground lg:inline-flex"
              onClick={toggleSide}
              title={sideHidden ? "Show context panel" : "Focus mode — hide context panel"}
              aria-pressed={sideHidden}
            >
              {sideHidden ? <PanelRightOpen className="h-3.5 w-3.5" /> : <PanelRightClose className="h-3.5 w-3.5" />}
              {sideHidden ? "Show panel" : "Focus"}
            </Button>
          </div>

          {/* Quick details bar — pills */}
          <div
            className={cn(
              "-mx-4 mt-3 flex items-center gap-1.5 px-4",
              // Mobile: single horizontally-scrollable row so 6+ pills don't
              // explode the header height. Desktop: wrap normally.
              "overflow-x-auto overflow-y-hidden whitespace-nowrap [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
              "[mask-image:linear-gradient(to_right,black_calc(100%-32px),transparent)]",
              "sm:-mx-0 sm:px-0 sm:flex-wrap sm:overflow-visible sm:whitespace-normal sm:[mask-image:none]",
            )}
          >
            <PillPopover
              icon={<CalendarIcon className="h-3.5 w-3.5" />}
              label={draft.dueDate ? format(parseISO(draft.dueDate), "EEE, MMM d") : "Today"}
              active={!!draft.dueDate}
              onClear={draft.dueDate ? () => set("dueDate", undefined) : undefined}
            >
              <Calendar
                mode="single"
                selected={draft.dueDate ? parseISO(draft.dueDate) : undefined}
                onSelect={(d) => set("dueDate", d ? format(d, "yyyy-MM-dd") : undefined)}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PillPopover>

            <PillPopover
              icon={<Clock className="h-3.5 w-3.5" />}
              label={draft.startTime ? draft.startTime : "No time"}
              active={!!draft.startTime}
              onClear={draft.startTime ? () => set("startTime", undefined) : undefined}
            >
              <div className="space-y-2 p-3">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Start time</Label>
                <Input
                  type="time"
                  value={draft.startTime ?? ""}
                  onChange={(e) => set("startTime", e.target.value || undefined)}
                />
                <Label className="pt-1 text-[11px] uppercase tracking-wider text-muted-foreground">End time</Label>
                <Input
                  type="time"
                  value={draft.endTime ?? ""}
                  onChange={(e) => set("endTime", e.target.value || undefined)}
                />
              </div>
            </PillPopover>

            <TimeOfDayPill
              startTime={draft.startTime}
              onSelect={(time) => set("startTime", time)}
              onClear={() => set("startTime", undefined)}
            />

            <PillPopover
              icon={<Flag className={cn("h-3.5 w-3.5", PRIORITY_TONE[draft.priority ?? "medium"])} />}
              label={(draft.priority ?? "medium").replace(/^\w/, c => c.toUpperCase())}
              active={!!draft.priority}
            >
              <div className="w-44 p-1">
                {(["low", "medium", "high"] as Priority[]).map(p => (
                  <button
                    key={p}
                    onClick={() => set("priority", p)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted",
                      draft.priority === p && "bg-muted"
                    )}
                  >
                    <Flag className={cn("h-3.5 w-3.5", PRIORITY_TONE[p])} />
                    <span className="capitalize">{p}</span>
                  </button>
                ))}
              </div>
            </PillPopover>

            <PillPopover
              icon={<Repeat className="h-3.5 w-3.5" />}
              label={draft.recurrenceType && draft.recurrenceType !== "none"
                ? `Repeats ${draft.recurrenceType}`
                : "No repeat"}
              active={!!draft.recurrenceType && draft.recurrenceType !== "none"}
              onClear={draft.recurrenceType && draft.recurrenceType !== "none" ? () => set("recurrenceType", "none" as RecurrenceType) : undefined}
            >
              <div className="w-44 p-1">
                {(["none", "daily", "weekly", "monthly"] as const).map(r => (
                  <button
                    key={r}
                    onClick={() => set("recurrenceType", r as RecurrenceType)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm capitalize hover:bg-muted",
                      (draft.recurrenceType ?? "none") === r && "bg-muted"
                    )}
                  >
                    <Repeat className="h-3.5 w-3.5" />
                    {r === "none" ? "Doesn't repeat" : r}
                  </button>
                ))}
              </div>
            </PillPopover>

            <PillPopover
              icon={<Timer className="h-3.5 w-3.5" />}
              label={draft.estMinutes ? `${draft.estMinutes} min` : "Estimate"}
              active={!!draft.estMinutes}
              onClear={draft.estMinutes ? () => set("estMinutes", undefined) : undefined}
            >
              <div className="w-52 space-y-2 p-3">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Estimated minutes</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="—"
                  value={draft.estMinutes ?? ""}
                  onChange={e => set("estMinutes", e.target.value ? Number(e.target.value) : undefined)}
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[5, 15, 30, 45, 60, 90].map(n => (
                    <button key={n} type="button" onClick={() => set("estMinutes", n)}
                      className="rounded-full border border-border/60 px-2 py-0.5 text-[11px] hover:bg-muted">
                      {n}m
                    </button>
                  ))}
                </div>
              </div>
            </PillPopover>

            <PillPopover
              icon={<Tag className="h-3.5 w-3.5" />}
              label={draft.area ?? "Area"}
              active={!!draft.area}
            >
              <div className="w-44 p-1">
                {AREAS.map(a => (
                  <button
                    key={a}
                    onClick={() => set("area", a as any)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted",
                      draft.area === a && "bg-muted"
                    )}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </PillPopover>

            <ProjectPill
              value={draft.projectId}
              projects={state.projects ?? []}
              onSelect={(id) => set("projectId", id)}
              onClear={() => set("projectId", undefined)}
            />
          </div>

          {/* NLP chips inline */}
          {nlpOn && parsed && parsed.chips.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-primary" />
              {parsed.chips.map((c, i) => (
                <span key={i} className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">{c.label}</span>
              ))}
              <button type="button" onClick={applyNlp}
                className="ml-1 rounded-full border border-border/60 px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-muted">
                Apply
              </button>
              <button type="button" onClick={toggleNlp}
                className="ml-auto text-[10px] text-muted-foreground hover:text-foreground">NLP off</button>
            </div>
          )}
        </DialogHeader>

        {/* Scrollable body */}
        <div className="min-h-0 w-full min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-4 py-4 sm:px-5">
          <div className={cn(
            "grid min-w-0 gap-4 transition-all",
            sideHidden
              ? "lg:mx-auto lg:max-w-3xl lg:grid-cols-1"
              : "lg:grid-cols-[1.55fr_1fr]",
          )}>
            {/* ─────────── Left column: work surface ─────────── */}
            <div className="min-w-0 space-y-4">
              {/* Checklist */}
              <Card>
                <CardHeader
                  icon={<ListChecks className="h-3.5 w-3.5" />}
                  title="Checklist"
                  count={realSubtasks.length > 0 ? `${realSubtasks.filter(s => s.done).length}/${realSubtasks.length}` : undefined}
                  right={
                    <div className="flex items-center gap-1">
                      <Button
                        type="button" size="sm" variant="ghost"
                        className="h-7 gap-1 px-2 text-[11px] text-primary hover:bg-primary/10 hover:text-primary"
                        onClick={generateSubtasksAI}
                        disabled={subAiLoading || !draft.title.trim()}
                      >
                        <Sparkles className="h-3 w-3" /> {subAiLoading ? "Thinking…" : "AI: Break into steps"}
                      </Button>
                      <SubtaskAddMenu
                        size="sm"
                        onAddManual={() => setAddingSub(true)}
                        onAddWithAI={generateSubtasksAI}
                        aiLoading={subAiLoading}
                      />
                    </div>
                  }
                >
                  <div className="space-y-1">
                    {subtasks.map(s => {
                      const sectionMatch = s.title.match(/^##\s+(.+)$/);
                      if (sectionMatch) {
                        return (
                          <div key={s.id} className="group mt-2 flex items-center gap-2 border-b border-border/50 pb-1 pl-1 pt-1 first:mt-0">
                            <FolderTree className="h-3 w-3 shrink-0 text-primary/70" />
                            <span className="flex-1 truncate text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/70">
                              {sectionMatch[1]}
                            </span>
                            <Button variant="ghost" size="icon"
                              className="h-6 w-6 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                              onClick={() => deleteTask(s.id)} aria-label="Delete section">
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        );
                      }
                      return (
                        <div key={s.id} className="group flex items-center gap-2 rounded-lg border border-border/40 bg-muted/20 px-2 py-1.5">
                          <Checkbox checked={s.done} onCheckedChange={() => toggleTask(s.id)} />
                          <span className={cn("flex-1 truncate text-sm", s.done && "text-muted-foreground line-through")}>{s.title}</span>
                          <Button variant="ghost" size="icon"
                            className="h-6 w-6 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                            onClick={() => deleteTask(s.id)} aria-label="Delete subtask">
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      );
                    })}
                    {addingSub && (
                      <Input
                        autoFocus value={subDraft}
                        onChange={(e) => setSubDraft(e.target.value)}
                        placeholder="Step…"
                        className="h-8 text-sm"
                        onBlur={() => { if (!subDraft.trim()) setAddingSub(false); }}
                        onKeyDown={async (e) => {
                          if (e.key === "Enter" && subDraft.trim()) { await addSubtaskNow(subDraft); }
                          else if (e.key === "Escape") { setSubDraft(""); setAddingSub(false); }
                        }}
                      />
                    )}
                    {!addingSub && (
                      <button type="button" onClick={() => setAddingSub(true)}
                        className="flex w-full items-center gap-2 rounded-lg border border-dashed border-border/60 px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-muted/30 hover:text-foreground">
                        <ListTree className="h-3.5 w-3.5" /> Add step
                      </button>
                    )}
                  </div>
                </CardHeader>
              </Card>

              {/* Notes — always visible */}
              <Card>
                <CardHeader
                  icon={<AlignLeft className="h-3.5 w-3.5" />}
                  title="Notes"
                  count={draft.notes && draft.notes.trim().length > 0
                    ? `${draft.notes.trim().split(/\s+/).filter(Boolean).length} words` : undefined}
                  right={<NoteAIButton title={draft.title} body={draft.notes ?? ""} onApply={(next) => set("notes", next)} />}
                >
                  <div className="rounded-lg border border-border/40 bg-background/30 p-2">
                    <BlockEditor
                      body={draft.notes ?? ""}
                      onChange={(markdown) => set("notes", markdown)}
                      placeholder="Capture thoughts, links, and context…"
                      showFooter={false}
                      minHeight="min-h-[100px]"
                    />
                  </div>
                </CardHeader>
              </Card>

              {/* Attachments & Links */}
              <Card>
                <CardHeader icon={<Paperclip className="h-3.5 w-3.5" />} title="Attachments & Links">
                  <AttachmentsField
                    scope="task"
                    ownerId={draft.id}
                    value={draft.attachments}
                    onChange={(next) => {
                      set("attachments", next);
                      void updateTask(draft.id, { attachments: next });
                    }}
                  />
                  <div className="mt-3 border-t border-border/40 pt-3">
                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Linked notes</p>
                    <LinkedNotesPanel entityType="task" entityId={draft.id} contextTitle={draft.title} compact />
                  </div>
                </CardHeader>
              </Card>

              {/* Activity — collapsible */}
              <Collapsible>
                <Card>
                  <CollapsibleTrigger className="group flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left">
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      <History className="h-3.5 w-3.5" /> Activity
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="border-t border-border/40 px-3 py-2.5">
                    <ul className="space-y-1.5 text-xs text-muted-foreground">
                      {(draft as any).createdAt && (
                        <li className="flex items-center justify-between gap-2"><span>Created</span><span>{format(new Date((draft as any).createdAt), "MMM d, yyyy · p")}</span></li>
                      )}
                      {(draft as any).updatedAt && (
                        <li className="flex items-center justify-between gap-2"><span>Last modified</span><span>{format(new Date((draft as any).updatedAt), "MMM d, yyyy · p")}</span></li>
                      )}
                      {draft.done && (
                        <li className="flex items-center justify-between gap-2"><span>Completed</span><span>{(draft as any).completedAt ? format(new Date((draft as any).completedAt), "MMM d, yyyy · p") : "Today"}</span></li>
                      )}
                      {!(draft as any).createdAt && !(draft as any).updatedAt && (
                        <li className="italic">No activity recorded yet.</li>
                      )}
                    </ul>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            </div>

            {/* ─────────── Right column: context & assist ─────────── */}
            <div className={cn("min-w-0 space-y-4", sideHidden && "lg:hidden")}>
              <FlowContextCard draft={draft} set={set} />

              {/* AI Assistant card */}
              <Card>
                <CardHeader icon={<Sparkles className="h-3.5 w-3.5 text-primary" />} title="AI Assistant">
                  <p className="-mt-1 mb-2 text-[11px] text-muted-foreground">Let AI help you refine and organize.</p>
                  <div className="space-y-1.5">
                    <AIQuickAction
                      icon={<ListChecks className="h-3.5 w-3.5" />}
                      label="Break into steps"
                      busy={subAiLoading}
                      onClick={generateSubtasksAI}
                    />
                    <AIQuickAction
                      icon={<Hash className="h-3.5 w-3.5" />}
                      label="Auto-detect area & project"
                      busy={autoBusy}
                      onClick={runAutoDetect}
                    />
                    <AIQuickAction
                      icon={<Tag className="h-3.5 w-3.5" />}
                      label="Suggest tags"
                      onClick={() => {
                        if (parsed?.tags?.length) {
                          const merged = Array.from(new Set([...(draft.tags ?? []), ...parsed.tags]));
                          set("tags", merged);
                          toast.success(`Added ${parsed.tags.length} tag${parsed.tags.length === 1 ? "" : "s"}`);
                        } else {
                          toast("No obvious tags — try editing the title.");
                        }
                      }}
                    />
                    <AIQuickAction
                      icon={<Wand2 className="h-3.5 w-3.5" />}
                      label="Rewrite from NLP"
                      onClick={applyNlp}
                    />
                  </div>
                </CardHeader>
              </Card>

              {/* Tags */}
              <Card>
                <CardHeader icon={<Tag className="h-3.5 w-3.5" />} title="Tags">
                  <TagPicker value={draft.tags ?? []} onChange={(next) => set("tags", next)} />
                </CardHeader>
              </Card>

              {/* Project / Goal / Person */}
              <Card>
                <CardHeader icon={<FolderKanban className="h-3.5 w-3.5" />} title="Links">
                  <div className="grid grid-cols-1 gap-3">
                    <ProjectGoalLinks draft={draft} set={set} />
                  </div>
                </CardHeader>
              </Card>

              {/* Advanced — schedule + dates */}
              <Collapsible>
                <Card>
                  <CollapsibleTrigger className="group flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left">
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      <CalendarIcon className="h-3.5 w-3.5" /> Advanced schedule
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-3 border-t border-border/40 px-3 py-3">
                    <div className="grid grid-cols-2 gap-3">
                      <Field icon={CalendarIcon} label="Start date">
                        <Input type="date" value={draft.startDate ?? ""} onChange={(e) => set("startDate", e.target.value || undefined)} />
                      </Field>
                      <Field icon={CalendarIcon} label="End date">
                        <Input type="date" value={draft.endDate ?? ""} min={draft.startDate || undefined} onChange={(e) => set("endDate", e.target.value || undefined)} />
                      </Field>
                    </div>
                    {draft.recurrenceType && draft.recurrenceType !== "none" && (
                      <Field icon={Repeat} label="Every (interval)">
                        <Input type="number" min={1} value={draft.recurrenceInterval ?? 1}
                          onChange={e => set("recurrenceInterval", Number(e.target.value) || 1)} />
                      </Field>
                    )}
                    <Field icon={Zap} label="Energy">
                      <Select value={draft.energy ?? "none"} onValueChange={v => set("energy", v === "none" ? undefined : v as Energy)}>
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent className="z-[60]" position="popper" sideOffset={6} collisionPadding={12}>
                          <SelectItem value="none">—</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            </div>
          </div>
        </div>

        {/* Sticky footer */}
        <div className="shrink-0 border-t border-border/60 bg-background/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:px-5">
          {/* Mobile: primary actions in a tight 2-col grid, Delete centered underneath */}
          <div className="flex flex-col gap-2 sm:hidden">
            {onUnschedule && (
              <Button
                variant="outline"
                size="sm"
                className="h-11 w-full"
                onClick={async () => { await onUnschedule(); onOpenChange(false); }}
              >
                {unscheduleLabel}
              </Button>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" className="h-11 w-full" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button size="sm" className="h-11 w-full" onClick={save}>Save</Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mx-auto h-9 gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={async () => { await deleteTask(draft.id); toast("This can wait."); onOpenChange(false); }}
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </Button>
          </div>
          {/* Desktop: original inline layout */}
          <div className="hidden flex-row items-center justify-between gap-2 sm:flex">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={async () => { await deleteTask(draft.id); toast("This can wait."); onOpenChange(false); }}
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </Button>
            <div className="flex flex-nowrap gap-2">
              {onUnschedule && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => { await onUnschedule(); onOpenChange(false); }}
                >
                  {unscheduleLabel}
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button size="sm" onClick={save}>Save</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    <PomodoroDialog
      open={timerOpen}
      onOpenChange={setTimerOpen}
      title={draft.title}
      subtitle={draft.estMinutes ? `Estimated ${draft.estMinutes} min` : undefined}
    />
    </>
  );
}

/* ─────────── helper components ─────────── */

const PRIORITY_TONE: Record<string, string> = {
  low: "text-muted-foreground",
  medium: "text-amber-500",
  high: "text-rose-500",
};

function PillPopover({
  icon, label, active, onClear, children,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClear?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "group inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[12px] transition-colors sm:h-7 sm:px-2.5",
            active
              ? "border-primary/40 bg-primary/10 text-foreground hover:bg-primary/15"
              : "border-border/60 bg-muted/30 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          )}
        >
          {icon}
          <span className="max-w-[10rem] truncate">{label}</span>
          {onClear && (
            <span
              role="button"
              tabIndex={0}
              aria-label="Clear"
              onClick={(e) => { e.stopPropagation(); onClear(); }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); onClear(); } }}
              className="ml-0.5 rounded-full opacity-60 hover:opacity-100"
            >
              <X className="h-3 w-3" />
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="z-[60] w-auto p-0" align="start" collisionPadding={12}>
        {children}
      </PopoverContent>
    </Popover>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("min-w-0 overflow-hidden rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm", className)}>
      {children}
    </section>
  );
}

function CardHeader({
  icon, title, count, right, children,
}: {
  icon: React.ReactNode;
  title: string;
  count?: string;
  right?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="p-3.5">
      <header className="mb-2.5 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          <span className="text-foreground/80">{icon}</span>
          {title}
          {count && (
            <span className="ml-1 rounded-full bg-muted px-1.5 py-px text-[10px] font-normal normal-case tracking-normal text-muted-foreground">
              {count}
            </span>
          )}
        </h3>
        {right}
      </header>
      {children}
    </div>
  );
}

function AIQuickAction({
  icon, label, onClick, busy,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void | Promise<void>;
  busy?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-lg border border-border/50 bg-background/50 px-2.5 py-2 text-left text-[13px] transition-colors hover:border-primary/40 hover:bg-primary/5 disabled:opacity-60"
    >
      <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/10 text-primary">{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {busy && <Sparkles className="h-3.5 w-3.5 animate-pulse text-primary" />}
    </button>
  );
}

function FlowContextCard({
  draft, set,
}: {
  draft: Task;
  set: <K extends keyof Task>(k: K, v: Task[K]) => void;
}) {
  const { atmosphere } = useAtmosphere();
  const bestTime = (() => {
    if (draft.startTime) {
      const h = parseInt(draft.startTime.slice(0, 2), 10);
      if (h < 12) return "Morning";
      if (h < 17) return "Afternoon";
      if (h < 21) return "Evening";
      return "Night";
    }
    if (draft.energy === "high") return "Morning";
    if (draft.energy === "low") return "Evening";
    return "Afternoon";
  })();
  const energyLabel = draft.energy
    ? draft.energy.charAt(0).toUpperCase() + draft.energy.slice(1)
    : "Moderate";
  const swatch = atmosphere?.palette?.[0] ?? "hsl(var(--primary))";

  return (
    <Card className="overflow-hidden">
      <div
        className="px-3.5 pt-3.5"
        style={{
          backgroundImage: `linear-gradient(135deg, ${swatch}33, transparent 65%)`,
        }}
      >
        <header className="mb-2.5 flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: swatch }} />
            Flow Context
          </h3>
        </header>
      </div>
      <div className="space-y-2.5 px-3.5 pb-3.5">
        <Row label="Atmosphere" value={atmosphere?.name ?? "Sage Sanctuary"} swatch={swatch} />
        <Row
          label="Energy level"
          value={
            <Select value={draft.energy ?? "medium"} onValueChange={v => set("energy", v as Energy)}>
              <SelectTrigger className="h-7 w-[120px] border-0 bg-transparent px-1 text-[13px] font-medium hover:bg-muted/40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[60]" position="popper" sideOffset={6}>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Moderate</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          }
        />
        <Row label="Best time" value={bestTime} />
      </div>
    </Card>
  );
}

function Row({ label, value, swatch }: { label: string; value: React.ReactNode; swatch?: string }) {
  return (
    <div className="flex items-center justify-between gap-2 text-[13px]">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        {swatch && <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: swatch }} />}
        {label}
      </span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

/* ─────────── time-of-day & project pills ─────────── */

const TIME_OF_DAY: Array<{ key: "morning" | "afternoon" | "evening" | "night"; label: string; time: string; icon: React.ComponentType<{ className?: string }> }> = [
  { key: "morning", label: "Morning", time: "09:00", icon: Sunrise },
  { key: "afternoon", label: "Afternoon", time: "13:00", icon: Sun },
  { key: "evening", label: "Evening", time: "18:00", icon: Sunset },
  { key: "night", label: "Night", time: "21:00", icon: Moon },
];

function bucketForTime(t?: string): typeof TIME_OF_DAY[number] | null {
  if (!t) return null;
  const h = parseInt(t.slice(0, 2), 10);
  if (Number.isNaN(h)) return null;
  if (h < 12) return TIME_OF_DAY[0];
  if (h < 17) return TIME_OF_DAY[1];
  if (h < 21) return TIME_OF_DAY[2];
  return TIME_OF_DAY[3];
}

function TimeOfDayPill({
  startTime, onSelect, onClear,
}: {
  startTime?: string;
  onSelect: (time: string) => void;
  onClear: () => void;
}) {
  const bucket = bucketForTime(startTime);
  const Icon = bucket?.icon ?? Sun;
  return (
    <PillPopover
      icon={<Icon className="h-3.5 w-3.5" />}
      label={bucket?.label ?? "Time of day"}
      active={!!bucket}
      onClear={bucket ? onClear : undefined}
    >
      <div className="w-44 p-1">
        {TIME_OF_DAY.map(t => {
          const TIcon = t.icon;
          const active = bucket?.key === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => onSelect(t.time)}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted",
                active && "bg-muted"
              )}
            >
              <TIcon className="h-3.5 w-3.5 text-primary/80" />
              <span className="flex-1 text-left">{t.label}</span>
              <span className="text-[11px] text-muted-foreground">{t.time}</span>
            </button>
          );
        })}
      </div>
    </PillPopover>
  );
}

function ProjectPill({
  value, projects, onSelect, onClear,
}: {
  value?: string;
  projects: Array<{ id: string; name: string }>;
  onSelect: (id: string) => void;
  onClear: () => void;
}) {
  const current = projects.find(p => p.id === value);
  return (
    <PillPopover
      icon={<FolderKanban className="h-3.5 w-3.5" />}
      label={current?.name ?? "Project"}
      active={!!current}
      onClear={current ? onClear : undefined}
    >
      <div className="w-56 max-h-72 overflow-y-auto p-1">
        {projects.length === 0 ? (
          <div className="px-2 py-2 text-xs text-muted-foreground">No projects yet.</div>
        ) : projects.map(p => (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelect(p.id)}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted",
              value === p.id && "bg-muted"
            )}
          >
            <FolderKanban className="h-3.5 w-3.5 text-primary/70" />
            <span className="truncate">{p.name}</span>
          </button>
        ))}
      </div>
    </PillPopover>
  );
}