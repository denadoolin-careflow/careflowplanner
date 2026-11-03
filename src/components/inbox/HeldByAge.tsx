import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { DndContext } from "@dnd-kit/core";
import { SortableContext } from "@dnd-kit/sortable";
import { ageGroupOf, type AgeGroup } from "@/lib/task-schedule";
import { InboxSortableRow } from "./InboxSortableRow";
import { InboxSortButton } from "./InboxSortBoxes";
import type { DayPart } from "./WhenPopover";

const GROUPS: { id: AgeGroup; label: string }[] = [
  { id: "today", label: "New today" },
  { id: "week", label: "This week" },
  { id: "older", label: "Older" },
];

/** "Held in your inbox" · Grouped by age: New today, This week, Older (older sits on a soft shade). */
export function HeldByAge({ items, autoDayPart, compact }: { items: any[]; autoDayPart: DayPart; compact?: boolean }) {
  const groups = useMemo(() => {
    const m: Record<AgeGroup, any[]> = { today: [], week: [], older: [] };
    for (const t of items) m[ageGroupOf(t.createdAt)].push(t);
    return m;
  }, [items]);
  return (
    <DndContext><SortableContext items={items.map(t => `inbox:${t.id}`)}>
    <div className="space-y-5">
      {GROUPS.map(g => groups[g.id].length > 0 && (
        <section key={g.id} className={cn(g.id === "older" && "rounded-2xl bg-muted/50 p-3")}>
          <h4 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {g.label} <span className="tabular-nums opacity-70">· {groups[g.id].length}</span>
          </h4>
          <div className="space-y-2">
            {groups[g.id].map(t => (
              <div key={t.id} className="space-y-1">
                <InboxSortableRow task={t} autoDayPart={autoDayPart} compact={compact} />
                <div className="flex justify-end"><InboxSortButton task={t} /></div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
    </SortableContext></DndContext>
  );
}
