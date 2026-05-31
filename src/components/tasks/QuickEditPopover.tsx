import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useStore } from "@/lib/store";
import { AREAS, type Task, type Priority, type DayPart, type Area, type RecurrenceType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";
import { Repeat, Flag, Folder, Target, MapPin, Tag, Sun, Moon, CloudSun } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type Props = {
  task: Task;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** Anchor element — popover positions next to it. Use a hidden trigger if anchored to pointer. */
  anchor?: React.ReactNode;
};

const PRIORITIES: Priority[] = ["low", "medium", "high"];
const PARTS: DayPart[] = ["Morning", "Afternoon", "Evening", "Late Night"];
const RECURRENCES: RecurrenceType[] = ["none", "daily", "weekly", "monthly"];

export function QuickEditPopover({ task, open, onOpenChange, anchor }: Props) {
  const { state, updateTask } = useStore();
  const [tagDraft, setTagDraft] = useState("");
  const projects = state.projects ?? [];
  const goals = state.goals ?? [];

  const patch = async (p: Partial<Task>, undoLabel?: string) => {
    haptics.snap?.();
    const prev: Partial<Task> = {};
    for (const key of Object.keys(p) as (keyof Task)[]) {
      (prev as any)[key] = (task as any)[key];
    }
    await updateTask(task.id, p);
    if (undoLabel) {
      toast(undoLabel, {
        description: task.title,
        duration: 5000,
        action: {
          label: "Undo",
          onClick: () => {
            haptics.tap?.();
            void updateTask(task.id, prev);
          },
        },
      });
    }
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{anchor ?? <span className="sr-only" />}</PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-72 rounded-2xl border-border/60 bg-card/95 p-3 shadow-xl backdrop-blur animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-3 text-xs">
          <Section icon={Flag} label="Priority">
            <Chips
              options={PRIORITIES}
              value={task.priority}
              onPick={(v) => patch({ priority: v })}
              capitalize
            />
          </Section>

          <Section icon={CloudSun} label="Day part">
            <Chips
              options={PARTS}
              value={task.dayPart}
              onPick={(v) => patch({ dayPart: v === task.dayPart ? undefined : v })}
            />
          </Section>

          <Section icon={MapPin} label="Area">
            <div className="flex flex-wrap gap-1">
              {AREAS.map(a => (
                <Chip key={a} active={task.area === a} onClick={() => patch({ area: a as Area }, `Moved to ${a}`)}>{a}</Chip>
              ))}
            </div>
          </Section>

          {projects.length > 0 && (
            <Section icon={Folder} label="Project">
              <div className="flex flex-wrap gap-1">
                <Chip active={!task.projectId} onClick={() => patch({ projectId: undefined }, "Removed from project")}>None</Chip>
                {projects.slice(0, 12).map(p => (
                  <Chip key={p.id} active={task.projectId === p.id} onClick={() => patch({ projectId: p.id }, `Moved to ${p.name}`)}>{p.name}</Chip>
                ))}
              </div>
            </Section>
          )}

          {goals.length > 0 && (
            <Section icon={Target} label="Goal">
              <div className="flex flex-wrap gap-1">
                <Chip active={!task.goalId} onClick={() => patch({ goalId: undefined })}>None</Chip>
                {goals.slice(0, 8).map(g => (
                  <Chip key={g.id} active={task.goalId === g.id} onClick={() => patch({ goalId: g.id })}>{g.title}</Chip>
                ))}
              </div>
            </Section>
          )}

          <Section icon={Repeat} label="Repeat">
            <Chips
              options={RECURRENCES}
              value={task.recurrenceType ?? "none"}
              onPick={(v) => patch({ recurrenceType: v })}
              capitalize
            />
          </Section>

          <Section icon={Tag} label="Tags">
            <div className="flex flex-wrap gap-1">
              {(task.tags ?? []).map(t => (
                <Chip key={t} active onClick={() => patch({ tags: (task.tags ?? []).filter(x => x !== t) })}>#{t} ✕</Chip>
              ))}
              <Input
                value={tagDraft}
                onChange={(e) => setTagDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && tagDraft.trim()) {
                    e.preventDefault();
                    const next = Array.from(new Set([...(task.tags ?? []), tagDraft.trim()]));
                    patch({ tags: next });
                    setTagDraft("");
                  }
                }}
                placeholder="add tag…"
                className="h-6 w-24 px-1.5 text-[11px]"
              />
            </div>
          </Section>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Section({ icon: Icon, label, children }: { icon: any; label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      {children}
    </div>
  );
}

function Chips<T extends string>({ options, value, onPick, capitalize }: { options: readonly T[]; value: T | undefined; onPick: (v: T) => void; capitalize?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map(o => (
        <Chip key={o} active={value === o} onClick={() => onPick(o)} className={capitalize ? "capitalize" : undefined}>{o}</Chip>
      ))}
    </div>
  );
}

function Chip({ active, children, onClick, className }: { active?: boolean; children: React.ReactNode; onClick?: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-2 py-0.5 text-[11px] transition-all",
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