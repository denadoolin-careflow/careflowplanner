import { useMemo } from "react";
import { addDays, format, parseISO, isSameDay } from "date-fns";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CalendarItemCard } from "@/components/calendar/CalendarItemCard";

type EventItem = {
  kind: "appt" | "bday" | "hol" | "gcal" | "task" | "care" | "meal" | "season" | "cosmic";
  id?: string;
  label: string;
  time?: string;
  color?: string;
};

export function AgendaRail({
  cursor,
  eventsOn,
  days = 30,
  onItemClick,
  onAddForDate,
}: {
  cursor: Date;
  eventsOn: (iso: string) => EventItem[];
  days?: number;
  onItemClick?: (item: EventItem) => void;
  onAddForDate?: (iso: string) => void;
}) {
  const range = useMemo(
    () => Array.from({ length: days }, (_, i) => addDays(cursor, i)),
    [cursor, days],
  );

  const grouped = range
    .map((d) => {
      const iso = format(d, "yyyy-MM-dd");
      return { d, iso, items: eventsOn(iso) };
    })
    .filter((g) => g.items.length > 0);

  return (
    <div className="cozy-card p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Agenda</div>
          <h3 className="font-display text-lg font-semibold">All events &amp; tasks</h3>
        </div>
        <span className="text-[10px] text-muted-foreground">Next {days} days</span>
      </div>

      {grouped.length === 0 ? (
        <p className="rounded-lg bg-muted/40 px-3 py-6 text-center text-xs text-muted-foreground">
          Nothing scheduled. Click a day on the calendar to add something.
        </p>
      ) : (
        <ol className="space-y-4">
          {grouped.map(({ d, iso, items }) => {
            const today = isSameDay(d, new Date());
            const sorted = [...items].sort((a, b) =>
              (a.time ?? "99:99").localeCompare(b.time ?? "99:99"),
            );
            return (
              <li key={iso}>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <div className="flex items-baseline gap-2">
                    <span
                      className={cn(
                        "inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold",
                        today
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground/80",
                      )}
                    >
                      {format(d, "d")}
                    </span>
                    <span className="text-xs font-medium text-foreground">
                      {format(d, "EEE")}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {format(d, "MMM")}
                    </span>
                  </div>
                  {onAddForDate && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 rounded-full"
                      aria-label={`Add to ${format(d, "MMM d")}`}
                      onClick={() => onAddForDate(iso)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                <ul className="space-y-1">
                  {sorted.map((it, i) => {
                    const editable =
                      (it.kind === "appt" ||
                        it.kind === "task" ||
                        it.kind === "care" ||
                        it.kind === "bday" ||
                        it.kind === "hol") && !!it.id;
                    return (
                      <li key={i}>
                        <CalendarItemCard
                          kind={it.kind}
                          id={it.id}
                          label={it.label}
                          time={it.time}
                          color={it.color}
                          variant="compact"
                          disabled={!editable || !onItemClick}
                          onClick={editable && onItemClick ? () => onItemClick(it) : undefined}
                        />
                      </li>
                    );
                  })}
                </ul>
              </li>
            );
          })}
        </ol>
      )}

      {onAddForDate && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-4 w-full gap-1.5 rounded-full"
          onClick={() => onAddForDate(format(cursor, "yyyy-MM-dd"))}
        >
          <Plus className="h-3.5 w-3.5" />
          Add for {format(cursor, "MMM d")}
        </Button>
      )}
    </div>
  );
}

export default AgendaRail;