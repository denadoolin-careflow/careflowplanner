import { useMemo, useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Task } from "@/lib/types";
import { useStore } from "@/lib/store";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";
import { toast } from "sonner";
import { format, parseISO, isToday, isTomorrow, addDays } from "date-fns";
import {
  X, Folder, Target, CalendarDays, Repeat as RepeatIcon, Tag, Flag,
  StickyNote, Paperclip, Timer, Copy, Pin, Trash2, ChevronRight, Zap,
  Search, Check,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { BigCard, SmallTile, SectionLabel } from "@/components/tasks/TaskSettingsBits";

type Props = {
  task: Task;
  open: boolean;
  onOpenChange: (o: boolean) => void;
};

type PickerKind = null | "project" | "goal" | "due" | "repeat" | "tags" | "priority";

const PRIORITY_LABEL: Record<Task["priority"], string> = { low: "Low", medium: "Medium", high: "High" };
const PRIORITY_DOTS: Record<Task["priority"], number> = { low: 0, medium: 1, high: 2 };
const REPEAT_LABEL: Record<string, string> = {
  none: "Never", daily: "Daily", weekly: "Weekly", monthly: "Monthly",
};

function dueDisplay(d?: string) {
  if (!d) return "None";
  try {
    const dt = parseISO(d);
    if (isToday(dt)) return "Today";
    if (isTomorrow(dt)) return "Tomorrow";
    return format(dt, "MMM d");
  } catch { return d; }
}

export function MobileTaskSheet({ task, open, onOpenChange }: Props) {
  const { state, updateTask, deleteTask, toggleTask, addTask } = useStore();
  const navigate = useNavigate();
  const [picker, setPicker] = useState<PickerKind>(null);

  const project = task.projectId ? state.projects?.find(p => p.id === task.projectId) : undefined;
  const goal = task.goalId ? state.goals?.find(g => g.id === task.goalId) : undefined;
  const attachmentCount = task.attachments?.length ?? 0;

  const patch = async (p: Partial<Task>, undoLabel?: string) => {
    haptics.snap?.();
    const prev: Partial<Task> = {};
    for (const k of Object.keys(p) as (keyof Task)[]) (prev as any)[k] = (task as any)[k];
    await updateTask(task.id, p);
    if (undoLabel) toast(undoLabel, {
      description: task.title,
      action: { label: "Undo", onClick: () => { haptics.tap?.(); void updateTask(task.id, prev); } },
    });
  };

  const handleDuplicate = async () => {
    haptics.tap?.();
    await addTask({
      title: task.title + " (copy)",
      notes: task.notes, dueDate: task.dueDate, startTime: task.startTime,
      priority: task.priority, area: task.area, tags: task.tags,
      energy: task.energy, estMinutes: task.estMinutes,
      projectId: task.projectId, goalId: task.goalId, inbox: task.inbox,
    } as any);
    toast("Duplicated", { description: task.title });
    onOpenChange(false);
  };

  const handlePin = async () => {
    await patch({ isTopThree: !task.isTopThree }, task.isTopThree ? "Unpinned" : "Pinned");
  };

  const handleDelete = async () => {
    const snapshot = { ...task } as any;
    haptics.delete?.();
    await deleteTask(task.id);
    onOpenChange(false);
    toast("Deleted", {
      description: task.title,
      action: { label: "Undo", onClick: () => { haptics.tap?.(); void addTask(snapshot); } },
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="cf-sheet max-h-[92vh] overflow-y-auto rounded-t-[28px] border-t border-border/60 bg-background p-0 pb-[max(env(safe-area-inset-bottom),16px)]"
      >
        {/* Grabber */}
        <div className="flex justify-center pt-2.5 pb-1">
          <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <div className="flex items-start gap-3 px-5 pt-3 pb-4">
          <button
            onClick={() => { haptics.tap?.(); void toggleTask(task.id); }}
            className="mt-0.5 shrink-0"
            aria-label="Toggle complete"
          >
            <Checkbox checked={task.done} className="h-6 w-6 rounded-full border-2" />
          </button>
          <h2 className={cn("flex-1 text-[22px] font-semibold leading-tight", task.done && "line-through text-muted-foreground")}>
            {task.title}
          </h2>
          <button
            onClick={() => onOpenChange(false)}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-muted/60 text-muted-foreground active:scale-95"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* CONTEXT */}
        <div className="px-5">
          <div className="grid grid-cols-2 gap-3">
            <BigCard
              tone="primary"
              icon={<Folder className="h-5 w-5" />}
              label="Project"
              value={project?.name ?? "None"}
              onClick={() => { haptics.tap?.(); setPicker("project"); }}
            />
            <BigCard
              tone="primary"
              icon={<Target className="h-5 w-5" />}
              label="Goal"
              value={goal?.title ?? "None"}
              onClick={() => { haptics.tap?.(); setPicker("goal"); }}
              extra={
                goal ? (
                  <div className="mt-2 space-y-1">
                    <p className="text-[11px] font-medium text-primary">{goal.progress}% complete</p>
                    <Progress value={goal.progress} className="h-1.5" />
                  </div>
                ) : null
              }
            />
          </div>
        </div>

        {/* SCHEDULING */}
        <SectionLabel icon={<CalendarDays className="h-3.5 w-3.5" />} label="Scheduling" />
        <div className="px-5">
          <div className="grid grid-cols-2 gap-3">
            <BigCard
              tone="primary"
              icon={<CalendarDays className="h-5 w-5" />}
              label="Due"
              value={dueDisplay(task.dueDate)}
              onClick={() => { haptics.tap?.(); setPicker("due"); }}
            />
            <BigCard
              tone="primary"
              icon={<RepeatIcon className="h-5 w-5" />}
              label="Repeat"
              value={REPEAT_LABEL[task.recurrenceType ?? "none"]}
              onClick={() => { haptics.tap?.(); setPicker("repeat"); }}
            />
          </div>
        </div>

        {/* ORGANIZATION */}
        <SectionLabel icon={<Tag className="h-3.5 w-3.5" />} label="Organization" />
        <div className="px-5">
          <div className="grid grid-cols-2 gap-3">
            <BigCard
              tone="violet"
              icon={<Tag className="h-5 w-5" />}
              label="Tags"
              value={(task.tags?.length ?? 0) > 0 ? `${task.tags!.length} tag${task.tags!.length>1?"s":""}` : "None"}
              onClick={() => { haptics.tap?.(); setPicker("tags"); }}
            />
            <BigCard
              tone="amber"
              icon={<Flag className="h-5 w-5" />}
              label="Priority"
              value={PRIORITY_LABEL[task.priority]}
              onClick={() => { haptics.tap?.(); setPicker("priority"); }}
              extra={
                PRIORITY_DOTS[task.priority] > 0 ? (
                  <div className="absolute right-12 top-1/2 -translate-y-1/2 flex gap-0.5">
                    {Array.from({ length: PRIORITY_DOTS[task.priority] }).map((_, i) => (
                      <span key={i} className={cn("h-1.5 w-1.5 rounded-full", task.priority === "high" ? "bg-rose-500" : "bg-amber-500")} />
                    ))}
                  </div>
                ) : null
              }
            />
          </div>
        </div>

        {/* CONTENT */}
        <SectionLabel icon={<StickyNote className="h-3.5 w-3.5" />} label="Content" />
        <div className="px-5">
          <div className="grid grid-cols-2 gap-3">
            <BigCard
              tone="indigo"
              icon={<StickyNote className="h-5 w-5" />}
              label="Notes"
              value={task.notes ? "Edit note" : "Add note"}
              valueTone="indigo"
              onClick={() => { onOpenChange(false); navigate(`/tasks/${task.id}`); }}
            />
            <BigCard
              tone="indigo"
              icon={<Paperclip className="h-5 w-5" />}
              label="Attachments"
              value={`${attachmentCount} file${attachmentCount === 1 ? "" : "s"}`}
              onClick={() => { onOpenChange(false); navigate(`/tasks/${task.id}`); }}
            />
          </div>
        </div>

        {/* UTILITIES */}
        <SectionLabel icon={<Zap className="h-3.5 w-3.5" />} label="Utilities" />
        <div className="px-5">
          <div className="grid grid-cols-3 gap-3">
            <SmallTile tone="teal" icon={<Timer className="h-4 w-4" />} label="Timer"
              onClick={() => { onOpenChange(false); navigate(`/tasks/${task.id}`); }} />
            <SmallTile tone="teal" icon={<Copy className="h-4 w-4" />} label="Duplicate" onClick={handleDuplicate} />
            <SmallTile tone="pink" icon={<Pin className="h-4 w-4" />} label={task.isTopThree ? "Unpin" : "Pin task"} onClick={handlePin} />
          </div>
        </div>

        {/* DANGER */}
        <div className="mt-6 px-5">
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-rose-500">
            <Trash2 className="h-3 w-3" /> Danger Zone
          </div>
          <button
            onClick={handleDelete}
            className="flex h-14 w-full items-center gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/8 px-4 text-rose-500 active:scale-[0.99]"
          >
            <span className="grid h-9 w-9 place-items-center rounded-full bg-rose-500/15">
              <Trash2 className="h-4 w-4" />
            </span>
            <span className="flex-1 text-left text-[15px] font-semibold">Delete task</span>
            <ChevronRight className="h-4 w-4 opacity-60" />
          </button>
        </div>

        {/* Tip */}
        <div className="mt-5 px-5">
          <div className="rounded-full bg-muted/50 px-4 py-2 text-center text-[12px] text-muted-foreground">
            💡 Long-press any task to open this menu
          </div>
        </div>

        {/* Picker overlay */}
        {picker && (
          <PickerSheet
            kind={picker}
            task={task}
            onClose={() => setPicker(null)}
            onPatch={patch}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

/* -------------------- Bits -------------------- */

function SectionLabel({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="mt-5 mb-2 flex items-center gap-1.5 px-5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      {icon} {label}
    </div>
  );
}

const TONE_BG: Record<string, string> = {
  primary: "bg-primary/12 text-primary",
  violet: "bg-violet-500/12 text-violet-500",
  amber: "bg-amber-500/15 text-amber-600",
  indigo: "bg-indigo-500/12 text-indigo-500",
  teal: "bg-teal-500/12 text-teal-600",
  pink: "bg-pink-500/12 text-pink-500",
};

function BigCard({
  icon, label, value, onClick, tone = "primary", extra, valueTone,
}: {
  icon: React.ReactNode; label: string; value: string; onClick: () => void;
  tone?: keyof typeof TONE_BG | string; extra?: React.ReactNode; valueTone?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex min-h-[96px] w-full flex-col rounded-2xl border border-border/50 bg-card p-3.5 text-left shadow-sm active:scale-[0.985] transition-transform"
    >
      <div className="flex items-start justify-between">
        <div className={cn("grid h-10 w-10 place-items-center rounded-full", TONE_BG[tone as string] ?? TONE_BG.primary)}>
          {icon}
        </div>
        <ChevronRight className="mt-1 h-4 w-4 text-muted-foreground/60" />
      </div>
      <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-primary/70">{label}</p>
      <p className={cn("mt-0.5 truncate text-[15px] font-semibold",
        valueTone === "indigo" ? "text-indigo-500" : "text-foreground")}>{value}</p>
      {extra}
    </button>
  );
}

function SmallTile({ icon, label, onClick, tone = "teal" }:
  { icon: React.ReactNode; label: string; onClick: () => void; tone?: keyof typeof TONE_BG }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[56px] items-center gap-2 rounded-2xl border border-border/50 bg-card px-3 text-left shadow-sm active:scale-[0.985]"
    >
      <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full", TONE_BG[tone])}>{icon}</span>
      <span className="flex-1 truncate text-[13px] font-medium">{label}</span>
      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
    </button>
  );
}

/* -------------------- Picker sub-sheet -------------------- */

function PickerSheet({
  kind, task, onClose, onPatch,
}: {
  kind: Exclude<PickerKind, null>;
  task: Task;
  onClose: () => void;
  onPatch: (p: Partial<Task>, undo?: string) => Promise<void>;
}) {
  const { state } = useStore();
  const [q, setQ] = useState("");
  const [tagDraft, setTagDraft] = useState("");

  const title = {
    project: "Select Project", goal: "Select Goal", due: "Due Date",
    repeat: "Repeat", tags: "Tags", priority: "Priority",
  }[kind];

  const items = useMemo(() => {
    const norm = (s: string) => s.toLowerCase().includes(q.toLowerCase());
    if (kind === "project") {
      return [{ id: "", name: "None" }, ...(state.projects ?? [])].filter(p => norm(p.name));
    }
    if (kind === "goal") {
      return [{ id: "", title: "None" } as any, ...(state.goals ?? [])].filter((g: any) => norm(g.title));
    }
    return [];
  }, [kind, q, state.projects, state.goals]);

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="cf-sheet max-h-[80vh] overflow-y-auto rounded-t-[28px] border-t bg-background p-0 pb-[max(env(safe-area-inset-bottom),16px)]">
        <div className="flex justify-center pt-2.5 pb-1">
          <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
        </div>
        <div className="flex items-center justify-between px-5 pt-3 pb-2">
          <h3 className="text-[17px] font-semibold">{title}</h3>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-muted/60" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        {(kind === "project" || kind === "goal") && (
          <>
            <div className="px-5 pb-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="h-11 rounded-xl pl-9" />
              </div>
            </div>
            <div className="px-3 pb-4">
              {items.map((it: any) => {
                const id = it.id as string;
                const isActive = kind === "project" ? (task.projectId ?? "") === id : (task.goalId ?? "") === id;
                const label = kind === "project" ? it.name : it.title;
                return (
                  <button
                    key={id || "none"}
                    onClick={async () => {
                      if (kind === "project") await onPatch({ projectId: id || undefined }, id ? `Moved to ${label}` : "Removed from project");
                      else await onPatch({ goalId: id || undefined });
                      onClose();
                    }}
                    className="flex h-12 w-full items-center gap-3 rounded-xl px-3 text-left active:bg-muted/40"
                  >
                    <span className="flex-1 truncate text-[15px]">{label}</span>
                    {isActive && <Check className="h-4 w-4 text-primary" />}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {kind === "due" && (
          <div className="px-5 pb-5 space-y-2">
            {[
              { label: "Today", val: format(new Date(), "yyyy-MM-dd") },
              { label: "Tomorrow", val: format(addDays(new Date(), 1), "yyyy-MM-dd") },
              { label: "In 3 days", val: format(addDays(new Date(), 3), "yyyy-MM-dd") },
              { label: "Next week", val: format(addDays(new Date(), 7), "yyyy-MM-dd") },
              { label: "No date", val: "" },
            ].map(o => (
              <button key={o.label}
                onClick={async () => { await onPatch({ dueDate: o.val || undefined }, `Due: ${o.label}`); onClose(); }}
                className="flex h-12 w-full items-center justify-between rounded-xl border border-border/40 bg-card px-4 active:scale-[0.99]">
                <span className="text-[15px] font-medium">{o.label}</span>
                {(task.dueDate ?? "") === o.val && <Check className="h-4 w-4 text-primary" />}
              </button>
            ))}
            <Input type="date" defaultValue={task.dueDate ?? ""}
              onChange={async (e) => { if (e.target.value) { await onPatch({ dueDate: e.target.value }, "Date set"); onClose(); } }}
              className="h-12 rounded-xl" />
          </div>
        )}

        {kind === "repeat" && (
          <div className="px-5 pb-5 space-y-2">
            {(["none","daily","weekly","monthly"] as const).map(r => (
              <button key={r}
                onClick={async () => { await onPatch({ recurrenceType: r }, `Repeat: ${REPEAT_LABEL[r]}`); onClose(); }}
                className="flex h-12 w-full items-center justify-between rounded-xl border border-border/40 bg-card px-4 active:scale-[0.99]">
                <span className="text-[15px] font-medium">{REPEAT_LABEL[r]}</span>
                {(task.recurrenceType ?? "none") === r && <Check className="h-4 w-4 text-primary" />}
              </button>
            ))}
          </div>
        )}

        {kind === "priority" && (
          <div className="px-5 pb-5 space-y-2">
            {(["low","medium","high"] as Task["priority"][]).map(p => (
              <button key={p}
                onClick={async () => { await onPatch({ priority: p }, `Priority: ${PRIORITY_LABEL[p]}`); onClose(); }}
                className="flex h-12 w-full items-center justify-between rounded-xl border border-border/40 bg-card px-4 active:scale-[0.99]">
                <span className="text-[15px] font-medium">{PRIORITY_LABEL[p]}</span>
                {task.priority === p && <Check className="h-4 w-4 text-primary" />}
              </button>
            ))}
          </div>
        )}

        {kind === "tags" && (
          <div className="px-5 pb-5 space-y-3">
            <div className="flex flex-wrap gap-2">
              {(task.tags ?? []).map(t => (
                <button key={t}
                  onClick={() => onPatch({ tags: (task.tags ?? []).filter(x => x !== t) })}
                  className="rounded-full bg-primary/15 px-3 py-1.5 text-[13px] font-medium text-primary">
                  #{t} ✕
                </button>
              ))}
              {(task.tags?.length ?? 0) === 0 && <span className="text-sm text-muted-foreground">No tags yet</span>}
            </div>
            <Input
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && tagDraft.trim()) {
                  const next = Array.from(new Set([...(task.tags ?? []), tagDraft.trim()]));
                  void onPatch({ tags: next });
                  setTagDraft("");
                }
              }}
              placeholder="Add tag and press Enter"
              className="h-11 rounded-xl"
            />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}