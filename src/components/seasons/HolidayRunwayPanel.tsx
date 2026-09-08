import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { holidayRunway } from "@/lib/seasons/holiday-runway";
import type { HolidayPrefs } from "@/lib/monthly-plan";

/** Next three events with prep progress and a persisted checklist. */
export function HolidayRunwayPanel({
  from = new Date(), prefs, onChange,
}: { from?: Date; prefs: HolidayPrefs; onChange: (next: HolidayPrefs) => void }) {
  const items = holidayRunway(from, 150).slice(0, 3);
  const checks = prefs.checks ?? {};

  if (items.length === 0) {
    return <p className="text-xs text-muted-foreground">Nothing big on the horizon — enjoy the quiet stretch.</p>;
  }

  const toggle = (key: string, title: string, on: boolean) => {
    const cur = checks[key] ?? [];
    const next = on ? Array.from(new Set([...cur, title])) : cur.filter(t => t !== title);
    onChange({ ...prefs, checks: { ...checks, [key]: next } });
  };

  return (
    <div className="space-y-3">
      {items.map(h => {
        const key = `${h.date}:${h.name}`;
        const done = checks[key] ?? [];
        const pct = Math.round((done.length / h.checklist.length) * 100);
        return (
          <div key={key} className="rounded-xl border border-border bg-muted/20 p-3">
            <div className="flex items-baseline justify-between gap-2">
              <p className="truncate text-sm font-medium">{h.name}</p>
              <span className="shrink-0 text-[11px] text-muted-foreground">
                {format(new Date(`${h.date}T00:00:00`), "MMM d")} · {h.daysUntil}d away
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {pct}% ready{h.inRunway ? "" : ` · prep starts in ${h.startsIn} days`}
            </p>
            <ul className="mt-2 space-y-1.5">
              {h.checklist.map(c => {
                const on = done.includes(c.title);
                return (
                  <li key={c.title} className="flex items-center gap-2">
                    <Checkbox
                      id={`${key}-${c.title}`}
                      checked={on}
                      onCheckedChange={v => toggle(key, c.title, !!v)}
                    />
                    <label
                      htmlFor={`${key}-${c.title}`}
                      className={cn("cursor-pointer text-xs", on ? "text-muted-foreground opacity-60" : "")}
                    >
                      {c.title}
                      <span className="ml-1 text-[10px] text-muted-foreground">({c.daysBefore}d before)</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
