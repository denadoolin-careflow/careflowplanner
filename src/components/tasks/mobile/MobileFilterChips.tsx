import { cn } from "@/lib/utils";

export type InboxFilter = "all" | "today" | "upcoming" | "scheduled" | "overdue";

const OPTS: { id: InboxFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "today", label: "Today" },
  { id: "upcoming", label: "Upcoming" },
  { id: "scheduled", label: "Scheduled" },
  { id: "overdue", label: "Overdue" },
];

export function MobileFilterChips({
  value, onChange, counts,
}: { value: InboxFilter; onChange: (v: InboxFilter) => void; counts?: Partial<Record<InboxFilter, number>> }) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto py-1 no-scrollbar -mx-1 px-1">
      {OPTS.map(o => {
        const active = o.id === value;
        const n = counts?.[o.id];
        return (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            className={cn("cf-chip shrink-0 transition-colors", active && "cf-chip-active")}
            aria-pressed={active}
          >
            {o.label}{typeof n === "number" ? <span className="opacity-70"> · {n}</span> : null}
          </button>
        );
      })}
    </div>
  );
}