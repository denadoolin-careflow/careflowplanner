import { useMemo, useState } from "react";
import { addDays, format, isSameDay } from "date-fns";
import { Check, Plus, UtensilsCrossed } from "lucide-react";
import { useStore } from "@/lib/store";
import { type PlannerFeedItem } from "@/lib/planner/feed";
import { useRangeRows } from "@/lib/planner/use-range-rows";
import { PlannerCapacityBar } from "./PlannerCapacityBar";
import { PlannerDaySummaryStrip } from "./PlannerDaySummaryStrip";
import { WeekPlanningDashboard } from "@/components/calendar/WeekPlanningDashboard";
import { WeekMealDialog } from "./WeekMealDialog";
import { KIND_ICONS } from "./kindIcon";
import { usePlannerItemOpener } from "./PlannerItemOpener";
import { OutlineBreadcrumb } from "./OutlineBreadcrumb";
import { useDraggableCard, useDropZone, feedDragItem } from "@/lib/planner/planner-dnd";
import { useDayPartLabels } from "@/lib/day-part-labels";
import { fmt12 } from "@/lib/planner/day-plan";
import type { Meal } from "@/lib/types";
import { cn } from "@/lib/utils";

const PARTS = [
  { part: "morning" as const, hours: "5 AM – 12 PM", slot: "Breakfast" as const },
  { part: "afternoon" as const, hours: "12 – 5 PM", slot: "Lunch" as const },
  { part: "evening" as const, hours: "5 PM – late", slot: "Dinner" as const },
];

type PartKey = (typeof PARTS)[number]["part"];

function itemPart(it: PlannerFeedItem): PartKey | "anytime" {
  if (it.allDay || !it.time) return "anytime";
  const h = Number(it.time.split(":")[0]);
  if (!Number.isFinite(h)) return "anytime";
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

/** One draggable planner card. */
function BoardCard({ item, onOpen, onToggle }: {
  item: PlannerFeedItem;
  onOpen: (it: PlannerFeedItem) => void;
  onToggle: (it: PlannerFeedItem) => void;
}) {
  const Icon = KIND_ICONS[item.kind];
  const isTask = item.sourceRef.type === "task";
  const drag = useDraggableCard(feedDragItem(item), { idPrefix: "weekboard" });
  return (
    <div
      ref={drag.ref}
      {...drag.props}
      role="button"
      tabIndex={0}
      onClick={() => onOpen(item)}
      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onOpen(item); } }}
      className={cn(
        "group flex cursor-pointer items-start gap-2 rounded-xl border border-border/50 bg-card/70 px-2 py-1.5 text-left text-[11px] leading-snug shadow-sm transition-all hover:bg-muted/50 hover:shadow-md",
        item.done && "opacity-50",
        drag.className,
      )}
      style={{ borderLeft: `3px solid ${item.color}` }}
    >
      {isTask && (
        <span
          role="checkbox"
          aria-checked={!!item.done}
          tabIndex={0}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onToggle(item); }}
          onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); e.stopPropagation(); onToggle(item); } }}
          className={cn(
            "mt-0.5 flex h-3.5 w-3.5 shrink-0 cursor-pointer items-center justify-center rounded-[3px] border transition-colors",
            item.done ? "border-transparent" : "border-muted-foreground/40 hover:border-muted-foreground/70",
          )}
          style={{ backgroundColor: item.done ? item.color : undefined }}
        >
          {item.done && <Check className="h-2.5 w-2.5 text-white" />}
        </span>
      )}
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${item.color}1f`, color: item.color }}>
        <Icon className="h-2.5 w-2.5" />
      </span>
      <span className="min-w-0 flex-1 break-words">
        {item.time && <span className="mr-1 font-mono text-[10px] text-muted-foreground">{fmt12(item.time)}</span>}
        {item.title}
      </span>
    </div>
  );
}

/** Compact meal chip under each day part; also draggable between days/parts. */
function MealSlot({ iso, slot, onEdit }: { iso: string; slot: Meal["slot"]; onEdit: (meal: Meal | null) => void }) {
  const { state } = useStore();
  const meal = state.meals.find(m => m.date === iso && m.slot === slot) ?? null;
  const drag = useDraggableCard(
    { type: "meal", id: meal?.id ?? "none", label: meal ? `${slot}: ${meal.name}` : slot },
    { disabled: !meal, idPrefix: "weekboard-meal" },
  );
  return (
    <div
      ref={drag.ref}
      {...drag.props}
      role="button"
      tabIndex={0}
      onClick={() => onEdit(meal)}
      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onEdit(meal); } }}
      aria-label={meal ? `${slot}: ${meal.name}. Edit meal` : `Add ${slot.toLowerCase()}`}
      className={cn(
        "mt-1 flex min-h-[26px] cursor-pointer items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] leading-tight",
        meal
          ? "border-yellow-300/70 bg-yellow-100/70 text-yellow-950 dark:border-yellow-800/60 dark:bg-yellow-900/40 dark:text-yellow-50"
          : "border-dashed border-border/70 bg-card/50 text-muted-foreground",
        drag.className,
      )}
    >
      {meal ? <UtensilsCrossed className="h-3 w-3 shrink-0" /> : <Plus className="h-3 w-3 shrink-0" />}
      <span className="truncate">{meal ? meal.name : slot}</span>
    </div>
  );
}

/** A day part column: drop target for tasks, appointments and meals. */
function PartColumn({ day, iso, part, label, hours, slot, items, onOpen, onToggle, onQuickAdd, onEditMeal }: {
  day: Date;
  iso: string;
  part: PartKey;
  label: string;
  hours: string;
  slot: Meal["slot"];
  items: PlannerFeedItem[];
  onOpen: (it: PlannerFeedItem) => void;
  onToggle: (it: PlannerFeedItem) => void;
  onQuickAdd: (iso: string, part: PartKey) => void;
  onEditMeal: (meal: Meal | null, iso: string, slot: Meal["slot"]) => void;
}) {
  const zone = useDropZone({ dateISO: iso, part, keepTime: true }, { id: `weekboard:${iso}:${part}` });
  return (
    <section
      ref={zone.ref}
      {...zone.nativeProps}
      {...zone.dataProps}
      aria-label={`${label} on ${format(day, "EEEE")}`}
      className={cn("flex min-h-[112px] flex-col rounded-xl border border-border/50 bg-card/40 p-2", zone.className)}
    >
      <div className="flex items-baseline justify-between gap-1">
        <div className="min-w-0">
          <p className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
          <p className="truncate text-[9px] text-muted-foreground/70">{hours}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span className="rounded-full bg-muted px-1.5 text-[9px] text-muted-foreground">{items.length}</span>
          <button
            type="button"
            onClick={() => onQuickAdd(iso, part)}
            aria-label={`Add to ${label} on ${format(day, "EEEE")}`}
            className="grid h-6 w-6 place-items-center rounded-full text-muted-foreground hover:bg-muted"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <PlannerCapacityBar date={day} part={part} compact />
      <div className="mt-1 flex flex-1 flex-col gap-1">
        {items.length === 0
          ? <p className="rounded-lg border border-dashed border-border/60 px-2 py-2 text-[10.5px] text-muted-foreground/70">Nothing planned. Drop a task here.</p>
          : items.map(it => <BoardCard key={it.id} item={it} onOpen={onOpen} onToggle={onToggle} />)}
      </div>
      <MealSlot iso={iso} slot={slot} onEdit={(meal) => onEditMeal(meal, iso, slot)} />
    </section>
  );
}

/**
 * Week as a Trello-style planning board: one row per day, three day-part
 * columns with meal slots, all wired into the shared planner drag layer.
 */
export function PlannerWeekBoard({ weekStart, onSelectDay, onOpenItem, onQuickAdd, showDashboard = true }: {
  weekStart: Date;
  onSelectDay?: (d: Date) => void;
  onOpenItem?: (item: PlannerFeedItem) => void;
  onQuickAdd?: (iso: string, part: PartKey) => void;
  /** The weekly plan dashboard now lives on the Overview tab. */
  showDashboard?: boolean;
}) {
  const { state } = useStore() as any;
  const { byDay, toggleDone } = useRangeRows(weekStart, 7);
  const { open: openItem, dialogs } = usePlannerItemOpener();
  const [labels] = useDayPartLabels();
  const handleOpen = onOpenItem ?? openItem;
  const [editing, setEditing] = useState<{ meal: Meal | null; date: string; slot: Meal["slot"] } | null>(null);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const today = new Date();

  const quickAdd = (iso: string, part: PartKey) => {
    if (onQuickAdd) onQuickAdd(iso, part);
    else onSelectDay?.(new Date(`${iso}T12:00:00`));
  };

  return (
    <div className="space-y-3">
      <OutlineBreadcrumb tasks={state.tasks ?? []} className="rounded-xl border border-border/60" />
      <div className="space-y-2">
        {days.map(d => {
          const iso = format(d, "yyyy-MM-dd");
          const rows = byDay.get(iso) ?? [];
          const groups: Record<PartKey | "anytime", PlannerFeedItem[]> = { morning: [], afternoon: [], evening: [], anytime: [] };
          for (const it of rows) groups[itemPart(it)].push(it);
          const isToday = isSameDay(d, today);
          return <DayRow
            key={iso}
            day={d}
            iso={iso}
            isToday={isToday}
            rows={rows}
            groups={groups}
            labels={labels}
            onSelectDay={onSelectDay}
            onOpen={handleOpen}
            onToggle={toggleDone}
            onQuickAdd={quickAdd}
            onEditMeal={(meal, date, slot) => setEditing({ meal, date, slot })}
          />;
        })}
      </div>

      {editing && (
        <WeekMealDialog
          open
          onOpenChange={(v) => { if (!v) setEditing(null); }}
          meal={editing.meal}
          date={editing.date}
          slot={editing.slot}
        />
      )}
      {showDashboard && (
        <div className="[&>*]:w-full">
          <WeekPlanningDashboard weekStart={weekStart} onJumpToDay={onSelectDay} />
        </div>
      )}
      {dialogs}
    </div>
  );
}

function DayRow({ day, iso, isToday, rows, groups, labels, onSelectDay, onOpen, onToggle, onQuickAdd, onEditMeal }: {
  day: Date;
  iso: string;
  isToday: boolean;
  rows: PlannerFeedItem[];
  groups: Record<PartKey | "anytime", PlannerFeedItem[]>;
  labels: { morning: string; afternoon: string; evening: string };
  onSelectDay?: (d: Date) => void;
  onOpen: (it: PlannerFeedItem) => void;
  onToggle: (it: PlannerFeedItem) => void;
  onQuickAdd: (iso: string, part: PartKey) => void;
  onEditMeal: (meal: Meal | null, iso: string, slot: Meal["slot"]) => void;
}) {
  const dayZone = useDropZone({ dateISO: iso }, { id: `weekboard-day:${iso}` });
  return (
    <article className={cn("rounded-2xl border border-border/60 bg-card/30 p-2", isToday && "border-primary/50 bg-primary/[0.03]")}>
      <div
        ref={dayZone.ref}
        {...dayZone.nativeProps}
        {...dayZone.dataProps}
        className={cn("flex flex-wrap items-center gap-2 rounded-xl px-1 py-1", dayZone.className)}
      >
        <button type="button" onClick={() => onSelectDay?.(day)} className="flex items-baseline gap-2 text-left">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{format(day, "EEE")}</span>
          <span className={cn("font-display text-sm font-semibold", isToday && "text-primary")}>{format(day, "MMM d")}</span>
        </button>
        <PlannerDaySummaryStrip date={day} items={rows} className="ml-auto" />
      </div>
      {groups.anytime.length > 0 && (
        <section aria-label={`Anytime on ${format(day, "EEEE")}`} className="mt-1 space-y-1 px-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Anytime</span>
          {groups.anytime.map(it => <BoardCard key={it.id} item={it} onOpen={onOpen} onToggle={onToggle} />)}
        </section>
      )}
      <div className="mt-1.5 grid gap-2 sm:grid-cols-3">
        {PARTS.map(p => (
          <PartColumn
            key={p.part}
            day={day}
            iso={iso}
            part={p.part}
            label={labels[p.part]}
            hours={p.hours}
            slot={p.slot}
            items={groups[p.part]}
            onOpen={onOpen}
            onToggle={onToggle}
            onQuickAdd={onQuickAdd}
            onEditMeal={onEditMeal}
          />
        ))}
      </div>
    </article>
  );
}
