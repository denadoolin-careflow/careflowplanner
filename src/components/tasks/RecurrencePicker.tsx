import { Repeat } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { RecurrenceType } from "@/lib/types";

export interface RecurrenceValue {
  recurrenceType?: RecurrenceType;
  recurrenceInterval?: number;
  recurrenceDays?: number[];
}

const PRESETS: { label: string; value: RecurrenceValue }[] = [
  { label: "Does not repeat", value: { recurrenceType: "none", recurrenceInterval: undefined, recurrenceDays: undefined } },
  { label: "Every day", value: { recurrenceType: "daily", recurrenceInterval: 1 } },
  { label: "Every week", value: { recurrenceType: "weekly", recurrenceInterval: 1 } },
  { label: "Every 2 weeks", value: { recurrenceType: "weekly", recurrenceInterval: 2 } },
  { label: "Every month", value: { recurrenceType: "monthly", recurrenceInterval: 1 } },
  { label: "Every 3 months", value: { recurrenceType: "monthly", recurrenceInterval: 3 } },
];

export function recurrenceLabel(v?: RecurrenceValue | null): string | null {
  if (!v?.recurrenceType || v.recurrenceType === "none") return null;
  const n = v.recurrenceInterval ?? 1;
  const unit = v.recurrenceType === "daily" ? "day" : v.recurrenceType === "weekly" ? "week" : v.recurrenceType === "monthly" ? "month" : "cycle";
  return n === 1 ? `Every ${unit}` : `Every ${n} ${unit}s`;
}

/** Compact repeat chip — used in quick add and planner row actions. */
export function RecurrencePicker({ value, onChange, className }: {
  value?: RecurrenceValue;
  onChange: (v: RecurrenceValue) => void;
  className?: string;
}) {
  const label = recurrenceLabel(value);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Repeat"
          className={cn(
            "inline-flex min-h-[32px] items-center gap-1 rounded-full border border-border/60 bg-background/70 px-2.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground",
            label && "border-primary/50 text-primary",
            className,
          )}
        >
          <Repeat className="h-3 w-3" />
          {label ?? "Repeat"}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-48 p-1">
        {PRESETS.map(p => {
          const active =
            (p.value.recurrenceType ?? "none") === (value?.recurrenceType ?? "none")
            && (p.value.recurrenceType === "none"
              || (p.value.recurrenceInterval ?? 1) === (value?.recurrenceInterval ?? 1));
          return (
            <button
              key={p.label}
              type="button"
              onClick={() => onChange(p.value)}
              className={cn(
                "flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted",
                active && "bg-primary/10 text-primary",
              )}
            >
              {p.label}
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
