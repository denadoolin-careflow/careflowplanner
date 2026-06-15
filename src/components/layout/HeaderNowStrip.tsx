import { useEffect, useMemo, useState } from "react";
import { format, isToday } from "date-fns";
import { Link, useNavigate } from "react-router-dom";
import {
  Cloud, CloudDrizzle, CloudFog, CloudRain, CloudSnow, CloudSun,
  Moon, Sun, Zap, CheckCircle2, Circle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useWeatherSnapshot, useTempUnit, cToF } from "@/lib/weather-store";
import { useEnsureWeather } from "@/lib/use-ensure-weather";
import type { WeatherCondition } from "@/lib/weather";
import { UnitToggle } from "@/components/weather/UnitToggle";
import { WeatherDetailPopover } from "@/components/weather/WeatherDetailPopover";
import { weatherTheme } from "@/lib/weather-theme";
import { useStore } from "@/lib/store";
import { todayISO } from "@/lib/store";
import type { Task } from "@/lib/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAtmosphere } from "@/lib/atmospheres";
import { RoutinesMini } from "@/components/routines/RoutinesMini";
import { QuickAddBar } from "@/components/today/QuickAddBar";
import { parseTaskInput } from "@/lib/nlp-task";
import { Plus, BookHeart, FileText, StickyNote, Pencil } from "lucide-react";
import { getOrCreateDailyNote, createNote } from "@/lib/notes";
import { toast } from "sonner";
import { haptics } from "@/lib/haptics";
import { openTaskEditor } from "@/lib/open-task-editor";

function atmoColor(palette: string[], index: number, alpha?: number): string {
  const hex = palette[index % palette.length];
  if (alpha == null || alpha === 1) return hex;
  return `color-mix(in srgb, ${hex} ${Math.round(alpha * 100)}%, transparent)`;
}

function CondIcon({ c, isNight, className }: { c: WeatherCondition; isNight?: boolean; className?: string }) {
  const cls = cn("h-5 w-5", className);
  if (c === "clear") return isNight ? <Moon className={cls} /> : <Sun className={cls} />;
  if (c === "partly-cloudy") return <CloudSun className={cls} />;
  if (c === "cloudy") return <Cloud className={cls} />;
  if (c === "fog") return <CloudFog className={cls} />;
  if (c === "drizzle") return <CloudDrizzle className={cls} />;
  if (c === "rain") return <CloudRain className={cls} />;
  if (c === "snow") return <CloudSnow className={cls} />;
  if (c === "thunderstorm") return <Zap className={cls} />;
  return <Cloud className={cls} />;
}

function TaskMiniRow({ t, navigate }: { t: Task; navigate: ReturnType<typeof useNavigate> }) {
  const { toggleTask } = useStore();
  const [completing, setCompleting] = useState(false);
  const onToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!t.done) {
      setCompleting(true);
      haptics.success();
      setTimeout(() => setCompleting(false), 900);
    } else {
      haptics.tap();
    }
    try { await toggleTask(t.id); } catch { /* */ }
  };
  return (
    <div
      key={t.id}
      className={cn(
        "group flex w-full items-start gap-1.5 rounded-md px-1 py-1 transition hover:bg-muted/60",
        completing && "task-completing",
      )}
    >
      <button
        type="button"
        aria-label={t.done ? "Mark incomplete" : "Mark complete"}
        onClick={onToggle}
        data-no-haptic
        className="mt-0.5 shrink-0 rounded-full p-0.5 hover:bg-background/70"
      >
        {t.done ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
        ) : (
          <Circle className="h-3.5 w-3.5 text-muted-foreground/50" />
        )}
      </button>
      <button
        type="button"
        onClick={() => navigate(`/today?task=${t.id}`)}
        className="min-w-0 flex-1 text-left"
      >
        <span className={cn("line-clamp-2 text-xs leading-snug", t.done && "text-muted-foreground line-through")}>
          {t.title}
        </span>
      </button>
      <button
        type="button"
        aria-label="Edit task"
        onClick={(e) => { e.stopPropagation(); openTaskEditor(t.id); }}
        className="opacity-0 group-hover:opacity-100 focus:opacity-100 mt-0.5 shrink-0 rounded p-0.5 text-muted-foreground hover:bg-background/70 hover:text-foreground transition"
      >
        <Pencil className="h-3 w-3" />
      </button>
    </div>
  );
}

function TodayPreview({ tasks, navigate }: { tasks: Task[]; navigate: ReturnType<typeof useNavigate> }) {
  const isoToday = todayISO();
  const { addTask } = useStore();
  const groups = useMemo(() => {
    const all = tasks
      .filter((t) => t.dueDate === isoToday && t.status !== "parked" && !t.parentTaskId)
      .sort((a, b) => {
        if (!!b.isTopThree !== !!a.isTopThree) return b.isTopThree ? 1 : -1;
        const rank: Record<string, number> = { high: 0, medium: 1, low: 2 };
        return (
          (rank[a.priority ?? "medium"] - rank[b.priority ?? "medium"]) ||
          ((a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        );
      });
    const morning = all.filter((t) => t.dayPart === "Morning");
    const afternoon = all.filter((t) => t.dayPart === "Afternoon");
    const evening = all.filter((t) => t.dayPart === "Evening" || t.dayPart === "Late Night");
    const anytime = all.filter((t) => !t.dayPart);
    return { morning, afternoon, evening, anytime };
  }, [tasks, isoToday]);

  const sections: { label: string; items: Task[] }[] = [
    { label: "Morning", items: groups.morning },
    { label: "Afternoon", items: groups.afternoon },
    { label: "Evening", items: groups.evening },
    { label: "Anytime", items: groups.anytime },
  ];

  const total = sections.reduce((s, sec) => s + sec.items.length, 0);

  return (
    <div className="w-96 max-h-[min(85vh,42rem)] overflow-y-auto p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Today</div>
        <span className="text-[10px] font-medium text-muted-foreground">{total} tasks</span>
      </div>
      <div className="mb-3">
        <QuickAddBar date={new Date()} />
      </div>
      <div className="space-y-3 pr-1">
        {sections.map((sec) => (
          <div key={sec.label}>
            <div className="mb-1 flex items-center justify-between">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                {sec.label}
              </div>
              <span className="text-[10px] tabular-nums text-muted-foreground/60">{sec.items.length}</span>
            </div>
            <div className="space-y-0.5">
              {sec.items.length === 0 ? (
                <p className="px-1 text-[11px] italic text-muted-foreground/70">No tasks yet.</p>
              ) : (
                sec.items.map((t) => <TaskMiniRow key={t.id} t={t} navigate={navigate} />)
              )}
            </div>
            {sec.label !== "Anytime" && (
              <SlotQuickAdd
                slotLabel={sec.label as "Morning" | "Afternoon" | "Evening"}
                isoDate={isoToday}
                onAdd={async (parsed) => {
                  await addTask({
                    title: parsed.title,
                    dueDate: parsed.dueDate ?? isoToday,
                    dayPart: sec.label as "Morning" | "Afternoon" | "Evening",
                    priority: parsed.priority,
                    area: parsed.area,
                    tags: parsed.tags,
                    energy: parsed.energy,
                    estMinutes: parsed.estMinutes,
                  });
                  toast.success(`Added → ${sec.label}`);
                }}
              />
            )}
          </div>
        ))}
      </div>
      <RoutinesMini />
      <div className="mt-2 border-t border-border/40 pt-2 space-y-1.5">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={async () => {
              try {
                const n = await getOrCreateDailyNote(isoToday);
                navigate(`/notes/${n.id}`);
              } catch { toast.error("Couldn't open today's note"); }
            }}
            className="inline-flex flex-1 items-center justify-center gap-1 rounded-md border border-border/50 bg-background/60 px-2 py-1 text-[10px] font-medium text-foreground/80 hover:bg-background"
          >
            <FileText className="h-3 w-3 text-primary" /> Daily note
          </button>
          <button
            type="button"
            onClick={async () => {
              try {
                const n = await createNote({});
                navigate(`/notes/${n.id}`);
              } catch { toast.error("Couldn't create note"); }
            }}
            className="inline-flex flex-1 items-center justify-center gap-1 rounded-md border border-border/50 bg-background/60 px-2 py-1 text-[10px] font-medium text-foreground/80 hover:bg-background"
          >
            <StickyNote className="h-3 w-3 text-primary" /> New note
          </button>
          <button
            type="button"
            onClick={() => navigate("/journal")}
            className="inline-flex flex-1 items-center justify-center gap-1 rounded-md border border-border/50 bg-background/60 px-2 py-1 text-[10px] font-medium text-foreground/80 hover:bg-background"
          >
            <BookHeart className="h-3 w-3 text-primary" /> Journal
          </button>
        </div>
        <Link
          to="/today"
          className="block text-[11px] font-medium text-primary hover:underline"
        >
          Open Today →
        </Link>
      </div>
    </div>
  );
}

function SlotQuickAdd({
  slotLabel, isoDate, onAdd,
}: {
  slotLabel: "Morning" | "Afternoon" | "Evening";
  isoDate: string;
  onAdd: (parsed: ReturnType<typeof parseTaskInput>) => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = text.trim();
    if (!v) return;
    setBusy(true);
    try {
      const parsed = parseTaskInput(v);
      await onAdd(parsed);
      setText("");
    } finally { setBusy(false); }
  };
  void isoDate;
  return (
    <form
      onSubmit={submit}
      className="mt-1 flex items-center gap-1 rounded-lg border border-border/50 bg-background/60 px-2 py-1"
    >
      <Plus className="h-3 w-3 shrink-0 text-muted-foreground" />
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={`Quick add to ${slotLabel.toLowerCase()}…`}
        className="min-w-0 flex-1 bg-transparent text-[11px] outline-none placeholder:text-muted-foreground/70"
      />
      <button
        type="submit"
        disabled={!text.trim() || busy}
        className="rounded-md bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary disabled:opacity-40"
      >
        Add
      </button>
    </form>
  );
}

function DueNextRow({ t, navigate }: { t: Task; navigate: ReturnType<typeof useNavigate> }) {
  const { toggleTask } = useStore();
  const [completing, setCompleting] = useState(false);
  const onToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!t.done) {
      setCompleting(true);
      haptics.success();
      setTimeout(() => setCompleting(false), 900);
    } else {
      haptics.tap();
    }
    try { await toggleTask(t.id); } catch { /* */ }
  };
  return (
    <li
      className={cn(
        "group flex items-start gap-1.5 rounded-md px-1 py-1 transition hover:bg-muted/60",
        completing && "task-completing",
      )}
    >
      <button
        type="button"
        aria-label={t.done ? "Mark incomplete" : "Mark complete"}
        onClick={onToggle}
        data-no-haptic
        className="mt-0.5 shrink-0 rounded-full p-0.5 hover:bg-background/70"
      >
        {t.done ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
        ) : (
          <Circle className="h-3.5 w-3.5 text-muted-foreground/50" />
        )}
      </button>
      <button
        type="button"
        onClick={() => navigate(`/today?task=${t.id}`)}
        className="min-w-0 flex-1 text-left"
      >
        <span className={cn("line-clamp-2 text-xs leading-snug text-foreground", t.done && "text-muted-foreground line-through")}>
          {t.title}
        </span>
      </button>
      <button
        type="button"
        aria-label="Edit task"
        onClick={(e) => { e.stopPropagation(); openTaskEditor(t.id); }}
        className="opacity-0 group-hover:opacity-100 focus:opacity-100 mt-0.5 shrink-0 rounded p-0.5 text-muted-foreground hover:bg-background/70 hover:text-foreground transition"
      >
        <Pencil className="h-3 w-3" />
      </button>
    </li>
  );
}

function DueNextPreview({ tasks, slotLabel }: { tasks: Task[]; slotLabel: string }) {
  const navigate = useNavigate();
  return (
    <div className="w-60 p-3">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        What's due next · {slotLabel}
      </div>
      {tasks.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nothing on your plate right now.</p>
      ) : (
        <ul className="space-y-0.5">
          {tasks.map(t => (
            <DueNextRow key={t.id} t={t} navigate={navigate} />
          ))}
        </ul>
      )}
      <div className="mt-2 border-t border-border/40 pt-2">
        <Link
          to={`/today#slot-${slotLabel.toLowerCase()}`}
          className="block text-[11px] font-medium text-primary hover:underline"
        >
          Open Today →
        </Link>
      </div>
    </div>
  );
}

export function HeaderNowStrip({ className }: { className?: string }) {
  useEnsureWeather();
  const { atmosphere } = useAtmosphere();
  const chipBorder = {
    borderColor: atmoColor(atmosphere.palette, 1, 0.45),
  } as React.CSSProperties;
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const snap = useWeatherSnapshot();
  const [unit] = useTempUnit();
  const navigate = useNavigate();

  const time = useMemo(() => format(now, "h:mm a"), [now]);
  const date = useMemo(() => format(now, "EEE, MMM d"), [now]);
  const currentSlot = useMemo<"morning" | "afternoon" | "evening">(() => {
    const h = now.getHours();
    if (h < 12) return "morning";
    if (h < 17) return "afternoon";
    return "evening";
  }, [now]);
  const slotLabel = currentSlot[0].toUpperCase() + currentSlot.slice(1);
  const tempStr = snap ? `${unit === "F" ? cToF(snap.tempC) : Math.round(snap.tempC)}°` : null;
  const fmtT = (c: number) => `${unit === "F" ? cToF(c) : Math.round(c)}°`;
  const rangeStr = snap ? `${fmtT(snap.highC)} / ${fmtT(snap.lowC)}` : null;
  const upcoming = useMemo(
    () => (snap?.daily ?? []).filter(d => !isToday(d.dateObj)).slice(0, 4),
    [snap],
  );

  const { state } = useStore();
  const isoToday = useMemo(() => todayISO(), [now]);
  const slotTasks = useMemo(() => {
    const slotLabel = currentSlot[0].toUpperCase() + currentSlot.slice(1);
    return state.tasks
      .filter(
        (t) =>
          t.dueDate === isoToday &&
          !t.done &&
          t.status !== "parked" &&
          t.dayPart === slotLabel &&
          !t.parentTaskId
      )
      .sort((a, b) => {
        if (!!b.isTopThree !== !!a.isTopThree) return b.isTopThree ? 1 : -1;
        const rank: Record<string, number> = { high: 0, medium: 1, low: 2 };
        return (
          (rank[a.priority ?? "medium"] - rank[b.priority ?? "medium"]) ||
          ((a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        );
      })
      .slice(0, 3);
  }, [state.tasks, isoToday, currentSlot]);

  const ring = snap ? weatherTheme(snap.condition, snap.isNight).ring : "";

  return (
    <div className={cn("flex items-center gap-2 text-sm min-w-0", className)}>
      {/* ───── Mobile (compact chips) ───── */}
      <div className="flex items-center gap-1 md:hidden overflow-x-auto no-scrollbar max-w-full flex-nowrap">
        <Popover>
          <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={`Open today's ${slotLabel} tasks`}
            title={`${slotLabel} tasks`}
            style={chipBorder}
            className="inline-flex shrink-0 items-center gap-1 rounded-full border bg-muted px-1.5 py-0.5 tabular-nums text-[11px] font-medium text-foreground hover:bg-muted/80 transition"
          >
              {time}
              {slotTasks.length > 0 && (
                <span className="ml-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-primary text-[7px] font-bold text-primary-foreground">
                  {slotTasks.length}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" sideOffset={6} className="w-60 p-0">
            <DueNextPreview tasks={slotTasks} slotLabel={slotLabel} />
          </PopoverContent>
        </Popover>
        {snap && tempStr && (
          <WeatherDetailPopover
            trigger={
              <button
                type="button"
                style={chipBorder}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1 rounded-full border bg-muted px-1.5 py-0.5 text-[11px] text-foreground hover:bg-muted/80 transition ring-1 ring-transparent",
                  ring,
                )}
                title={snap.conditionLabel ?? undefined}
                aria-label={`Weather: ${snap.conditionLabel ?? "unknown"} ${tempStr}`}
              >
                <CondIcon c={snap.condition} isNight={snap.isNight} className="h-3.5 w-3.5" />
                <span className="tabular-nums font-medium">{tempStr}</span>
              </button>
            }
          />
        )}
      </div>


      {/* ───── Desktop / tablet (inline full strip) ───── */}
      <div className="hidden items-center gap-2 md:flex overflow-x-auto no-scrollbar max-w-full flex-nowrap">
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={`Open today's ${slotLabel} tasks`}
            title={`${slotLabel} tasks`}
            style={chipBorder}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border bg-muted px-2.5 py-1.5 tabular-nums font-medium text-foreground hover:bg-muted/80 transition"
          >
            {time}
            {slotTasks.length > 0 && (
              <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                {slotTasks.length}
              </span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" sideOffset={6} className="w-60 p-0">
          <DueNextPreview tasks={slotTasks} slotLabel={slotLabel} />
        </PopoverContent>
      </Popover>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Open today's tasks"
            title="Today's tasks"
            style={chipBorder}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border bg-muted px-2.5 py-1.5 text-foreground hover:bg-muted/80 transition"
          >
            {date}
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" sideOffset={6} className="w-auto p-0">
          <TodayPreview tasks={state.tasks} navigate={navigate} />
        </PopoverContent>
      </Popover>
      {snap && tempStr && (
        <WeatherDetailPopover
          trigger={
            <button
              type="button"
              style={chipBorder}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full border bg-muted px-2.5 py-1.5 text-foreground hover:bg-muted/80 transition ring-1 ring-transparent hover:ring-2",
                weatherTheme(snap.condition, snap.isNight).ring,
              )}
              title={snap.conditionLabel ?? undefined}
            >
              <CondIcon c={snap.condition} isNight={snap.isNight} />
              <span className="tabular-nums font-medium">{tempStr}</span>
              {rangeStr && (
                <span className="tabular-nums opacity-75">· {rangeStr}</span>
              )}
              {snap.conditionLabel && (
                <span className="hidden truncate opacity-80 lg:inline">· {snap.conditionLabel}</span>
              )}
              <span className="max-w-[100px] truncate opacity-75">· {snap.locationLabel}</span>
            </button>
          }
        />
      )}
      {upcoming.length > 0 && (
        <WeatherDetailPopover
          trigger={
            <button
              type="button"
              style={chipBorder}
              className="hidden shrink-0 items-center gap-1 rounded-full border bg-muted px-2 py-1 text-foreground hover:bg-muted/80 transition xl:inline-flex"
              title="Open weather details"
            >
              {upcoming.map(d => (
                <span
                  key={d.date}
                  className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5"
                >
                  <span className="text-[11px] uppercase tracking-wide opacity-70">
                    {format(d.dateObj, "EEE")}
                  </span>
                  <CondIcon c={d.condition} className="h-4 w-4" />
                  <span className="tabular-nums text-xs font-medium">{fmtT(d.highC)}</span>
                  <span className="tabular-nums text-xs opacity-65">{fmtT(d.lowC)}</span>
                </span>
              ))}
            </button>
          }
        />
      )}
      <UnitToggle />
      </div>
    </div>
  );
}