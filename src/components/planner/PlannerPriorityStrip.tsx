/**
 * Pinned "Top 3" strip shown at the top of the Day, Week and Month planner
 * views. Each period keeps its own set (see `usePriorities`), so a monthly
 * priority never crowds out today's. Drop any planner card here to pin it.
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { addDays, endOfMonth, endOfWeek, format, parseISO, startOfMonth, startOfWeek } from "date-fns";
import { CalendarClock, Flag, Plus, Search, Sparkles, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useStore } from "@/lib/store";
import { openTaskEditor } from "@/lib/open-task-editor";
import { openMobileBlockEditor } from "@/lib/open-mobile-block-editor";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDropZone } from "@/lib/planner/planner-dnd";
import { usePriorities, MAX_PRIORITIES, SCOPE_LABEL, type PriorityScope } from "@/lib/planner/use-priorities";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function rangeLabel(scope: PriorityScope, date: Date, startISO: string) {
  if (scope === "day") return format(date, "EEE, MMM d");
  if (scope === "week") {
    const s = parseISO(`${startISO}T12:00:00`);
    return `${format(s, "MMM d")} – ${format(addDays(s, 6), "MMM d")}`;
  }
  return format(startOfMonth(date), "MMMM yyyy");
}

export function PlannerPriorityStrip({
  date,
  scope,
  className,
}: {
  date: Date;
  scope: PriorityScope;
  className?: string;
}) {
  const { state, toggleTask, addTask } = useStore() as any;
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { items, start, pin, unpin, full } = usePriorities(date, scope);
  const [text, setText] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);

  const rows = useMemo(() => items.map((r) => {
    if (r.item_type === "task") {
      const t = (state.tasks ?? []).find((x: any) => x.id === r.item_id);
      return { row: r, title: t?.title ?? r.item_title, done: !!t?.done, kind: "task" as const };
    }
    if (r.item_type === "meal") {
      const m = (state.meals ?? []).find((x: any) => x.id === r.item_id);
      return { row: r, title: m ? `${m.slot}: ${m.name}` : r.item_title, done: false, kind: "meal" as const, date: m?.date };
    }
    const a = (state.appointments ?? []).find((x: any) => x.id === r.item_id);
    return { row: r, title: a?.title ?? r.item_title, done: false, kind: "appointment" as const };
  }), [items, state.tasks, state.meals, state.appointments]);

  const doneCount = rows.filter(r => r.done).length;
  const scheduledTasks = useMemo(() => {
    const from = scope === "day" ? format(date, "yyyy-MM-dd")
      : format(scope === "week" ? startOfWeek(date, { weekStartsOn: 1 }) : startOfMonth(date), "yyyy-MM-dd");
    const to = scope === "day" ? from
      : format(scope === "week" ? endOfWeek(date, { weekStartsOn: 1 }) : endOfMonth(date), "yyyy-MM-dd");
    const pinned = new Set(items.filter(item => item.item_type === "task").map(item => item.item_id));
    return (state.tasks ?? []).filter((task: any) => !task.parentTaskId && task.dueDate && task.dueDate >= from && task.dueDate <= to && !pinned.has(task.id))
      .sort((a: any, b: any) => `${a.dueDate}${a.startTime ?? "99:99"}`.localeCompare(`${b.dueDate}${b.startTime ?? "99:99"}`));
  }, [state.tasks, items, scope, date]);

  const zone = useDropZone(
    {
      dateISO: format(date, "yyyy-MM-dd"),
      pinOnly: true,
      onLanded: (item) => {
        void (async () => {
          const ok = await pin({ type: item.type, id: item.id, title: item.label || "" });
          if (!ok) toast("Three priorities is the sweet spot.");
          else toast.success("Pinned to your top priorities.");
        })();
      },
    },
    { id: `priority:${scope}:${start}` },
  );

  const add = async () => {
    const title = text.trim();
    if (!title) return;
    if (full) { toast("Three priorities is the sweet spot."); return; }
    const dueBase = scope === "day" ? date
      : scope === "week" ? date
        : (date < startOfMonth(date) || date > endOfMonth(date) ? startOfMonth(date) : date);
    const created: any = await addTask({
      title,
      area: "Personal",
      priority: "high",
      done: false,
      isTopThree: scope === "day",
      dueDate: format(dueBase, "yyyy-MM-dd"),
      inbox: false,
    } as any);
    setText("");
    const id = typeof created === "string" ? created : created?.id;
    if (id) await pin({ type: "task", id, title });
  };
  const pinTask = async (task: any) => {
    const ok = await pin({ type: "task", id: task.id, title: task.title });
    if (!ok) toast("Three priorities is the sweet spot.");
    else { toast.success("Pinned to your top priorities."); setPickerOpen(false); setText(""); }
  };

  const openRow = (r: typeof rows[number]) => {
    if (r.kind === "task") {
      if (isMobile) openMobileBlockEditor(r.row.item_id, "sheet");
      else openTaskEditor(r.row.item_id);
      return;
    }
    if (r.kind === "meal") navigate(`/meals?date=${r.date ?? format(date, "yyyy-MM-dd")}`);
  };

  return (
    <section
      ref={zone.ref}
      {...zone.nativeProps}
      {...zone.dataProps}
      className={cn(
        "rounded-lg border border-primary/20 bg-primary/5 p-2.5",
        zone.className,
        zone.isOver && "ring-2 ring-primary/40",
        className,
      )}
      aria-label={SCOPE_LABEL[scope]}
    >
      <header className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
          <Sparkles className="h-3 w-3 shrink-0" />
          {SCOPE_LABEL[scope]}
        </span>
        <span className="text-[10px] text-muted-foreground">{rangeLabel(scope, date, start)}</span>
        <span className="ml-auto rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] tabular-nums text-primary">
          {doneCount}/{Math.max(rows.length, 1)}
        </span>
      </header>

      {rows.length === 0 ? (
        <p className="px-0.5 text-[11px] text-muted-foreground">
          Nothing pinned yet — name up to three things that matter {scope === "day" ? "today" : `this ${scope}`}.
        </p>
      ) : (
         <ol className="space-y-1 max-sm:flex max-sm:snap-x max-sm:gap-1.5 max-sm:space-y-0 max-sm:overflow-x-auto max-sm:pb-0.5">
          {rows.map((r, i) => (
            <li
              key={r.row.id}
              className={cn(
                 "group flex min-w-0 items-center gap-2 rounded-lg border border-border/40 bg-card/70 px-2 py-1.5 transition hover:border-primary/30 hover:bg-card max-sm:min-w-[82%] max-sm:snap-start",
                r.done && "opacity-60",
              )}
            >
              <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-primary/15 text-[9px] font-semibold text-primary">
                {i + 1}
              </span>
              {r.kind === "task" && (
                <Checkbox
                  checked={r.done}
                  onCheckedChange={() => void toggleTask(r.row.item_id)}
                  aria-label={`Complete ${r.title}`}
                  className="h-4 w-4 shrink-0"
                />
              )}
              <button
                type="button"
                onClick={() => openRow(r)}
                title={r.title}
                className={cn("min-w-0 flex-1 truncate text-left text-xs", r.done && "line-through")}
              >
                {r.title}
              </button>
              <button
                type="button"
                onClick={() => void unpin(r.row.id)}
                aria-label={`Unpin ${r.title}`}
                className="shrink-0 rounded p-1 text-muted-foreground transition hover:text-foreground md:opacity-0 md:group-hover:opacity-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ol>
      )}

      {rows.length < MAX_PRIORITIES && (
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger asChild><button type="button" className="mt-1.5 flex h-8 w-full items-center gap-2 rounded-md px-1.5 text-left text-xs text-muted-foreground hover:bg-primary/5 hover:text-foreground"><Search className="h-3.5 w-3.5" />Search scheduled tasks or create one</button></PopoverTrigger>
          <PopoverContent align="start" className="w-[min(360px,calc(100vw-2rem))] p-0">
            <Command><CommandInput value={text} onValueChange={setText} placeholder={`Search this ${scope}…`} /><CommandList>
              <CommandEmpty>{text.trim() ? "Create this as a new priority below." : "No unpinned scheduled tasks."}</CommandEmpty>
              {scheduledTasks.length > 0 && <CommandGroup heading={`Scheduled this ${scope}`}>{scheduledTasks.map((task: any) => <CommandItem key={task.id} value={`${task.title} ${task.dueDate} ${task.startTime ?? ""}`} onSelect={() => void pinTask(task)}><CalendarClock className="mr-2 h-3.5 w-3.5 text-muted-foreground" /><span className="min-w-0 flex-1 truncate">{task.title}</span><span className="ml-2 flex shrink-0 items-center gap-1 text-[10px] text-muted-foreground"><Flag className="h-3 w-3" />{task.priority} · {format(parseISO(task.dueDate), "MMM d")}</span></CommandItem>)}</CommandGroup>}
              {text.trim() && <CommandGroup heading="Create new"><CommandItem value={`create ${text}`} onSelect={() => void add()}><Plus className="mr-2 h-3.5 w-3.5" />Create “{text.trim()}”</CommandItem></CommandGroup>}
            </CommandList></Command>
          </PopoverContent>
        </Popover>
      )}
    </section>
  );
}
