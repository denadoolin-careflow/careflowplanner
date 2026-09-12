import { useMemo, useState } from "react";
import { addDays, format, parseISO } from "date-fns";
import { CalendarClock, ChevronRight, CircleAlert, Clock3, MoreHorizontal, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePlannerFeed, type PlannerFeedItem } from "@/lib/planner/feed";
import { KIND_ICONS } from "./kindIcon";
import { fmt12 } from "@/lib/planner/day-plan";
import { getDayTheme } from "@/lib/planner/day-theme";
import { dayLoad, loadLevel } from "@/lib/planner/month-move";
import { cn } from "@/lib/utils";

const FILTERS = ["All", "Tasks", "Events", "Meals", "Care"] as const;
type Filter = typeof FILTERS[number];

function matches(item: PlannerFeedItem, filter: Filter) {
  if (filter === "All") return true;
  if (filter === "Tasks") return item.kind === "task";
  if (filter === "Events") return item.kind === "appt" || item.kind === "gcal";
  if (filter === "Meals") return item.kind === "meal";
  return item.kind === "care" || item.area === "Caregiving" || item.area === "Family" || item.area === "Kids";
}

function ScheduleRow({ item, onOpen, onMove }: { item: PlannerFeedItem; onOpen: (item: PlannerFeedItem) => void; onMove?: (item: PlannerFeedItem) => void }) {
  const Icon = KIND_ICONS[item.kind];
  return (
    <div draggable={["task", "appointment", "meal"].includes(item.sourceRef.type)} onDragStart={e => {
      e.dataTransfer.setData("application/x-planner-item", `${item.sourceRef.type}:${item.sourceRef.id}`);
      e.dataTransfer.effectAllowed = "move";
    }} className={cn("group flex min-h-11 items-start gap-2 border-b border-border/45 py-2.5 last:border-0", item.done && "opacity-55")}>
      <span className="w-12 shrink-0 pt-0.5 text-[11px] font-semibold tabular-nums text-muted-foreground">{item.time ? fmt12(item.time) : "Anytime"}</span>
      <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md bg-muted"><Icon className="h-3.5 w-3.5" style={{ color: item.color }} /></span>
      <button type="button" onClick={() => onOpen(item)} className="min-w-0 flex-1 text-left">
        <span className="block text-[13px] font-semibold leading-snug text-foreground">{item.title}</span>
        {(item.location || item.area) && <span className="block truncate text-[10px] text-muted-foreground">{item.location || item.area}</span>}
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 opacity-70 sm:opacity-0 sm:group-hover:opacity-100" aria-label={`Actions for ${item.title}`}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
        <DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => onOpen(item)}>Open details</DropdownMenuItem>{onMove && <DropdownMenuItem onSelect={() => onMove(item)}>Change date</DropdownMenuItem>}</DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function MonthPlannerPanel({ selectedDate, onOpen, onAdd, onOpenDay, onMove }: {
  selectedDate: Date;
  onOpen: (item: PlannerFeedItem) => void;
  onAdd: () => void;
  onOpenDay: (date: Date) => void;
  onMove?: (item: PlannerFeedItem) => void;
}) {
  const [tab, setTab] = useState("schedule");
  const [filter, setFilter] = useState<Filter>("All");
  const { items: upcoming } = usePlannerFeed(selectedDate, 8);
  const key = format(selectedDate, "yyyy-MM-dd");
  const todayItems = upcoming.filter(item => item.date === key);
  const load = loadLevel(dayLoad(todayItems));
  const rhythm = getDayTheme(selectedDate);
  const groups = useMemo(() => {
    const map = new Map<string, PlannerFeedItem[]>();
    upcoming.filter(item => item.date > key && matches(item, filter)).forEach(item => map.set(item.date, [...(map.get(item.date) ?? []), item]));
    return Array.from(map.entries()).slice(0, 7);
  }, [filter, key, upcoming]);
  return (
    <aside className="month-planner-panel" aria-label="Month day details">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid h-10 w-full grid-cols-2 rounded-lg bg-muted/65 p-1">
          <TabsTrigger value="schedule" className="rounded-md text-xs">Day schedule</TabsTrigger>
          <TabsTrigger value="upcoming" className="rounded-md text-xs">Upcoming</TabsTrigger>
        </TabsList>
        <TabsContent value="schedule" className="mt-0">
          <div className="border-b border-border/55 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{format(selectedDate, "EEEE")}</p>
            <h3 className="font-display text-2xl font-semibold">{format(selectedDate, "MMMM d")}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{load.label} day · {todayItems.length ? `${todayItems.length} things gently held` : "space is open"}</p>
          </div>
          <div className="max-h-[48vh] overflow-y-auto">
            {todayItems.length ? todayItems.map(item => <ScheduleRow key={item.id} item={item} onOpen={onOpen} onMove={onMove} />) : <div className="py-10 text-center"><CalendarClock className="mx-auto h-6 w-6 text-muted-foreground" /><p className="mt-2 text-sm">Nothing planned yet.</p><p className="text-xs text-muted-foreground">Leave room to exhale, or add one anchor.</p></div>}
          </div>
          <div className="grid grid-cols-2 gap-2 border-t border-border/55 pt-3">
            <Button size="sm" onClick={onAdd} className="h-10"><Plus className="mr-1.5 h-4 w-4" />Add to this day</Button>
            <Button size="sm" variant="outline" onClick={() => onOpenDay(selectedDate)} className="h-10">Open day<ChevronRight className="ml-1 h-4 w-4" /></Button>
          </div>
        </TabsContent>
        <TabsContent value="upcoming" className="mt-0">
          <div className="flex gap-1 overflow-x-auto border-b border-border/55 py-3">
            {FILTERS.map(value => <Button key={value} size="sm" variant="ghost" onClick={() => setFilter(value)} aria-pressed={filter === value} className={cn("h-8 shrink-0 rounded-full px-2.5 text-[11px]", filter === value && "bg-primary text-primary-foreground")}>{value}</Button>)}
          </div>
          <div className="max-h-[55vh] space-y-3 overflow-y-auto py-2">
            {groups.length ? groups.map(([date, rows]) => <section key={date}><div className="sticky top-0 z-10 bg-card/95 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{format(parseISO(date), "EEE, MMM d")}</div>{rows.map(item => <ScheduleRow key={item.id} item={item} onOpen={onOpen} onMove={onMove} />)}</section>) : <p className="py-10 text-center text-sm text-muted-foreground">No upcoming items in this view.</p>}
          </div>
          <Button variant="ghost" size="sm" onClick={() => onOpenDay(addDays(selectedDate, 1))} className="mt-2 w-full">View the next day<ChevronRight className="ml-1 h-4 w-4" /></Button>
        </TabsContent>
      </Tabs>
      <section className="planner-lunar-card">
        <div className="flex gap-2"><span className="text-xl" aria-hidden>{rhythm.icon}</span><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Lunar & astrology</p><p className="text-sm font-semibold">{rhythm.moonLabel} · {rhythm.signSymbol} {rhythm.sign}</p></div></div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{rhythm.blurb}</p>
        <p className="mt-2 flex items-start gap-1.5 text-[11px] text-foreground"><Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-calendar-cosmic" />Optional reflection: supportive for {rhythm.goodFor.slice(0, 2).join(" and ")}.</p>
      </section>
      {load.steps >= 5 && <section className="planner-lighten-card"><CircleAlert className="h-4 w-4" /><div><p className="text-xs font-semibold">This day is holding a lot</p><p className="text-[11px] text-muted-foreground">Consider moving one flexible item to a lighter day.</p></div></section>}
    </aside>
  );
}
