import { cn } from "@/lib/utils";
import { resolveActivity, readActivityTag } from "@/lib/task-tracking";

/**
 * Small activity marker (cleaning, commuting, cooking, caregiving…) shown on
 * planner rows and blocks. Renders nothing when the task has no activity.
 */
export function ActivityChip({ task, showLabel, className }: {
  task: { tags?: string[]; area?: string; recipientId?: string; title?: string; notes?: string } | null | undefined;
  showLabel?: boolean;
  className?: string;
}) {
  const act = resolveActivity(task);
  if (!act) return null;
  const explicit = !!readActivityTag(task?.tags);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] leading-none",
        explicit ? "" : "opacity-70",
        className,
      )}
      style={{ background: `color-mix(in srgb, ${act.color} 16%, transparent)`, color: act.color }}
      title={explicit ? act.label : `${act.label} (suggested)`}
    >
      <act.icon className="h-2.5 w-2.5" aria-hidden />
      {showLabel && <span>{act.label}</span>}
      <span className="sr-only">{`Activity: ${act.label}`}</span>
    </span>
  );
}
