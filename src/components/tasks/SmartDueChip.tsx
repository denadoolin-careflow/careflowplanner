import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

type Props = {
  date?: string;
  done?: boolean;
  className?: string;
  compact?: boolean;
};

/**
 * Lightweight contextual due-date chip:
 *   • Overdue → red
 *   • Today   → green
 *   • Tomorrow → amber
 *   • This week (≤7d) → blue weekday
 *   • Later  → muted absolute date
 *   • No date → renders nothing
 */
export function SmartDueChip({ date, done, className, compact }: Props) {
  if (!date) return null;
  let parsed: Date;
  try { parsed = parseISO(date); } catch { return null; }
  const diff = differenceInCalendarDays(parsed, new Date());

  let label = "";
  let tone = "text-muted-foreground";
  let dot = "bg-muted-foreground/50";

  if (diff < 0 && !done) {
    const abs = Math.abs(diff);
    label = compact ? `${abs}d late` : `Overdue · ${abs}d`;
    tone = "text-rose-500";
    dot = "bg-rose-500";
  } else if (diff === 0) {
    label = "Today";
    tone = "text-emerald-500";
    dot = "bg-emerald-500";
  } else if (diff === 1) {
    label = "Tomorrow";
    tone = "text-amber-500";
    dot = "bg-amber-500";
  } else if (diff <= 7) {
    label = format(parsed, "EEE");
    tone = "text-sky-500";
    dot = "bg-sky-500";
  } else {
    label = format(parsed, "MMM d");
  }

  return (
    <span className={cn("inline-flex items-center gap-1 text-[11px] leading-none", tone, className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", dot)} aria-hidden />
      {label}
    </span>
  );
}