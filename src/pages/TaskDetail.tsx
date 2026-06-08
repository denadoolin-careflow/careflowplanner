import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MoreVertical, Calendar as CalIcon, Clock, Repeat, Flag, Tag as TagIcon, Layers, FolderKanban, ListTree, StickyNote, Paperclip, Activity, ChevronDown, ChevronUp, Zap, Timer as TimerIcon, Mic, Trash2, Copy, FolderInput, Check, Target, Pin, CalendarDays } from "lucide-react";
import { useStore } from "@/lib/store";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { TagPicker } from "@/components/tags/TagPicker";
import { TagChip } from "@/components/tags/TagChip";
import { AttachmentsField } from "@/components/attachments/AttachmentsField";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import type { Area, Energy, Priority, RecurrenceType, Task } from "@/lib/types";
import { toast } from "sonner";
import { useAstrologyEnabled } from "@/lib/astrology-prefs";
import { moonPhaseFor } from "@/lib/moon-phase";
import { VoiceCaptureDialog } from "@/components/voice/VoiceCaptureDialog";
import { haptics } from "@/lib/haptics";
import { BigCard, SmallTile, SectionLabel } from "@/components/tasks/TaskSettingsBits";
import { copyToClipboard, formatTaskForCopy } from "@/lib/clipboard";

const AREAS: Area[] = ["Personal","Family","Kids","Caregiving","Home","Meals","Appointments","Money","Creative Projects","Holidays & Birthdays"];
const PRIORITY_OPTS: { id: Priority; label: string; dots: number; tone: string }[] = [
  { id: "low", label: "Low", dots: 0, tone: "bg-muted-foreground/40" },
  { id: "medium", label: "Medium", dots: 1, tone: "bg-amber-500" },
  { id: "high", label: "High", dots: 2, tone: "bg-rose-500" },
];
const ENERGY_OPTS: Energy[] = ["low","medium","high"];
const TIME_OPTS: { label: string; mins: number }[] = [
  { label: "5m", mins: 5 }, { label: "15m", mins: 15 }, { label: "30m", mins: 30 }, { label: "1h", mins: 60 },
];
const RECUR_OPTS: { id: RecurrenceType; label: string }[] = [
  { id: "none", label: "Does not repeat" },
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
];

function CollapseCard({ icon: Icon, title, defaultOpen = false, badge, children }: { icon: any; title: string; defaultOpen?: boolean; badge?: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="cf-card overflow-hidden">
      <button type="button" onClick={() => setOpen(o => !o)} className="flex w-full items-center gap-3 px-4 py-3.5">
        <div className="cf-icon-tile shrink-0" style={{ width: 34, height: 34 }}><Icon className="h-4 w-4" /></div>
        <span className="text-[14.5px] font-medium">{title}</span>
        <div className="ml-auto flex items-center gap-2 text-[12.5px] text-muted-foreground">
          {badge}
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>
      {open && <div className="border-t border-border/60 p-4">{children}</div>}
    </section>
  );
}

export default function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { state, updateTask, toggleTask, deleteTask, addTask } = useStore();
  const task = useMemo<Task | undefined>(() => state.tasks.find(t => t.id === id), [state.tasks, id]);
  const [astroOn] = useAstrologyEnabled();
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [tagSheet, setTagSheet] = useState(false);
  const [notes, setNotes] = useState(task?.notes ?? "");
  const [lastEdited, setLastEdited] = useState<Date | null>(null);
  const notesTimer = useRef<number | null>(null);
  const [subDraft, setSubDraft] = useState("");
  const [justCompleted, setJustCompleted] = useState(false);

  useEffect(() => { setNotes(task?.notes ?? ""); }, [task?.id]);

  if (!task) {
    return (
      <div className="min-h-screen p-6 text-center">
        <p className="text-sm text-muted-foreground">Task not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>Back</Button>
      </div>
    );
  }

  const proj = task.projectId ? state.projects?.find(p => p.id === task.projectId) : undefined;
  const goal = task.goalId ? state.goals?.find(g => g.id === task.goalId) : undefined;
  const subtasks = state.tasks.filter(t => t.parentTaskId === task.id);
  const doneSubs = subtasks.filter(s => s.done).length;
  const moon = (astroOn && task.dueDate) ? moonPhaseFor(parseISO(task.dueDate)) : null;

  const patch = (p: Partial<Task>) => updateTask(task.id, p);

  const handleToggleComplete = () => {
    const willComplete = !task.done;
    if (willComplete) {
      haptics.success?.();
      setJustCompleted(true);
      window.setTimeout(() => setJustCompleted(false), 900);
    } else {
      haptics.tap?.();
    }
    void toggleTask(task.id);
  };

  const onNotesChange = (v: string) => {
    setNotes(v);
    if (notesTimer.current) window.clearTimeout(notesTimer.current);
    notesTimer.current = window.setTimeout(() => {
      void patch({ notes: v });
      setLastEdited(new Date());
    }, 500);
  };

  const addSub = async () => {
    const t = subDraft.trim(); if (!t) return;
    await addTask({ title: t, parentTaskId: task.id, area: task.area, priority: "medium" } as any);
    setSubDraft("");
  };

  return (
    <div className="min-h-screen bg-background pb-[100px]">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/85 px-3 pt-3 pb-2 backdrop-blur">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="grid h-10 w-10 place-items-center rounded-full bg-card border border-border/60" aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
          <CareyButton
            label="Carey"
            contextType="task"
            contextId={task.id}
            context={{
              title: task.title, area: task.area, priority: task.priority,
              dueDate: task.dueDate, estMinutes: task.estMinutes, notes: task.notes,
              subtasks: subtasks.map(s => ({ title: s.title, done: s.done })),
              project: proj?.name,
            }}
            actions={[
              { label: "Break into subtasks", prompt: `Break this task into 3-6 concrete subtasks. Be specific and actionable.\n\nTask: ${task.title}\nNotes: ${task.notes ?? ""}` },
              { label: "Estimate effort & time", prompt: `Estimate effort (low/medium/high) and realistic minutes for this task. Briefly explain.\n\nTask: ${task.title}\nNotes: ${task.notes ?? ""}` },
              { label: "What's blocking me?", prompt: `What might be blocking me on this task? Suggest one tiny first step I can do in under 5 minutes.\n\nTask: ${task.title}\nNotes: ${task.notes ?? ""}` },
              { label: "Can I delegate or drop this?", prompt: `Given my full load, help me decide: do, delegate, defer, or drop this task? Be honest.\n\nTask: ${task.title}\nNotes: ${task.notes ?? ""}` },
            ]}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="grid h-10 w-10 place-items-center rounded-full bg-card border border-border/60" aria-label="More">
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => { void addTask({ ...task, id: undefined as any, title: `${task.title} (copy)`, createdAt: undefined as any } as any); toast.success("Duplicated"); }}><Copy className="mr-2 h-4 w-4" /> Duplicate</DropdownMenuItem>
              <DropdownMenuItem onClick={async () => {
                const text = formatTaskForCopy({
                  title: task.title, done: task.done, area: task.area,
                  projectName: proj?.name, dueDate: task.dueDate, priority: task.priority,
                  tags: task.tags, notes: task.notes,
                  subtasks: subtasks.map(s => ({ title: s.title, done: s.done })),
                });
                const ok = await copyToClipboard(text);
                if (ok) toast.success("Copied to clipboard"); else toast.error("Copy failed");
              }}><Copy className="mr-2 h-4 w-4" /> Copy all</DropdownMenuItem>
              <DropdownMenuItem onClick={() => patch({ inbox: false })}><FolderInput className="mr-2 h-4 w-4" /> Remove from inbox</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={async () => { await deleteTask(task.id); navigate(-1); }}><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl space-y-4 px-4">
        {/* Title */}
        <div className="relative overflow-hidden flex items-start gap-3 rounded-2xl px-1 pt-2">
          {justCompleted && (
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 animate-task-sweep bg-gradient-to-r from-transparent via-primary/40 to-emerald-400/50 blur-md"
            />
          )}
          <button
            onClick={handleToggleComplete}
            className={cn("mt-2 shrink-0 transition-transform", justCompleted && "scale-110")}
            aria-label="Toggle complete"
          >
            <Checkbox checked={task.done} className="h-6 w-6 rounded-full border-2" />
          </button>
          <h1 className={cn("font-display text-[26px] leading-tight", task.done && "line-through text-muted-foreground")}>{task.title}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2 px-1">
          <span className="text-[12.5px] text-muted-foreground">{task.area}</span>
          {task.dueDate && <span className="text-[12.5px] text-amber-600">· {format(parseISO(task.dueDate), "MMM d")}</span>}
          {task.priority !== "low" && (
            <span className="flex items-center gap-0.5">
              {Array.from({ length: PRIORITY_OPTS.find(p => p.id === task.priority)?.dots ?? 0 }).map((_, i) => (
                <span key={i} className={cn("h-1.5 w-1.5 rounded-full", task.priority === "high" ? "bg-rose-500" : "bg-amber-500")} />
              ))}
            </span>
          )}
          {moon && <span className="text-[12.5px] text-muted-foreground">{moon.emoji} {moon.label}</span>}
        </div>

        {/* CONTEXT */}
        <SectionLabel icon={<FolderKanban className="h-3.5 w-3.5" />} label="Context" />
        <div className="grid grid-cols-2 gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <BigCard tone="primary" icon={<FolderKanban className="h-5 w-5" />} label="Project" value={proj?.name ?? "None"} />
            </PopoverTrigger>
            <PopoverContent align="start" className="max-h-72 w-64 overflow-auto p-1">
              <button onClick={() => patch({ projectId: undefined })} className="block w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted">None</button>
              {(state.projects ?? []).map(p => (
                <button key={p.id} onClick={() => patch({ projectId: p.id })} className="block w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted">{p.name}</button>
              ))}
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <BigCard tone="emerald" icon={<Target className="h-5 w-5" />} label="Goal" value={goal?.title ?? "None"}>
                {goal && (
                  <div className="mt-2 space-y-1">
                    <p className="text-[11px] font-medium text-emerald-600">{goal.progress}% complete</p>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-emerald-500/15">
                      <div className="h-full bg-emerald-500/80" style={{ width: `${goal.progress}%` }} />
                    </div>
                  </div>
                )}
              </BigCard>
            </PopoverTrigger>
            <PopoverContent align="start" className="max-h-72 w-64 overflow-auto p-1">
              <button onClick={() => patch({ goalId: undefined } as any)} className="block w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted">None</button>
              {(state.goals ?? []).map(g => (
                <button key={g.id} onClick={() => patch({ goalId: g.id } as any)} className="block w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted">{g.title}</button>
              ))}
            </PopoverContent>
          </Popover>
        </div>

        {/* SCHEDULING */}
        <SectionLabel icon={<CalendarDays className="h-3.5 w-3.5" />} label="Scheduling" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <Popover>
            <PopoverTrigger asChild>
              <BigCard tone="primary" icon={<CalIcon className="h-5 w-5" />} label="Date" value={task.dueDate ? format(parseISO(task.dueDate), "EEE, MMM d") : "None"} />
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-0">
              <Calendar mode="single" selected={task.dueDate ? parseISO(task.dueDate) : undefined}
                onSelect={(d) => patch({ dueDate: d ? format(d, "yyyy-MM-dd") : undefined })}
                initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <BigCard tone="indigo" icon={<Clock className="h-5 w-5" />} label="Time" value={task.startTime ?? "Any time"} />
            </PopoverTrigger>
            <PopoverContent align="start" className="w-56 p-3">
              <Input type="time" defaultValue={task.startTime ?? ""} onBlur={(e) => patch({ startTime: e.target.value || undefined })} />
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <BigCard tone="teal" icon={<Repeat className="h-5 w-5" />} label="Repeat" value={RECUR_OPTS.find(r => r.id === (task.recurrenceType ?? "none"))?.label ?? "Never"} />
            </PopoverTrigger>
            <PopoverContent align="start" className="w-56 p-1">
              {RECUR_OPTS.map(r => (
                <button key={r.id} onClick={() => patch({ recurrenceType: r.id })} className="block w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted">{r.label}</button>
              ))}
            </PopoverContent>
          </Popover>
        </div>

        {/* ORGANIZATION */}
        <SectionLabel icon={<TagIcon className="h-3.5 w-3.5" />} label="Organization" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <Sheet open={tagSheet} onOpenChange={setTagSheet}>
            <SheetTrigger asChild>
              <BigCard
                tone="violet"
                icon={<TagIcon className="h-5 w-5" />}
                label="Tags"
                value={(task.tags?.length ?? 0) > 0 ? `${task.tags!.length} tag${task.tags!.length > 1 ? "s" : ""}` : "None"}
              >
                {(task.tags?.length ?? 0) > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {(task.tags ?? []).slice(0, 3).map(t => <TagChip key={t} name={t} subtle size="sm" />)}
                  </div>
                )}
              </BigCard>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl">
              <SheetHeader><SheetTitle>Tags</SheetTitle></SheetHeader>
              <div className="mt-4">
                <TagPicker value={task.tags ?? []} onChange={(tags) => patch({ tags })} />
              </div>
            </SheetContent>
          </Sheet>
          <Popover>
            <PopoverTrigger asChild>
              <BigCard tone="amber" icon={<Flag className="h-5 w-5" />} label="Priority" value={PRIORITY_OPTS.find(p => p.id === task.priority)?.label ?? "Low"}>
                {PRIORITY_OPTS.find(p => p.id === task.priority)!.dots > 0 && (
                  <div className="mt-2 flex gap-0.5">
                    {Array.from({ length: PRIORITY_OPTS.find(p => p.id === task.priority)!.dots }).map((_, i) => (
                      <span key={i} className={cn("h-1.5 w-1.5 rounded-full", task.priority === "high" ? "bg-rose-500" : "bg-amber-500")} />
                    ))}
                  </div>
                )}
              </BigCard>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-48 p-1">
              {PRIORITY_OPTS.map(p => (
                <button key={p.id} onClick={() => patch({ priority: p.id })} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted">
                  <span className="flex items-center gap-0.5">
                    {Array.from({ length: p.dots }).map((_, i) => <span key={i} className={cn("h-1.5 w-1.5 rounded-full", p.tone)} />)}
                    {p.dots === 0 && <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />}
                  </span>
                  {p.label}
                </button>
              ))}
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <BigCard tone="pink" icon={<Layers className="h-5 w-5" />} label="Area" value={task.area} />
            </PopoverTrigger>
            <PopoverContent align="start" className="max-h-72 w-48 overflow-auto p-1">
              {AREAS.map(a => (
                <button key={a} onClick={() => patch({ area: a })} className="block w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted">{a}</button>
              ))}
            </PopoverContent>
          </Popover>
        </div>

        {/* PREMIUM: Energy + Time estimate chips */}
        <SectionLabel icon={<Zap className="h-3.5 w-3.5" />} label="Focus" />
        <section className="cf-card p-4 space-y-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-2 flex items-center gap-1.5"><Zap className="h-3 w-3" /> Energy</p>
            <div className="flex gap-2">
              {ENERGY_OPTS.map(e => (
                <button key={e} onClick={() => patch({ energy: task.energy === e ? undefined : e })}
                  className={cn("cf-chip capitalize", task.energy === e && "cf-chip-active")}>{e}</button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-2 flex items-center gap-1.5"><TimerIcon className="h-3 w-3" /> Time estimate</p>
            <div className="flex flex-wrap gap-2">
              {TIME_OPTS.map(t => (
                <button key={t.label} onClick={() => patch({ estMinutes: task.estMinutes === t.mins ? undefined : t.mins })}
                  className={cn("cf-chip", task.estMinutes === t.mins && "cf-chip-active")}>{t.label}</button>
              ))}
            </div>
          </div>
          <Button variant="outline" size="sm" className="rounded-full gap-1.5" onClick={() => setVoiceOpen(true)}>
            <Mic className="h-3.5 w-3.5" /> Voice capture
          </Button>
          <VoiceCaptureDialog open={voiceOpen} onOpenChange={setVoiceOpen} />
        </section>

        {/* UTILITIES */}
        <SectionLabel icon={<TimerIcon className="h-3.5 w-3.5" />} label="Utilities" />
        <div className="grid grid-cols-3 gap-3">
          <SmallTile tone="teal" icon={<TimerIcon className="h-4 w-4" />} label="Focus timer"
            onClick={() => navigate(`/pomodoro?task=${task.id}`)} />
          <SmallTile tone="indigo" icon={<Copy className="h-4 w-4" />} label="Duplicate"
            onClick={() => { void addTask({ ...task, id: undefined as any, title: `${task.title} (copy)`, createdAt: undefined as any } as any); toast.success("Duplicated"); }} />
          <SmallTile tone="pink" icon={<Pin className="h-4 w-4" />} label={task.isTopThree ? "Unpin" : "Pin task"}
            onClick={() => patch({ isTopThree: !task.isTopThree } as any)} />
        </div>

        {/* Notes */}
        <CollapseCard icon={StickyNote} title="Notes" defaultOpen={!!task.notes} badge={lastEdited ? `Edited ${formatDistanceToNow(lastEdited, { addSuffix: true })}` : undefined}>
          <Textarea value={notes} onChange={(e) => onNotesChange(e.target.value)} rows={6} placeholder="Add notes…" className="resize-none rounded-xl" />
        </CollapseCard>

        {/* Attachments */}
        <CollapseCard icon={Paperclip} title="Attachments" badge={String((task.attachments ?? []).length)}>
          <AttachmentsField scope="task" ownerId={task.id} value={task.attachments} onChange={(next) => patch({ attachments: next })} compact />
        </CollapseCard>

        {/* Subtasks */}
        <CollapseCard icon={ListTree} title="Subtasks" defaultOpen={subtasks.length > 0} badge={`${doneSubs}/${subtasks.length}`}>
          <div className="space-y-1.5">
            {subtasks.map(s => (
              <div key={s.id} className="flex items-center gap-2 rounded-lg px-1 py-1">
                <Checkbox checked={s.done} onCheckedChange={() => toggleTask(s.id)} />
                <button onClick={() => navigate(`/tasks/${s.id}`)} className={cn("flex-1 text-left text-sm", s.done && "line-through text-muted-foreground")}>{s.title}</button>
              </div>
            ))}
            <div className="flex items-center gap-2 pt-1">
              <Input value={subDraft} onChange={(e) => setSubDraft(e.target.value)} placeholder="Add a subtask…" onKeyDown={(e) => { if (e.key === "Enter") addSub(); }} className="h-9 rounded-xl" />
              <Button size="sm" onClick={addSub} disabled={!subDraft.trim()} className="rounded-full">Add</Button>
            </div>
          </div>
        </CollapseCard>

        {/* Activity */}
        <CollapseCard icon={Activity} title="Activity">
          <ul className="space-y-2 text-[13px] text-muted-foreground">
            <li>Created {format(parseISO(task.createdAt), "PPp")}</li>
            {task.dueDate && <li>Due {format(parseISO(task.dueDate), "PP")}</li>}
            {task.lastCompletedAt && <li>Last completed {format(parseISO(task.lastCompletedAt), "PPp")}</li>}
            {task.done && <li>Marked complete</li>}
          </ul>
        </CollapseCard>

        {/* DANGER ZONE */}
        <div className="mt-6">
          <div className="mb-2 flex items-center gap-1.5 px-1 text-[11px] font-semibold uppercase tracking-wider text-rose-500">
            <Trash2 className="h-3 w-3" /> Danger zone
          </div>
          <button
            onClick={async () => {
              if (!window.confirm("Delete this task?")) return;
              await deleteTask(task.id);
              navigate(-1);
            }}
            className="flex h-14 w-full items-center gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/8 px-4 text-rose-500 active:scale-[0.99]"
          >
            <span className="grid h-9 w-9 place-items-center rounded-full bg-rose-500/15">
              <Trash2 className="h-4 w-4" />
            </span>
            <span className="flex-1 text-left text-[15px] font-semibold">Delete task</span>
          </button>
        </div>
      </div>

      {/* Sticky bottom bar */}
      <div className="fixed bottom-0 inset-x-0 z-30 border-t border-border/60 bg-background/95 backdrop-blur p-3">
        <div className="mx-auto flex max-w-2xl items-center gap-2">
          <Button variant="outline" className="flex-1 rounded-full gap-1.5" onClick={() => navigate(`/pomodoro?task=${task.id}`)}>
            <TimerIcon className="h-4 w-4" /> Focus
          </Button>
          <Button className="flex-[1.4] rounded-full gap-1.5" onClick={async () => { const willComplete = !task.done; if (willComplete) { haptics.success?.(); setJustCompleted(true); window.setTimeout(() => setJustCompleted(false), 900); } await toggleTask(task.id); toast.success(task.done ? "Reopened" : "Completed"); if (willComplete) window.setTimeout(() => navigate(-1), 700); }}>
            <Check className="h-4 w-4" /> {task.done ? "Reopen" : "Complete"}
          </Button>
        </div>
      </div>
    </div>
  );
}