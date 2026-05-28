import { useMemo, useState } from "react";
import { format, addDays } from "date-fns";
import { Moon, Sun, CheckCircle2, Calendar as CalIcon, Flame, Sparkles, ArrowRight, CloudSun, Wind } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { getMoonPhase, MOON_INFO } from "@/lib/moon";
import { useWeatherSnapshot, useTempUnit, formatTemp } from "@/lib/weather-store";
import { toast } from "sonner";
import { ExhaleFlow } from "./ExhaleFlow";

interface Props { date: Date }

export function EndOfDaySummary({ date }: Props) {
  const { state, updateTask } = useStore();
  const [unit] = useTempUnit();
  const weather = useWeatherSnapshot();
  const [rescheduling, setRescheduling] = useState(false);
  const [exhaleOpen, setExhaleOpen] = useState(false);

  const iso = format(date, "yyyy-MM-dd");
  const tomorrow = useMemo(() => addDays(date, 1), [date]);
  const tomorrowIso = format(tomorrow, "yyyy-MM-dd");

  const todaysTasks = state.tasks.filter(t => t.dueDate === iso && !t.parentTaskId);
  const done = todaysTasks.filter(t => t.done);
  const unfinished = todaysTasks.filter(t => !t.done);
  const total = todaysTasks.length;
  const pct = total === 0 ? 0 : Math.round((done.length / total) * 100);

  const moon = MOON_INFO[getMoonPhase(tomorrow)];
  const habitsToday = state.habits.filter(h => h.cadence === "daily");
  const habitsDone = habitsToday.filter(h => h.log[iso]).length;
  const tomorrowAppts = state.appointments
    .filter(a => a.date === tomorrowIso)
    .sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));
  const tomorrowFirst = tomorrowAppts[0];

  const rescheduleAll = async () => {
    if (unfinished.length === 0) return;
    setRescheduling(true);
    try {
      await Promise.all(
        unfinished.map(t => updateTask(t.id, { dueDate: tomorrowIso, inbox: false })),
      );
      toast(`Moved ${unfinished.length} ${unfinished.length === 1 ? "task" : "tasks"} to tomorrow`);
    } catch {
      toast.error("Couldn't move tasks. Try again?");
    } finally {
      setRescheduling(false);
    }
  };

  const closingNote =
    pct === 100 && total > 0 ? "You closed the loop on everything today. Rest well." :
    pct >= 70 ? "Most of it is done. That's plenty." :
    pct >= 30 ? "You moved through real things today." :
    total === 0 ? "A quiet day. Quiet counts." :
    "Today asked for softness. Tomorrow gets a fresh page.";

  return (
    <section
      aria-label="End of day summary"
      className="cozy-card overflow-hidden"
    >
      <div className="relative gradient-calm p-4 sm:p-5">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(50% 70% at 80% 20%, hsl(var(--accent)/0.18), transparent 70%), radial-gradient(60% 90% at 10% 100%, hsl(var(--primary)/0.18), transparent 70%)",
          }}
        />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
              <Moon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Wind down</p>
              <h3 className="truncate font-display text-xl font-semibold">End of day</h3>
            </div>
            <Button
              size="sm"
              onClick={() => setExhaleOpen(true)}
              className="shrink-0 rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-[0_0_18px_-4px_hsl(var(--primary)/0.6)] hover:opacity-95"
            >
              <Wind className="mr-1.5 h-3.5 w-3.5" /> Begin Exhale
            </Button>
          </div>
          <p className="mt-3 font-display text-[15px] leading-snug text-foreground/80 sm:text-base">{closingNote}</p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="min-w-0 overflow-hidden rounded-2xl bg-background/60 p-3 backdrop-blur">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Today
                </span>
                <span className="tabular-nums text-muted-foreground">{done.length}/{total} · {pct}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary via-accent to-secondary transition-all duration-700"
                  style={{ width: `${pct}%` }}
                />
              </div>
              {done.length > 0 && (
                <ul className="mt-2 max-h-24 space-y-0.5 overflow-y-auto pr-1 text-xs text-muted-foreground">
                  {done.slice(0, 5).map(t => (
                    <li key={t.id} className="truncate line-through">{t.title}</li>
                  ))}
                  {done.length > 5 && <li className="italic">+ {done.length - 5} more</li>}
                </ul>
              )}
            </div>

            <div className="min-w-0 overflow-hidden rounded-2xl bg-background/60 p-3 backdrop-blur">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <Sparkles className="h-3.5 w-3.5 text-accent-foreground" /> Unfinished
                </span>
                <span className="tabular-nums text-muted-foreground">{unfinished.length}</span>
              </div>
              {unfinished.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nothing waiting. A clean close.</p>
              ) : (
                <>
                  <ul className="max-h-24 space-y-0.5 overflow-y-auto pr-1 text-xs">
                    {unfinished.slice(0, 5).map(t => (
                      <li key={t.id} className="truncate">{t.title}</li>
                    ))}
                    {unfinished.length > 5 && (
                      <li className="italic text-muted-foreground">+ {unfinished.length - 5} more</li>
                    )}
                  </ul>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={rescheduleAll}
                    disabled={rescheduling}
                    className="mt-2 h-7 w-full rounded-full text-xs"
                  >
                    <ArrowRight className="mr-1 h-3.5 w-3.5" />
                    {rescheduling ? "Moving…" : `Reschedule to tomorrow`}
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="mt-4 min-w-0 overflow-hidden rounded-2xl border border-border/60 bg-background/40 p-3">
            <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs uppercase tracking-wider text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Sun className="h-3.5 w-3.5 shrink-0" /> Prepare for tomorrow
              </span>
              <span className="truncate normal-case tracking-normal text-foreground/80">
                · {format(tomorrow, "EEE, MMM d")}
              </span>
            </div>
            <ul className="grid gap-2 text-sm sm:grid-cols-2">
              <li className="flex min-w-0 items-start gap-2 overflow-hidden rounded-xl bg-muted/40 px-3 py-2">
                <span className="shrink-0 text-base leading-none">{moon.glyph}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{moon.label}</p>
                  <p className="text-[11px] text-muted-foreground line-clamp-2">{moon.invitation}</p>
                </div>
              </li>
              <li className="flex min-w-0 items-start gap-2 overflow-hidden rounded-xl bg-muted/40 px-3 py-2">
                <CloudSun className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium">Weather</p>
                  <p className="line-clamp-2 break-words text-[11px] text-muted-foreground">
                    {weather
                      ? `${weather.locationLabel} · ${weather.conditionLabel}, ${formatTemp(weather.highC, unit)} / ${formatTemp(weather.lowC, unit)}`
                      : "Forecast loading…"}
                  </p>
                </div>
              </li>
              <li className="flex min-w-0 items-start gap-2 overflow-hidden rounded-xl bg-muted/40 px-3 py-2">
                <Flame className="mt-0.5 h-4 w-4 shrink-0 text-accent-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium">Habits</p>
                  <p className="line-clamp-2 text-[11px] text-muted-foreground">
                    {habitsToday.length === 0
                      ? "No daily habits set."
                      : `${habitsDone}/${habitsToday.length} kept today — gentle start tomorrow.`}
                  </p>
                </div>
              </li>
              <li className="flex min-w-0 items-start gap-2 overflow-hidden rounded-xl bg-muted/40 px-3 py-2">
                <CalIcon className="mt-0.5 h-4 w-4 shrink-0 text-secondary-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium">Upcoming</p>
                  <p className="line-clamp-2 break-words text-[11px] text-muted-foreground">
                    {tomorrowAppts.length === 0
                      ? "A clear morning."
                      : `${tomorrowAppts.length} on the calendar${tomorrowFirst ? ` · first: ${tomorrowFirst.title}${tomorrowFirst.time ? " @ " + tomorrowFirst.time.slice(0,5) : ""}` : ""}`}
                  </p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <ExhaleFlow open={exhaleOpen} onOpenChange={setExhaleOpen} date={date} />
    </section>
  );
}