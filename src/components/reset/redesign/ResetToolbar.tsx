import { Plus, Sparkles, History, RotateCcw, LayoutGrid, Moon, Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import { AddZonePopover } from "./AddZonePopover";
import type { ResetKind } from "@/lib/reset-checklists";

export function ResetToolbar({
  onAddTask, onCreateZone, onHistory, onResetAll, onLowEnergy, lowEnergy, onQuickTimer, aiSlot,
}: {
  onAddTask: () => void;
  onCreateZone: (name: string, kind: ResetKind) => Promise<void> | void;
  onHistory: () => void;
  onResetAll: () => void;
  onLowEnergy?: () => void;
  lowEnergy?: boolean;
  onQuickTimer: () => void;
  aiSlot?: React.ReactNode;
}) {
  return (
    <div className="reset-glass sticky top-0 z-40 -mx-1 flex flex-wrap items-center gap-1.5 rounded-2xl px-2 py-2 backdrop-blur">
      <ToolbarButton onClick={onAddTask} icon={Plus} label="Add task" />
      <AddZonePopover
        onCreate={onCreateZone}
        trigger={
          <button
            className="reset-chip inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium"
          >
            <LayoutGrid className="h-3.5 w-3.5" /> Add zone
          </button>
        }
      />
      <ToolbarButton onClick={onQuickTimer} icon={Timer} label="Start timer" />
      {aiSlot}
      <ToolbarButton onClick={onHistory} icon={History} label="History" />
      {onLowEnergy && (
        <button
          onClick={onLowEnergy}
          className={cn(
            "reset-chip inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium",
            lowEnergy && "!bg-[hsl(var(--reset-sage))] !text-white",
          )}
          aria-pressed={!!lowEnergy}
        >
          <Moon className="h-3.5 w-3.5" /> Low energy
        </button>
      )}
      <div className="ml-auto">
        <button
          onClick={onResetAll}
          className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(var(--reset-gold-soft))] px-3 py-1.5 text-xs font-semibold text-[hsl(var(--reset-gold))] hover:-translate-y-0.5 transition-transform"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Reset all
        </button>
      </div>
    </div>
  );
}

function ToolbarButton({ onClick, icon: Icon, label }: { onClick: () => void; icon: typeof Plus; label: string }) {
  return (
    <button
      onClick={onClick}
      className="reset-chip inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium"
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
}