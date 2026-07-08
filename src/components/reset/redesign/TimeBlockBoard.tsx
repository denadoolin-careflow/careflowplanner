import { useState } from "react";
import { Sunrise, Sun, Sunset, Play, ArrowRight, Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ResetChecklist, ResetItem, TimeBlock } from "@/lib/reset-checklists";
import { ScheduleTaskPopover } from "./ScheduleTaskPopover";

const BLOCKS: { id: TimeBlock; label: string; icon: typeof Sun; hint: string }[] = [
  { id: "morning", label: "Morning", icon: Sunrise, hint: "Ease in gently." },
  { id: "afternoon", label: "Afternoon", icon: Sun, hint: "Steady progress." },
  { id: "evening", label: "Evening", icon: Sunset, hint: "Soften and close." },
];

export function TimeBlockBoard({
  lists, activeBlock, onToggle, onStart, onGoToArea, onSchedule, onQuickAdd,
}: {
  lists: ResetChecklist[];
  activeBlock: TimeBlock;
  onToggle: (list: ResetChecklist, item: ResetItem, done: boolean) => void;
  onStart: (list: ResetChecklist, item: ResetItem) => void;
  onGoToArea: (listId: string) => void;
  onSchedule: (id: string, patch: Partial<ResetItem>) => Promise<void> | void;
  onQuickAdd?: (block: TimeBlock, title: string) => Promise<void> | void;
}) {
  const grouped: Record<TimeBlock, { list: ResetChecklist; item: ResetItem }[]> = {
    morning: [], afternoon: [], evening: [],
  };
  for (const list of lists) {
    for (const item of list.items) {
      if (item.parent_id) continue;
      if (!item.time_block) continue;
      grouped[item.time_block].push({ list, item });
    }
  }

  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[hsl(var(--reset-ink))]/55">
          Rhythm of the day
        </p>
        <p className="text-[11px] text-[hsl(var(--reset-ink))]/55">Schedule tasks to a time of day.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {BLOCKS.map(b => {
          const rows = grouped[b.id];
          const done = rows.filter(r => r.item.done).length;
          const isActive = activeBlock === b.id;
          return (
            <div
              key={b.id}
              className={cn(
                "reset-glass flex flex-col overflow-hidden p-3",
                isActive && "ring-2 ring-[hsl(var(--reset-sage))]/50",
              )}
            >
              <header className="mb-2 flex items-center gap-2">
                <span className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-xl",
                  isActive
                    ? "bg-gradient-to-br from-[hsl(var(--reset-sage))] to-[hsl(var(--reset-sage-deep))] text-white"
                    : "bg-[hsl(var(--reset-sage-soft))] text-[hsl(var(--reset-sage-deep))]",
                )}>
                  <b.icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-sm font-semibold text-[hsl(var(--reset-charcoal))]">{b.label}</p>
                  <p className="text-[10px] text-[hsl(var(--reset-ink))]/55">{b.hint}</p>
                </div>
                <span className="tabular-nums text-[10px] text-[hsl(var(--reset-ink))]/60">
                  {done}/{rows.length}
                </span>
              </header>
              <ul className="space-y-0.5">
                {rows.length === 0 && (
                  <li className="rounded-xl border border-dashed border-[hsl(var(--reset-line))] p-3 text-center text-[11px] text-[hsl(var(--reset-ink))]/50">
                    Nothing scheduled here yet.
                  </li>
                )}
                {rows.map(({ list, item }) => (
                  <li
                    key={item.id}
                    className={cn(
                      "group flex items-center gap-2 rounded-xl px-2 py-1.5 transition-colors",
                      "hover:bg-[hsl(var(--reset-sage-soft))]/60",
                      item.done && "opacity-60",
                    )}
                  >
                    <button
                      onClick={() => onToggle(list, item, !item.done)}
                      aria-label={item.done ? "Mark incomplete" : "Mark complete"}
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all",
                        item.done
                          ? "border-[hsl(var(--reset-sage))] bg-[hsl(var(--reset-sage))] text-white"
                          : "border-[hsl(var(--reset-ink))]/30 hover:border-[hsl(var(--reset-sage))]",
                      )}
                    >
                      {item.done && <Check className="h-3 w-3" strokeWidth={3} />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className={cn(
                        "line-clamp-1 text-sm leading-snug text-[hsl(var(--reset-charcoal))]",
                        item.done && "line-through decoration-[hsl(var(--reset-sage))]/60",
                      )}>
                        {item.title}
                      </p>
                      <p className="line-clamp-1 text-[10px] text-[hsl(var(--reset-ink))]/55">{list.name}{item.est_minutes ? ` · ${item.est_minutes}m` : ""}</p>
                    </div>
                    <div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                      <button
                        onClick={() => onStart(list, item)}
                        aria-label="Start timer"
                        title="Start focus timer"
                        className="grid h-7 w-7 place-items-center rounded-full text-[hsl(var(--reset-ink))]/60 hover:bg-[hsl(var(--reset-sage-soft))] hover:text-[hsl(var(--reset-sage-deep))]"
                      >
                        <Play className="h-3.5 w-3.5" />
                      </button>
                      <ScheduleTaskPopover item={item} onUpdate={onSchedule} />
                      <button
                        onClick={() => onGoToArea(list.id)}
                        aria-label="Go to area"
                        title={`Go to ${list.name}`}
                        className="grid h-7 w-7 place-items-center rounded-full text-[hsl(var(--reset-ink))]/60 hover:bg-[hsl(var(--reset-sage-soft))] hover:text-[hsl(var(--reset-sage-deep))]"
                      >
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              {onQuickAdd && (
                <QuickAddRow block={b.id} onAdd={onQuickAdd} />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function QuickAddRow({
  block, onAdd,
}: { block: TimeBlock; onAdd: (block: TimeBlock, title: string) => Promise<void> | void }) {
  const [value, setValue] = useState("");
  const submit = async () => {
    const t = value.trim();
    if (!t) return;
    setValue("");
    await onAdd(block, t);
  };
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); void submit(); }}
      className="mt-2 flex items-center gap-1.5 rounded-xl border border-dashed border-[hsl(var(--reset-line))] px-2 py-1.5"
    >
      <Plus className="h-3.5 w-3.5 text-[hsl(var(--reset-ink))]/50" />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Add a task…"
        aria-label={`Add task for ${block}`}
        className="flex-1 bg-transparent text-xs text-[hsl(var(--reset-charcoal))] placeholder:text-[hsl(var(--reset-ink))]/40 focus:outline-none"
      />
      {value.trim() && (
        <button
          type="submit"
          className="rounded-full bg-[hsl(var(--reset-sage))] px-2 py-0.5 text-[10px] font-semibold text-white"
        >
          Add
        </button>
      )}
    </form>
  );
}