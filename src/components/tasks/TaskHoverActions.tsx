import { useState } from "react";
import { format, addDays } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  CalendarClock, Pencil, Snowflake, FolderInput, MoreHorizontal,
} from "lucide-react";
import { useStore } from "@/lib/store";
import type { Task } from "@/lib/types";
import { toast } from "sonner";
import { haptics } from "@/lib/haptics";
import { ProjectQuickJump } from "@/components/tasks/ProjectQuickJump";

type Props = {
  task: Task;
  onEdit: () => void;
  onDetails: () => void;
};

/**
 * Hover quick-action rail: Plan, Edit, Snooze, Move, Details.
 * Renders inline next to a task row; uses opacity-0 group-hover on the row.
 */
export function TaskHoverActions({ task, onEdit, onDetails }: Props) {
  const { updateTask } = useStore();
  const [planOpen, setPlanOpen] = useState(false);
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);

  const setDue = async (d: Date, label: string) => {
    const iso = format(d, "yyyy-MM-dd");
    const prev = { dueDate: task.dueDate, inbox: task.inbox, status: task.status, snoozedUntil: task.snoozedUntil };
    await updateTask(task.id, { dueDate: iso, inbox: false });
    haptics.snap?.();
    toast(label, {
      description: task.title,
      duration: 5000,
      action: { label: "Undo", onClick: () => void updateTask(task.id, prev) },
    });
  };

  const snooze = async (days: number, label: string) => {
    const iso = format(addDays(new Date(), days), "yyyy-MM-dd");
    const prev = { dueDate: task.dueDate, status: task.status, snoozedUntil: task.snoozedUntil };
    await updateTask(task.id, { dueDate: iso, status: "parked", snoozedUntil: iso });
    haptics.snap?.();
    toast(`Snoozed · ${label}`, {
      description: task.title,
      duration: 5000,
      action: { label: "Undo", onClick: () => void updateTask(task.id, prev) },
    });
  };

  return (
    <div className="hidden items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 sm:flex">
      {/* Plan */}
      <Popover open={planOpen} onOpenChange={setPlanOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost" size="icon"
            className="h-7 w-7 text-muted-foreground/70 hover:text-primary"
            onClick={(e) => e.stopPropagation()}
            title="Plan"
            aria-label="Plan"
          >
            <CalendarClock className="h-3.5 w-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" sideOffset={6} className="w-44 p-1.5" onClick={(e) => e.stopPropagation()}>
          <MiniButton onClick={() => { setDue(new Date(), "Scheduled · Today"); setPlanOpen(false); }}>Today</MiniButton>
          <MiniButton onClick={() => { setDue(addDays(new Date(), 1), "Scheduled · Tomorrow"); setPlanOpen(false); }}>Tomorrow</MiniButton>
          <MiniButton onClick={() => { setDue(addDays(new Date(), 7), "Scheduled · Next week"); setPlanOpen(false); }}>Next week</MiniButton>
          <MiniButton onClick={() => { setDue(addDays(new Date(), 30), "Scheduled · In a month"); setPlanOpen(false); }}>In a month</MiniButton>
        </PopoverContent>
      </Popover>

      {/* Edit (inline rename) */}
      <Button
        variant="ghost" size="icon"
        className="h-7 w-7 text-muted-foreground/70 hover:text-primary"
        onClick={(e) => { e.stopPropagation(); onEdit(); }}
        title="Rename"
        aria-label="Rename"
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>

      {/* Snooze */}
      <Popover open={snoozeOpen} onOpenChange={setSnoozeOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost" size="icon"
            className="h-7 w-7 text-muted-foreground/70 hover:text-primary"
            onClick={(e) => e.stopPropagation()}
            title="Snooze"
            aria-label="Snooze"
          >
            <Snowflake className="h-3.5 w-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" sideOffset={6} className="w-36 p-1.5" onClick={(e) => e.stopPropagation()}>
          <MiniButton onClick={() => { snooze(1, "1 day"); setSnoozeOpen(false); }}>+1 day</MiniButton>
          <MiniButton onClick={() => { snooze(3, "3 days"); setSnoozeOpen(false); }}>+3 days</MiniButton>
          <MiniButton onClick={() => { snooze(7, "1 week"); setSnoozeOpen(false); }}>+1 week</MiniButton>
        </PopoverContent>
      </Popover>

      {/* Move to project */}
      <Popover open={moveOpen} onOpenChange={setMoveOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost" size="icon"
            className="h-7 w-7 text-muted-foreground/70 hover:text-primary"
            onClick={(e) => e.stopPropagation()}
            title="Move to project"
            aria-label="Move to project"
          >
            <FolderInput className="h-3.5 w-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" sideOffset={6} className="w-64 p-2" onClick={(e) => e.stopPropagation()}>
          <ProjectQuickJump
            compact
            autoFocus
            onPick={async (id) => {
              await updateTask(task.id, { projectId: id, inbox: false });
              setMoveOpen(false);
              toast.success("Moved to project");
            }}
          />
        </PopoverContent>
      </Popover>

      {/* Details (opens QuickTaskSheet via parent) */}
      <Button
        variant="ghost" size="icon"
        className="h-7 w-7 text-muted-foreground/70 hover:text-primary"
        onClick={(e) => { e.stopPropagation(); onDetails(); }}
        title="More"
        aria-label="More options"
      >
        <MoreHorizontal className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function MiniButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted/60 focus:outline-none focus-visible:ring-1 focus-visible:ring-primary/50"
    >
      {children}
    </button>
  );
}