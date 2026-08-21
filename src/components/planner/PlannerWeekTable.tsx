import { useMemo, useState } from "react";
import { addDays, format, isSameDay } from "date-fns";
import { useStore } from "@/lib/store";
import { usePlannerFeed, type PlannerFeedItem } from "@/lib/planner/feed";
import { usePlannerItemOpener } from "./PlannerItemOpener";
import { KIND_LABEL } from "@/lib/calendar-colors";
import { cn } from "@/lib/utils";

type SortKey = "date" | "title" | "kind" | "status";

/** Week as a sortable table — dense, scannable, good for review. */
export function PlannerWeekTable({ weekStart, days = 7, onOpenItem }: {
  weekStart: Date;
  days?: number;
  onOpenItem?: (item: PlannerFeedItem) => void;
}) {
  const { updateTask } = useStore() as any;
  const { items } = usePlannerFeed(weekStart, days);
  const { open: openItem, dialogs } = usePlannerItemOpener();
  const handleOpen = onOpenItem ?? openItem;
  const [sort, setSort] = useState<SortKey>("date");
  const [asc, setAsc] = useState(true);
  const today = new Date();
  const windowEnd = addDays(weekStart, days - 1);

  const rows = useMemo(() => {
    const list = [...items];
    const dir = asc ? 1 : -1;
    list.sort((a, b) => {
      if (sort === "title") return dir * a.title.localeCompare(b.title);
      if (sort === "kind") return dir * a.kind.localeCompare(b.kind);
      if (sort === "status") return dir * (Number(!!a.done) - Number(!!b.done));
      const d = a.date.localeCompare(b.date);
      return dir * (d !== 0 ? d : (a.time ?? "zz").localeCompare(b.time ?? "zz"));
    });
    return list;
  }, [items, sort, asc]);

  const head = (key: SortKey, label: string, className?: string) => (
    <th scope="col" className={cn("px-3 py-2 text-left font-semibold", className)}>
      <button
        type="button"
        onClick={() => { if (sort === key) setAsc(a => !a); else { setSort(key); setAsc(true); } }}
        aria-sort={sort === key ? (asc ? "ascending" : "descending") : "none"}
        className="inline-flex items-center gap-1 hover:text-foreground"
      >
        {label}{sort === key && <span aria-hidden>{asc ? "▲" : "▼"}</span>}
      </button>
    </th>
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/40">
      <div className="flex items-baseline gap-2 border-b border-border/60 px-3 py-2">
        <span className="text-sm font-semibold">Table</span>
        <span className="text-[11px] text-muted-foreground">
          {format(weekStart, "MMM d")} – {format(windowEnd, "MMM d")} · {rows.length} items
        </span>
      </div>
      <div className="max-h-[70vh] overflow-auto">
        <table className="w-full text-[12.5px]">
          <thead className="sticky top-0 z-10 bg-card/95 text-[10px] uppercase tracking-[0.14em] text-muted-foreground backdrop-blur">
            <tr>
              {head("date", "When", "w-32")}
              {head("title", "Item")}
              {head("kind", "Type", "w-28")}
              {head("status", "Status", "w-24")}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {rows.length === 0 && (
              <tr><td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">Nothing planned this week.</td></tr>
            )}
            {rows.map(it => {
              const d = new Date(`${it.date}T12:00:00`);
              const isTask = it.sourceRef.type === "task";
              return (
                <tr
                  key={it.id}
                  onClick={() => handleOpen(it)}
                  className={cn("cursor-pointer transition-colors hover:bg-muted/50", it.done && "opacity-55")}
                >
                  <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                    <span className={cn(isSameDay(d, today) && "font-semibold text-primary")}>{format(d, "EEE d")}</span>
                    <span className="ml-1.5 font-mono text-[11px] tabular-nums">
                      {it.allDay ? "all day" : (it.time?.slice(0, 5) ?? "")}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className="flex items-start gap-2">
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: it.color }} aria-hidden />
                      <span className={cn("[overflow-wrap:anywhere] whitespace-normal break-words", it.done && "line-through")}>{it.title}</span>
                    </span>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{KIND_LABEL[it.kind]}</td>
                  <td className="px-3 py-2">
                    {isTask ? (
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); updateTask(it.sourceRef.id, { done: !it.done }); }}
                        className="rounded-full border border-border/60 px-2 py-0.5 text-[11px] hover:bg-muted"
                      >
                        {it.done ? "Done" : "Open"}
                      </button>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {dialogs}
    </div>
  );
}
