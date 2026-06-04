import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { formatTime12 } from "@/lib/routines";
import {
  CheckSquare, CalendarClock, HeartPulse, UtensilsCrossed, Cake, Sparkles,
  Clock, Tag, Zap, Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Energy } from "@/lib/types";

export type CardKind = "appt" | "bday" | "hol" | "gcal" | "task" | "care" | "meal" | "season" | "cosmic";

const KIND_META: Record<CardKind, { Icon: LucideIcon; label: string; color: string }> = {
  task: { Icon: CheckSquare,     label: "Task",      color: "bg-warm-soft text-warm-foreground border-warm-foreground/30" },
  appt: { Icon: CalendarClock,   label: "Appt",      color: "bg-primary-soft text-foreground border-primary/30" },
  care: { Icon: HeartPulse,      label: "Care",      color: "bg-rose-100/80 text-rose-900 border-rose-300/60 dark:bg-rose-900/30 dark:text-rose-100" },
  meal: { Icon: UtensilsCrossed, label: "Meal",      color: "bg-amber-100/80 text-amber-900 border-amber-300/60 dark:bg-amber-900/30 dark:text-amber-100" },
  bday: { Icon: Cake,            label: "Birthday",  color: "bg-accent-soft text-accent-foreground border-accent-foreground/20" },
  hol:  { Icon: Sparkles,        label: "Holiday",   color: "bg-secondary-soft text-secondary-foreground border-secondary-foreground/20" },
  gcal: { Icon: CalendarClock,   label: "Google",    color: "bg-muted text-foreground border-border/60" },
  season: { Icon: Sparkles,       label: "Celebration", color: "bg-pink-100/80 text-pink-900 border-pink-300/60 dark:bg-pink-900/30 dark:text-pink-100" },
  cosmic: { Icon: Sparkles,       label: "Cosmic",      color: "bg-indigo-100/80 text-indigo-900 border-indigo-300/60 dark:bg-indigo-900/30 dark:text-indigo-100" },
};

const ENERGY_STYLE: Record<Energy, { label: string; dot: string; chip: string }> = {
  low:    { label: "Low",    dot: "bg-emerald-400", chip: "text-emerald-700 dark:text-emerald-300" },
  medium: { label: "Med",    dot: "bg-amber-400",   chip: "text-amber-700 dark:text-amber-300" },
  high:   { label: "High",   dot: "bg-rose-500",    chip: "text-rose-700 dark:text-rose-300" },
};

function stripLeadingGlyph(label: string): string {
  // Remove leading emoji or "○"/"✓" + space inserted by eventsOn().
  return label.replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}○✓·↦]+\s+/u, "").trim() || label;
}

function initials(name: string): string {
  return name.split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase() ?? "").join("");
}

export interface CalendarItemCardProps {
  kind: CardKind;
  id?: string;
  label: string;
  time?: string;
  color?: string; // gcal hex
  variant?: "row" | "compact";
  draggable?: boolean;
  disabled?: boolean;
  className?: string;
  onClick?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
}

/**
 * Rich calendar item card: category icon, time, area tag, energy, family chips.
 * Pulls metadata from the store for tasks/appointments via id.
 */
export function CalendarItemCard({
  kind, id, label, time, color,
  variant = "row", draggable, disabled,
  className, onClick, onDragStart, onDragEnd,
}: CalendarItemCardProps) {
  const { state } = useStore();
  const meta = KIND_META[kind] ?? KIND_META.gcal;
  const Icon = meta.Icon;

  // Pull rich data for the entity.
  const task = (kind === "task" || kind === "care") && id ? state.tasks.find(t => t.id === id) : undefined;
  const appt = kind === "appt" && id ? state.appointments.find(a => a.id === id) : undefined;

  const titleText = task?.title ?? appt?.title ?? stripLeadingGlyph(label);
  const customIcon =
    task?.icon && !task.icon.startsWith("lc:") ? task.icon
    : appt?.icon ? appt.icon
    : kind === "bday" ? "🎂"
    : kind === "hol" ? "✨"
    : kind === "meal" ? "🍽"
    : undefined;

  const timeText = time ?? task?.startTime ?? appt?.time;
  const area = task?.area ?? appt?.areaName;
  const energy: Energy | undefined = task?.energy;
  const energyStyle = energy ? ENERGY_STYLE[energy] : undefined;

  const recipientIds: string[] = [];
  if (task?.recipientId) recipientIds.push(task.recipientId);
  if (appt?.recipientId) recipientIds.push(appt.recipientId);
  const recipients = recipientIds
    .map(rid => state.recipients?.find(r => r.id === rid))
    .filter(Boolean) as { id: string; name: string }[];

  const inlineColor = kind === "gcal" && color ? { borderLeftColor: color } : undefined;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      title={titleText}
      style={inlineColor}
      className={cn(
        "group relative w-full rounded-md border border-l-[3px] text-left transition-all",
        meta.color,
        variant === "compact" ? "px-1.5 py-1 text-[11px] leading-snug" : "px-2 py-1.5 text-[11.5px] leading-snug",
        !disabled && onClick && "cursor-pointer hover:-translate-y-0.5 hover:shadow-sm",
        draggable && "active:cursor-grabbing",
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-1.5">
        <span className="mt-0.5 shrink-0" aria-hidden>
          {customIcon ? <span className="text-[12px] leading-none">{customIcon}</span>
            : <Icon className="h-3 w-3 opacity-80" />}
        </span>
        <span className="min-w-0 flex-1 truncate font-medium">{titleText}</span>
        {energyStyle && variant !== "compact" && (
          <span className={cn("inline-flex shrink-0 items-center gap-1 text-[10px] font-semibold", energyStyle.chip)}>
            <span className={cn("h-1.5 w-1.5 rounded-full", energyStyle.dot)} />
            {energyStyle.label}
          </span>
        )}
      </div>

      {(timeText || area || recipients.length > 0 || (energyStyle && variant === "compact")) && (
        <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] opacity-80">
          {timeText && (
            <span className="inline-flex items-center gap-0.5 font-medium tabular-nums">
              <Clock className="h-2.5 w-2.5" />
              {formatTime12(timeText.slice(0, 5))}
            </span>
          )}
          {area && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-background/40 px-1 py-px">
              <Tag className="h-2.5 w-2.5" />
              {area}
            </span>
          )}
          {energyStyle && variant === "compact" && (
            <span className={cn("inline-flex items-center gap-0.5", energyStyle.chip)}>
              <Zap className="h-2.5 w-2.5" />
              {energyStyle.label}
            </span>
          )}
          {recipients.length > 0 && (
            <span className="inline-flex items-center gap-0.5">
              <Users className="h-2.5 w-2.5" />
              <span className="flex -space-x-1">
                {recipients.slice(0, 3).map(r => (
                  <span
                    key={r.id}
                    title={r.name}
                    className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border border-background bg-primary/20 text-[8px] font-semibold text-foreground"
                  >
                    {initials(r.name)}
                  </span>
                ))}
              </span>
              {recipients.length > 3 && <span>+{recipients.length - 3}</span>}
            </span>
          )}
        </div>
      )}
    </button>
  );
}