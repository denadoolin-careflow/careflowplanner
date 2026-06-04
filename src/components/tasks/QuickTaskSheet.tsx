import { useState } from "react";
import { format, addDays } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { AREAS, type Task, type Priority, type DayPart, type Area, type RecurrenceType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";
import { toast } from "sonner";
import { openTaskEditor } from "@/lib/open-task-editor";
import { ProjectQuickJump } from "@/components/tasks/ProjectQuickJump";
import {
  Flag, Folder, Target, MapPin, Tag, CloudSun, Repeat, CalendarDays,
  ChevronLeft, Trash2, Settings2, X, Check,
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

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{anchor ?? <span className="sr-only" />}</PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-[360px] max-w-[92vw] overflow-hidden rounded-2xl border-border/60 bg-card/95 p-0 shadow-xl backdrop-blur animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2 border-b border-border/50 bg-muted/30 p-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Quick edit</p>
            <p className="mt-0.5 truncate text-sm font-semibold leading-snug text-foreground">{task.title}</p>
          </div>
          <button
            type="button"
            onClick={close}
            className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Picker mode */}
        {picker ? (
          <div className="p-3">
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
                <Row label="None" active={!task.goalId} onClick={() => { void patch({ goalId: undefined }); setPicker(null); }} />
                {goals.length === 0 && <Hint>No goals yet.</Hint>}
                {goals.map(g => (
                  <Row key={g.id} label={g.title} active={task.goalId === g.id}
                    onClick={() => { void patch({ goalId: g.id }); setPicker(null); }} />
                ))}
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
          <div className="p-3">
            {/* Quick due row */}
            <div className="mb-3">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <CalendarDays className="mr-1 inline h-3 w-3" /> Due · {dueLabel}
                </span>
                {task.dueDate && (
                  <button onClick={() => setDue(null)} className="text-[10px] text-muted-foreground hover:text-foreground">
                    Clear
                  </button>
                )}
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                <DueChip label="Today"    onClick={() => setDue(new Date())} />
                <DueChip label="Tomorrow" onClick={() => setDue(addDays(new Date(), 1))} />
                <DueChip label="+3 days"  onClick={() => setDue(addDays(new Date(), 3))} />
                <DueChip label="Next wk"  onClick={() => setDue(addDays(new Date(), 7))} />
              </div>
            </div>

            {/* Rows */}
            <div className="space-y-1">
              <TileRow icon={<Folder className="h-3.5 w-3.5" />} label="Project"
                value={project?.name ?? "None"} onClick={() => setPicker("project")} />
              <TileRow icon={<Target className="h-3.5 w-3.5" />} label="Goal"
                value={goal?.title ?? "None"} onClick={() => setPicker("goal")} />
              <TileRow icon={<MapPin className="h-3.5 w-3.5" />} label="Area"
                value={task.area ?? "None"} onClick={() => setPicker("area")} />
              <TileRow icon={<Flag className="h-3.5 w-3.5" />} label="Priority"
                value={PRIORITY_LABEL[task.priority]} onClick={() => setPicker("priority")} />
              <TileRow icon={<CloudSun className="h-3.5 w-3.5" />} label="Day part"
                value={task.dayPart ?? "Anytime"} onClick={() => setPicker("daypart")} />
              <TileRow icon={<Repeat className="h-3.5 w-3.5" />} label="Repeat"
                value={task.recurrenceType && task.recurrenceType !== "none" ? task.recurrenceType : "Never"}
                onClick={() => setPicker("repeat")} />
              <TileRow icon={<Tag className="h-3.5 w-3.5" />} label="Tags"
                value={(task.tags ?? []).length ? (task.tags ?? []).map(t => `#${t}`).join(" ") : "None"}
                onClick={() => setPicker("tags")} />
            </div>

            {/* Footer */}
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/50 pt-3">
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1.5 text-xs"
                onClick={() => { onOpenChange(false); openTaskEditor(task.id); }}
              >
                <Settings2 className="h-3 w-3" /> Open full editor
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 gap-1.5 text-xs text-destructive hover:text-destructive"
                onClick={async () => { await deleteTask(task.id); onOpenChange(false); }}
              >
                <Trash2 className="h-3 w-3" /> Delete
              </Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function TileRow({ icon, label, value, onClick }: { icon: React.ReactNode; label: string; value: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-xl border border-border/40 bg-background/40 px-2.5 py-2 text-left transition-colors hover:border-primary/40 hover:bg-muted/40 focus:outline-none focus-visible:ring-1 focus-visible:ring-primary/50"
    >
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-muted/60 text-muted-foreground">{icon}</span>
      <span className="w-16 shrink-0 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="min-w-0 flex-1 truncate text-right text-[12px] font-medium text-foreground">{value}</span>
    </button>
  );
}

function DueChip({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-border/50 bg-background/40 px-1.5 py-1.5 text-[11px] font-medium text-foreground transition-colors hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
    >
      {label}
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