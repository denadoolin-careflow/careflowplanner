import { useState } from "react";
import { format, addDays } from "date-fns";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { AREAS, type Task, type Priority, type DayPart, type Area, type RecurrenceType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";
import { toast } from "sonner";
import { openTaskEditor } from "@/lib/open-task-editor";
import { ProjectQuickJump } from "@/components/tasks/ProjectQuickJump";
import { LifeAreaGoalPicker } from "@/components/goals/LifeAreaGoalPicker";
import { lifeAreaLabel } from "@/lib/goals/life-areas";
import {
  Flag, Folder, Target, MapPin, Tag, CloudSun, Repeat, CalendarDays,
  ChevronLeft, ChevronRight, Trash2, ExternalLink, X, Check,
} from "lucide-react";

type Props = {
  task: Task;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  anchor?: React.ReactNode;
};

type Picker = null | "project" | "goal" | "area" | "priority" | "repeat" | "tags" | "daypart";

const PRIORITIES: Priority[] = ["low", "medium", "high"];
const PARTS: DayPart[] = ["Morning", "Afternoon", "Evening", "Late Night"];
const RECURRENCES: RecurrenceType[] = ["none", "daily", "weekly", "monthly"];
const PRIORITY_LABEL: Record<Priority, string> = { low: "Low", medium: "Medium", high: "High" };

export function QuickTaskSheet({ task, open, onOpenChange, anchor }: Props) {
  const { state, updateTask, deleteTask } = useStore();
  const [picker, setPicker] = useState<Picker>(null);
  const [tagDraft, setTagDraft] = useState("");

  const projects = state.projects ?? [];
  const goals = state.goals ?? [];
  const project = task.projectId ? projects.find(p => p.id === task.projectId) : null;
  const goal = task.goalId ? goals.find(g => g.id === task.goalId) : null;

  const patch = async (p: Partial<Task>, undoLabel?: string) => {
    haptics.snap?.();
    const prev: Partial<Task> = {};
    for (const k of Object.keys(p) as (keyof Task)[]) (prev as any)[k] = (task as any)[k];
    await updateTask(task.id, p);
    if (undoLabel) {
      toast(undoLabel, {
        description: task.title,
        duration: 5000,
        action: {
          label: "Undo",
          onClick: () => { haptics.tap?.(); void updateTask(task.id, prev); },
        },
      });
    }
  };

  const close = () => { setPicker(null); onOpenChange(false); };

  const setDue = (d: Date | null) => {
    const iso = d ? format(d, "yyyy-MM-dd") : undefined;
    void patch({ dueDate: iso, inbox: false }, d ? `Due ${format(d, "MMM d")}` : "Due cleared");
  };

  const dueLabel = task.dueDate
    ? format(new Date(task.dueDate + "T00:00:00"), "EEE, MMM d")
    : "No date";

  const [confirmDelete, setConfirmDelete] = useState(false);
  const todayIso = format(new Date(), "yyyy-MM-dd");
  const isoIn = (n: number) => format(addDays(new Date(), n), "yyyy-MM-dd");
  const areaTone = task.area === "Caregiving" ? "care" : task.area ? "letgo" : null;
  const prioTone = task.priority === "high" ? "letgo" : task.priority === "medium" ? "grow" : null;
  const partTone = task.dayPart === "Morning" ? "plan" : task.dayPart === "Afternoon" ? "grow" : task.dayPart ? "care" : null;

  return (
    <>
    {anchor}
    <DialogPrimitive.Root open={open} onOpenChange={(o) => { if (!o) { setPicker(null); setConfirmDelete(false); } onOpenChange(o); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay onClick={(e) => e.stopPropagation()} className="fixed inset-0 z-[100] bg-foreground/45 backdrop-blur-[8px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 duration-200 motion-reduce:animate-none" />
        <DialogPrimitive.Content
          onClick={(e) => e.stopPropagation()}
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 z-[101] flex max-h-[calc(100dvh-2rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] w-[calc(100vw-1.5rem)] max-w-[420px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[24px] border border-border/50 bg-card shadow-[0_24px_60px_-20px_hsl(var(--foreground)/0.45)] duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95 motion-reduce:animate-none"
        >
        {/* Header */}
        <div className="flex shrink-0 items-start gap-3 border-b border-border/40 bg-primary/[0.06] px-5 pb-4 pt-5">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Quick edit</p>
            <DialogPrimitive.Title className="mt-1 whitespace-normal font-serif text-xl leading-snug text-foreground [overflow-wrap:break-word]">{task.title}</DialogPrimitive.Title>
          </div>
          <DialogPrimitive.Close
            className="-mr-1 -mt-1 grid h-11 w-11 shrink-0 place-items-center rounded-full"
            aria-label="Close"
          >
            <span className="grid h-9 w-9 place-items-center rounded-full border border-border/60 bg-card text-muted-foreground shadow-sm hover:text-foreground"><X className="h-4 w-4" /></span>
          </DialogPrimitive.Close>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {/* Picker mode */}
        {picker ? (
          <div className="p-4">
            <button
              type="button"
              onClick={() => setPicker(null)}
              className="mb-2 inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-3 w-3" /> Back
            </button>

            {picker === "project" && (
              <div className="space-y-2">
                <Row
                  label="None"
                  active={!task.projectId}
                  onClick={() => { void patch({ projectId: undefined }, "Removed from project"); setPicker(null); }}
                />
                <ProjectQuickJump
                  compact
                  autoFocus
                  onPick={(id) => {
                    const p = projects.find(x => x.id === id);
                    void patch({ projectId: id }, p ? `Moved to ${p.name}` : "Moved");
                    setPicker(null);
                  }}
                />
              </div>
            )}

            {picker === "goal" && (
              <div className="space-y-1">
                <LifeAreaGoalPicker value={task.goalId} onChange={id => { void patch({ goalId: id }); setPicker(null); }} />
              </div>
            )}

            {picker === "area" && (
              <div className="flex flex-wrap gap-1.5">
                {AREAS.map(a => (
                  <Chip key={a} active={task.area === a}
                    onClick={() => { void patch({ area: a as Area }, `Moved to ${a}`); setPicker(null); }}>
                    {a}
                  </Chip>
                ))}
              </div>
            )}

            {picker === "priority" && (
              <div className="flex flex-wrap gap-1.5">
                {PRIORITIES.map(p => (
                  <Chip key={p} active={task.priority === p} className="capitalize"
                    onClick={() => { void patch({ priority: p }); setPicker(null); }}>
                    {PRIORITY_LABEL[p]}
                  </Chip>
                ))}
              </div>
            )}

            {picker === "repeat" && (
              <div className="flex flex-wrap gap-1.5">
                {RECURRENCES.map(r => (
                  <Chip key={r} active={(task.recurrenceType ?? "none") === r} className="capitalize"
                    onClick={() => { void patch({ recurrenceType: r }); setPicker(null); }}>
                    {r}
                  </Chip>
                ))}
              </div>
            )}

            {picker === "daypart" && (
              <div className="flex flex-wrap gap-1.5">
                {PARTS.map(p => (
                  <Chip key={p} active={task.dayPart === p}
                    onClick={() => { void patch({ dayPart: p === task.dayPart ? undefined : p }); setPicker(null); }}>
                    {p}
                  </Chip>
                ))}
              </div>
            )}

            {picker === "tags" && (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1">
                  {(task.tags ?? []).map(t => (
                    <Chip key={t} active onClick={() => patch({ tags: (task.tags ?? []).filter(x => x !== t) })}>
                      #{t} ✕
                    </Chip>
                  ))}
                  {(task.tags ?? []).length === 0 && <Hint>No tags yet — add one below.</Hint>}
                </div>
                <Input
                  autoFocus
                  value={tagDraft}
                  onChange={(e) => setTagDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && tagDraft.trim()) {
                      e.preventDefault();
                      const next = Array.from(new Set([...(task.tags ?? []), tagDraft.trim()]));
                      void patch({ tags: next });
                      setTagDraft("");
                    }
                  }}
                  placeholder="add tag and press Enter…"
                  className="h-7 text-xs"
                />
              </div>
            )}
          </div>
        ) : (
          <div className="p-4">
            {/* Quick due row */}
            <div className="mb-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" /> Due date
                  <span className="text-xs font-normal text-muted-foreground">· {dueLabel}</span>
                </span>
                {task.dueDate && (
                  <button onClick={() => setDue(null)} className="min-h-[44px] px-2 text-xs text-muted-foreground hover:text-foreground">
                    Clear
                  </button>
                )}
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                <DueChip label="Today" active={task.dueDate === todayIso} onClick={() => setDue(new Date())} />
                <DueChip label="Tomorrow" active={task.dueDate === isoIn(1)} onClick={() => setDue(addDays(new Date(), 1))} />
                <DueChip label="+3 days" active={task.dueDate === isoIn(3)} onClick={() => setDue(addDays(new Date(), 3))} />
                <DueChip label="Next week" active={task.dueDate === isoIn(7)} onClick={() => setDue(addDays(new Date(), 7))} />
              </div>
            </div>

            {/* Rows */}
            <div className="space-y-1.5">
              <TileRow icon={<Folder className="h-[18px] w-[18px]" />} label="Project"
                value={project?.name ?? "None"} onClick={() => setPicker("project")} />
              <TileRow icon={<Target className="h-[18px] w-[18px]" />} label="Goal"
                value={goal ? `${goal.title}${lifeAreaLabel(goal.lifeHouse) ? ` · ${lifeAreaLabel(goal.lifeHouse)}` : ""}` : "None"} onClick={() => setPicker("goal")} />
              <TileRow icon={<MapPin className="h-[18px] w-[18px]" />} label="Area"
                value={task.area ?? "None"} tone={areaTone} onClick={() => setPicker("area")} />
              <TileRow icon={<Flag className="h-[18px] w-[18px]" />} label="Priority"
                value={PRIORITY_LABEL[task.priority]} tone={prioTone} onClick={() => setPicker("priority")} />
              <TileRow icon={<CloudSun className="h-[18px] w-[18px]" />} label="Day Part"
                value={task.dayPart ?? "Anytime"} tone={partTone} onClick={() => setPicker("daypart")} />
              <TileRow icon={<Repeat className="h-[18px] w-[18px]" />} label="Repeat"
                value={task.recurrenceType && task.recurrenceType !== "none" ? task.recurrenceType : "Never"}
                onClick={() => setPicker("repeat")} />
              <TileRow icon={<Tag className="h-[18px] w-[18px]" />} label="Tags"
                value={(task.tags ?? []).length ? (task.tags ?? []).map(t => `#${t}`).join(" ") : "None"}
                onClick={() => setPicker("tags")} />
            </div>

            {/* Footer */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 pb-[env(safe-area-inset-bottom)]">
              <Button
                variant="outline"
                className="h-11 gap-2 rounded-full px-4 text-sm"
                onClick={() => { onOpenChange(false); openTaskEditor(task.id); }}
              >
                <ExternalLink className="h-4 w-4" /> Open full editor
              </Button>
              {confirmDelete ? (
                <div className="flex items-center gap-1.5">
                  <Button variant="ghost" className="h-11 rounded-full px-3 text-sm" onClick={() => setConfirmDelete(false)}>Keep</Button>
                  <Button variant="destructive" className="h-11 gap-1.5 rounded-full px-4 text-sm"
                    onClick={async () => { await deleteTask(task.id); onOpenChange(false); }}>
                    <Trash2 className="h-4 w-4" /> Delete task
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  className="h-11 gap-1.5 rounded-full bg-destructive/10 px-4 text-sm text-destructive hover:bg-destructive/15 hover:text-destructive"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
              )}
            </div>
          </div>
        )}
        </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
    </>
  );
}

function TileRow({ icon, label, value, onClick, tone }: { icon: React.ReactNode; label: string; value: string; onClick: () => void; tone?: string | null }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[48px] w-full items-center gap-3 rounded-2xl border border-border/40 bg-background/50 px-3 py-2 text-left transition-colors hover:border-primary/30 hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      <span className="shrink-0 text-muted-foreground">{icon}</span>
      <span className="shrink-0 text-sm font-medium text-foreground">{label}</span>
      <span className="ml-auto min-w-0 text-right">
        {tone ? (
          <span className="inline-block max-w-full rounded-full px-2.5 py-1 text-xs font-semibold [overflow-wrap:break-word]"
            style={{ background: `hsl(var(--rhythm-${tone}-tint))`, color: `hsl(var(--rhythm-${tone}-deep))` }}>{value}</span>
        ) : (
          <span className="text-[13px] capitalize text-muted-foreground [overflow-wrap:break-word]">{value}</span>
        )}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
    </button>
  );
}

function DueChip({ label, onClick, active }: { label: string; onClick: () => void; active?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex min-h-[44px] items-center justify-center gap-1 rounded-full border px-1 text-[12px] font-medium leading-tight transition-colors",
        active ? "border-transparent text-primary-foreground" : "border-border/60 bg-background/50 text-foreground hover:border-primary/40",
      )}
      style={active ? { background: "hsl(var(--rhythm-plan-deep))" } : undefined}
    >
      {active && <Check className="h-3.5 w-3.5" />}{label}
    </button>
  );
}

function Chip({ active, children, onClick, className }: { active?: boolean; children: React.ReactNode; onClick?: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-2.5 py-1 text-[11px] transition-all",
        active
          ? "border-primary/60 bg-primary/15 text-primary"
          : "border-border/60 bg-card hover:border-primary/40 hover:text-primary",
        className,
      )}
    >
      {children}
    </button>
  );
}

function Row({ label, active, onClick }: { label: string; active?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted/60",
        active && "bg-primary/10 text-primary",
      )}
    >
      <span className="truncate">{label}</span>
      {active && <Check className="h-3 w-3" />}
    </button>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="px-1 py-2 text-[11px] text-muted-foreground">{children}</p>;
}