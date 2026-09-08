import { addMonths, format } from "date-fns";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ELEMENT_CLASSES } from "@/lib/seasons/element-classes";
import { seasonsInMonth } from "@/lib/seasons/zodiac-seasons";
import { holidayRunway } from "@/lib/seasons/holiday-runway";

/** A soft look at what's coming, with a few early actions you can add. */
export function NextMonthPreview({
  cursor, onAdd,
}: { cursor: Date; onAdd: (title: string) => void }) {
  const next = addMonths(cursor, 1);
  const season = seasonsInMonth(next)[0].season;
  const el = ELEMENT_CLASSES[season.element];
  const nextStart = new Date(next.getFullYear(), next.getMonth(), 1);
  const holiday = holidayRunway(nextStart, 120)[0];

  const actions = [
    ...season.ideas.filter(i => i.tier !== "optional").slice(0, 2).map(i => i.title),
    ...(holiday ? [`Start preparing for ${holiday.name}`] : []),
  ];

  return (
    <div className="space-y-3">
      <div className={cn("rounded-xl border px-3 py-2", el.bg, el.border)}>
        <p className="text-sm font-medium">
          <span className="mr-1" aria-hidden>{season.glyph}</span>
          {format(next, "MMMM")} opens in {season.sign} season — {season.theme.toLowerCase()}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{season.holidayRole}</p>
      </div>

      {holiday && (
        <p className="text-xs text-muted-foreground">
          Next big date: <span className="font-medium text-foreground">{holiday.name}</span> on{" "}
          {format(new Date(`${holiday.date}T00:00:00`), "MMM d")} — start preparing{" "}
          {holiday.startsIn <= 0 ? "now" : `in ${holiday.startsIn} days`}.
        </p>
      )}

      <ul className="space-y-1.5">
        {actions.map(a => (
          <li key={a} className="flex items-center justify-between gap-2 rounded-lg bg-muted/30 px-2.5 py-1.5">
            <span className="min-w-0 truncate text-xs">{a}</span>
            <Button size="sm" variant="ghost" className="h-7 shrink-0 rounded-full px-2 text-[11px]" onClick={() => onAdd(a)}>
              <Plus className="mr-1 h-3 w-3" /> Add
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
