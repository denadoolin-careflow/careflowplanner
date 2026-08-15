import { useMemo, useState } from "react";
import { Search, Plus, ChevronRight, Inbox as InboxIcon, Sun, CalendarClock, Moon, Tag, ArrowDownWideNarrow, Command as CommandIcon, Home as HomeIcon, UtensilsCrossed, FolderKanban, Sparkles, ListChecks, PanelLeftClose } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { PlannerTaskRow } from "./PlannerTaskRow";
import { format, parseISO, isAfter, startOfDay, isSameDay } from "date-fns";
import type { Task } from "@/lib/types";
import { AREAS } from "@/lib/types";
import { usePlannerSort, usePlannerTagFilter, type PlannerSort } from "@/lib/planner-prefs";
import { parseTaskInput } from "@/lib/nlp-task";
import { useHomeMaintenance, bucketOf } from "@/lib/home-maintenance";
import { MealPickerPopover } from "@/components/meals/MealPickerPopover";
import { MEAL_SLOTS } from "@/components/planner/PlannerMealLane";
import { routines as routinesApi, useRoutines, SLOT_LABEL } from "@/lib/routines";
import { BlockCheckbox } from "@/components/planner/BlockCheckbox";
import { toast } from "sonner";

interface Section {
  id: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  match: (t: Task) => boolean;
  defaultOpen?: boolean;
}

const AREA_SET = new Set(["Family","Health","Home","Meals","Personal","Money","Caregiving","Kids","Appointments","Creative Projects","Holidays & Birthdays"]);

/**
 * Shared task-source panel used by the Planner, Today and the Inbox planner.
 * Groups every place work can come from — Inbox, Today, Upcoming, Someday,
 * Areas, Projects — plus Home upkeep and the day's meals, all draggable
 * onto the time grid.
 */
export function TaskSourcePanel({ selectedDate, onQuickAdd, onCollapse }: { selectedDate: Date; onQuickAdd?: () => void; onCollapse?: () => void }) {
  const { state, addTask, addMeal, updateMeal, toggleHabit } = useStore();
  const { items: maintenance } = useHomeMaintenance();
  const { routines: routineList } = useRoutines();
  const [q, setQ] = useState("");
  const [sort, setSort] = usePlannerSort();
  const [tagFilter, setTagFilter] = usePlannerTagFilter();
  const [open, setOpen] = useState<Record<string, boolean>>({
    inbox: true, today: true, upcoming: false, someday: false,
  });
  const [inlineText, setInlineText] = useState("");
  const inlineParsed = inlineText ? parseTaskInput(inlineText) : null;

  const submitInline = async () => {
    const text = inlineText.trim();
    if (!text) return;
    const p = parseTaskInput(text);
    const iso = format(selectedDate, "yyyy-MM-dd");
    await addTask({
      title: p.title || text,
      area: p.area ?? "Personal",
      priority: p.priority ?? "medium",
      done: false,
      dueDate: p.dueDate ?? iso,
      startTime: p.time,
      estMinutes: p.estMinutes,
      tags: p.tags,
      energy: p.energy,
      inbox: false,
    } as any);
    toast.success("Added");
    setInlineText("");
  };

  const today = startOfDay(selectedDate);
  const todayISO = format(today, "yyyy-MM-dd");

  const allTags = useMemo(() => {
    const s = new Set<string>();
    for (const t of state.tasks) for (const tg of t.tags ?? []) s.add(tg);
    return Array.from(s).sort();
  }, [state.tasks]);

  const tasks = useMemo(() => {
    const base = state.tasks.filter(t => !t.done && !t.parentTaskId);
    let filtered = q ? base.filter(t => t.title.toLowerCase().includes(q.toLowerCase())) : base;
    if (tagFilter.length > 0) filtered = filtered.filter(t => (t.tags ?? []).some(tg => tagFilter.includes(tg)));
    return sortTasks(filtered, sort);
  }, [state.tasks, q, sort, tagFilter]);

  const sections: Section[] = [
    { id: "inbox", label: "Inbox", Icon: InboxIcon, match: (t) => !!t.inbox || (t.status === "active" && !t.dueDate && !t.startTime), defaultOpen: true },
    { id: "today", label: "Today", Icon: Sun, match: (t) => !!t.dueDate && isSameDay(parseISO(t.dueDate), today), defaultOpen: true },
    { id: "upcoming", label: "Upcoming", Icon: CalendarClock, match: (t) => !!t.dueDate && isAfter(parseISO(t.dueDate), today) },
    { id: "someday", label: "Someday", Icon: Moon, match: (t) => t.status === "someday" },
  ];

  const usedIds = new Set<string>();
  const grouped = sections.map(s => {
    const rows = tasks.filter(t => { if (usedIds.has(t.id)) return false; if (s.match(t)) { usedIds.add(t.id); return true; } return false; });
    return { ...s, rows };
  });

  // Area groups from remaining tasks
  const remaining = tasks.filter(t => !usedIds.has(t.id));
  const areaGroups = AREAS.filter(a => AREA_SET.has(a)).map(area => ({
    id: `area:${area}`,
    label: area,
    rows: remaining.filter(t => t.area === area),
  })).filter(g => g.rows.length > 0);

  const toggle = (id: string) => setOpen(o => ({ ...o, [id]: !o[id] }));

  // Projects with open work (tasks not already claimed by a section above).
  const projectGroups = (state.projects ?? [])
    .filter(p => !p.archivedAt)
    .map(p => ({
      id: `project:${p.id}`,
      label: p.name,
      rows: remaining.filter(t => t.projectId === p.id),
    }))
    .filter(g => g.rows.length > 0);

  // Home upkeep: maintenance items that are overdue or due soon.
  const homeItems = maintenance.filter(m => {
    const b = bucketOf(m, today);
    return b === "overdue" || b === "due_soon";
  });

  const scheduleHomeItem = async (title: string) => {
    await addTask({
      title, area: "Home", priority: "medium", done: false,
      dueDate: todayISO, inbox: false,
    } as any);
    toast.success("Added to the day");
  };

  return (
    <aside className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/40">
      <header className="border-b border-border/60 p-3">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-display text-sm font-semibold tracking-wide">Tasks</h2>
          <div className="flex items-center gap-0.5">
            {onQuickAdd && (
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onQuickAdd} aria-label="Open advanced capture">
                <CommandIcon className="h-3.5 w-3.5" />
              </Button>
            )}
            {onCollapse && (
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onCollapse} aria-label="Collapse task sidebar">
                <PanelLeftClose className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
        {/* Inline quick add */}
        <div className="mb-2">
          <div className="relative">
            <Plus className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-primary" />
            <Input
              value={inlineText}
              onChange={(e) => setInlineText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); void submitInline(); }
                if (e.key === "Escape") setInlineText("");
              }}
              placeholder="Add a task…"
              className="h-8 pl-7 text-xs"
            />
          </div>
          {inlineParsed && inlineParsed.chips.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {inlineParsed.chips.map((c, i) => (
                <span key={i} className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-primary">
                  {c.label}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tasks" className="h-8 pl-7 text-xs" />
        </div>
        <div className="mt-2 flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" className="h-6 gap-1 px-2 text-[10px] uppercase tracking-wide">
                <ArrowDownWideNarrow className="h-3 w-3" />Sort: {sort}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-40">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider">Sort by</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(["manual","priority","due","duration","category","recent"] as PlannerSort[]).map(k => (
                <DropdownMenuItem key={k} onSelect={() => setSort(k)}
                  className={cn("capitalize", sort === k && "bg-accent")}>{k}</DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" variant="ghost" className="h-6 gap-1 px-2 text-[10px] uppercase tracking-wide">
                <Tag className="h-3 w-3" />Tags{tagFilter.length > 0 ? ` · ${tagFilter.length}` : ""}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-56 p-2">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Filter by tag</p>
              {allTags.length === 0 ? <p className="text-xs text-muted-foreground">No tags yet.</p> :
                <div className="max-h-56 space-y-0.5 overflow-y-auto">
                  {allTags.map(t => {
                    const on = tagFilter.includes(t);
                    return (
                      <button key={t}
                        onClick={() => setTagFilter(on ? tagFilter.filter(x => x !== t) : [...tagFilter, t])}
                        className={cn("flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-xs hover:bg-muted",
                          on && "bg-primary/10 text-primary")}>
                        <span className={cn("h-3 w-3 rounded border", on ? "border-primary bg-primary" : "border-muted-foreground/40")} />
                        #{t}
                      </button>
                    );
                  })}
                </div>}
              {tagFilter.length > 0 && (
                <Button size="sm" variant="ghost" className="mt-1 h-7 w-full text-[10px]" onClick={() => setTagFilter([])}>Clear</Button>
              )}
            </PopoverContent>
          </Popover>
        </div>
      </header>

      <div className="flex-1 space-y-1 overflow-y-auto p-2">
        {grouped.map(g => (
          <SectionBlock key={g.id} id={g.id} label={g.label} Icon={g.Icon} count={g.rows.length}
            open={open[g.id] ?? g.defaultOpen ?? false} onToggle={toggle}>
            {g.rows.length === 0 ? (
              <p className="px-2 py-2 text-[11px] text-muted-foreground">Nothing here.</p>
            ) : g.rows.map(t => <PlannerTaskRow key={t.id} task={t} />)}
          </SectionBlock>
        ))}
        {areaGroups.length > 0 && (
          <div className="mt-3 border-t border-border/50 pt-2">
            <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Areas</p>
            {areaGroups.map(g => (
              <SectionBlock key={g.id} id={g.id} label={g.label} count={g.rows.length}
                open={open[g.id] ?? false} onToggle={toggle}>
                {g.rows.map(t => <PlannerTaskRow key={t.id} task={t} />)}
              </SectionBlock>
            ))}
          </div>
        )}

        {projectGroups.length > 0 && (
          <div className="mt-3 border-t border-border/50 pt-2">
            <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Projects</p>
            {projectGroups.map(g => (
              <SectionBlock key={g.id} id={g.id} label={g.label} Icon={FolderKanban} count={g.rows.length}
                open={open[g.id] ?? false} onToggle={toggle}>
                {g.rows.map(t => <PlannerTaskRow key={t.id} task={t} />)}
              </SectionBlock>
            ))}
          </div>
        )}

        <div className="mt-3 border-t border-border/50 pt-2">
          <SectionBlock id="home" label="Home upkeep" Icon={HomeIcon} count={homeItems.length}
            open={open.home ?? false} onToggle={toggle}>
            {homeItems.length === 0 ? (
              <p className="px-2 py-2 text-[11px] text-muted-foreground">Nothing due right now.</p>
            ) : homeItems.map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => void scheduleHomeItem(m.title)}
                className="flex w-full items-center gap-2 rounded-lg border border-border/50 bg-card/70 px-2 py-1.5 text-left text-[13px] hover:border-primary/40"
              >
                <HomeIcon className="h-3.5 w-3.5 shrink-0 text-emerald-500" aria-hidden />
                <span className="min-w-0 flex-1 truncate">{m.title}</span>
                <Plus className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
              </button>
            ))}
          </SectionBlock>

          <SectionBlock id="meals" label="Meals" Icon={UtensilsCrossed} count={MEAL_SLOTS.length}
            open={open.meals ?? false} onToggle={toggle}>
            {MEAL_SLOTS.map(slot => {
              const meal = state.meals.find(m => m.date === todayISO && m.slot === slot.slot);
              return (
                <MealPickerPopover
                  key={slot.slot}
                  onPick={(picked) => {
                    if (meal) void updateMeal(meal.id, { name: picked.name, prepMinutes: picked.prep_minutes ?? undefined, ingredients: picked.ingredients, steps: picked.steps, tags: picked.tags });
                    else void addMeal({ name: picked.name, date: todayISO, slot: slot.slot, prepMinutes: picked.prep_minutes ?? undefined, ingredients: picked.ingredients, steps: picked.steps, tags: picked.tags });
                  }}
                  trigger={
                    <button
                      type="button"
                      aria-label={meal ? `Change ${slot.label}` : `Plan ${slot.label}`}
                      className="flex w-full items-center gap-2 rounded-lg border border-border/50 bg-card/70 px-2 py-1.5 text-left text-[13px] hover:border-primary/40"
                    >
                      <UtensilsCrossed className="h-3.5 w-3.5 shrink-0 text-yellow-500" aria-hidden />
                      <span className="shrink-0 text-[11px] uppercase tracking-wide text-muted-foreground">{slot.label}</span>
                      <span className={cn("min-w-0 flex-1 truncate", !meal && "text-muted-foreground")}>
                        {meal ? meal.name : "Nothing planned"}
                      </span>
                    </button>
                  }
                />
              );
            })}
          </SectionBlock>

          <SectionBlock id="habits" label="Habits" Icon={Sparkles} count={filteredHabits.length}
            open={open.habits ?? false} onToggle={toggle}>
            {filteredHabits.map((h: any) => {
              const done = !!h.log?.[todayISO];
              return (
                <div key={h.id} className="flex items-start gap-2 rounded-lg border border-border/50 bg-card/70 px-2 py-1.5 text-[13px]">
                  <BlockCheckbox done={done} title={h.name ?? h.title ?? "Habit"} onToggle={() => void toggleHabit(h.id)} className="mt-0.5" />
                  <span className={cn("min-w-0 flex-1 [overflow-wrap:anywhere]", done && "line-through opacity-60")}>
                    {h.name ?? h.title}
                  </span>
                </div>
              );
            })}
          </SectionBlock>

          <SectionBlock id="routines" label="Routines" Icon={ListChecks} count={filteredRoutines.length}
            open={open.routines ?? false} onToggle={toggle}>
            {filteredRoutines.map(r => (
              <div key={r.id} className="space-y-1 pb-1">
                <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {r.person_name} · {SLOT_LABEL[r.slot]}
                </p>
                {r.items.map(item => (
                  <div key={item.id} className="flex items-start gap-2 rounded-lg border border-border/50 bg-card/70 px-2 py-1.5 text-[13px]">
                    <BlockCheckbox done={!!item.done} title={item.text}
                      onToggle={() => void routinesApi.toggleItem(r.person_name, r.slot, item.id)} className="mt-0.5" />
                    <span className={cn("min-w-0 flex-1 [overflow-wrap:anywhere]", item.done && "line-through opacity-60")}>
                      {item.text}
                    </span>
                  </div>
                ))}
                <form
                  className="px-1"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const text = (routineDraft[r.id] ?? "").trim();
                    if (!text) return;
                    void routinesApi.addItem(r.person_name, r.slot, text);
                    setRoutineDraft(d => ({ ...d, [r.id]: "" }));
                  }}
                >
                  <input
                    value={routineDraft[r.id] ?? ""}
                    onChange={(e) => setRoutineDraft(d => ({ ...d, [r.id]: e.target.value }))}
                    aria-label={`Add a step to ${r.person_name} ${SLOT_LABEL[r.slot]} routine`}
                    placeholder="Add a step…"
                    className="w-full rounded-lg border border-dashed border-border/60 bg-transparent px-2 py-1 text-[12px] outline-none placeholder:text-muted-foreground/70 focus:border-primary/50"
                  />
                </form>
              </div>
            ))}
          </SectionBlock>
        </div>
      </div>
    </aside>
  );
}


function SectionBlock({ id, label, Icon, count, open, onToggle, children }: {
  id: string; label: string; Icon?: React.ComponentType<{ className?: string }>;
  count: number; open: boolean; onToggle: (id: string) => void; children: React.ReactNode;
}) {
  const empty = count === 0;
  return (
    <div>
      <button
        onClick={() => { if (!empty) onToggle(id); }}
        aria-expanded={empty ? undefined : open}
        aria-disabled={empty || undefined}
        className={cn(
          "flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-xs font-semibold hover:bg-muted/60",
          empty ? "cursor-default text-muted-foreground/60 hover:bg-transparent" : "text-foreground/90",
        )}
      >
        <ChevronRight className={cn("h-3 w-3 transition-transform", open && !empty && "rotate-90", empty && "opacity-30")} />
        {Icon && <Icon className="h-3.5 w-3.5 opacity-70" />}
        <span className="flex-1 truncate">{label}</span>
        <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground", !empty && "bg-muted")}>{count}</span>
      </button>
      {open && !empty && <div className="ml-1 space-y-1 py-1">{children}</div>}
    </div>
  );
}

function sortTasks(tasks: Task[], sort: PlannerSort): Task[] {
  const arr = tasks.slice();
  const PRI: Record<string, number> = { high: 0, medium: 1, low: 2 };
  switch (sort) {
    case "due":
      return arr.sort((a, b) => (a.dueDate ?? "z").localeCompare(b.dueDate ?? "z"));
    case "priority":
      return arr.sort((a, b) => (PRI[a.priority] ?? 3) - (PRI[b.priority] ?? 3));
    case "duration":
      return arr.sort((a, b) => (a.estMinutes ?? 0) - (b.estMinutes ?? 0));
    case "category":
      return arr.sort((a, b) => (a.area ?? "").localeCompare(b.area ?? ""));
    case "recent":
      return arr.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
    case "manual":
    default:
      return arr.sort((a, b) => {
        const ao = a.sortOrder ?? 0, bo = b.sortOrder ?? 0;
        if (ao !== bo) return ao - bo;
        const ap = a.isTopThree ? 0 : 1, bp = b.isTopThree ? 0 : 1;
        if (ap !== bp) return ap - bp;
        return (PRI[a.priority] ?? 3) - (PRI[b.priority] ?? 3);
      });
  }
}