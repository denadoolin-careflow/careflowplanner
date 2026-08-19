import { useMemo, useState } from "react";
import { Play, Pause, Square, Timer, Clock, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useStore, todayISO } from "@/lib/store";
import { resolveActivity } from "@/lib/task-tracking";
import {
  useActiveTimer, useTimeEntries, timeTracker,
  formatClock, formatDuration, type TimeEntry,
} from "@/lib/time-tracking";

const RANGES = [
  { id: 1, label: "Today" },
  { id: 7, label: "7 days" },
  { id: 30, label: "30 days" },
];

interface Roll {
  key: string;
  title: string;
  actualSec: number;
  allocSec: number;
  sessions: number;
}

function rollup(rows: TimeEntry[], estById: Map<string, number | undefined>): Roll[] {
  const map = new Map<string, Roll>();
  for (const r of rows) {
    const key = r.task_id ?? `t:${r.task_title}`;
    const cur = map.get(key) ?? { key, title: r.task_title || "Untitled", actualSec: 0, allocSec: 0, sessions: 0 };
    cur.actualSec += r.seconds;
    cur.sessions += 1;
    const est = (r.task_id ? estById.get(r.task_id) : undefined) ?? r.est_minutes ?? 0;
    cur.allocSec = Math.max(cur.allocSec, est * 60);
    map.set(key, cur);
  }
  return [...map.values()].sort((a, b) => b.actualSec - a.actualSec);
}

export default function TimeTracking() {
  const { state } = useStore();
  const { timer, elapsed, running } = useActiveTimer();
  const [days, setDays] = useState(1);
  const { rows, loading } = useTimeEntries(days);
  const iso = todayISO();

  const estById = useMemo(
    () => new Map(state.tasks.map(t => [t.id, t.estMinutes])),
    [state.tasks],
  );
  const rolls = useMemo(() => rollup(rows, estById), [rows, estById]);

  const candidates = useMemo(
    () => state.tasks
      .filter(t => !t.done && (t.dueDate === iso || t.isTopThree || t.startTime))
      .slice(0, 12),
    [state.tasks, iso],
  );

  const totalActual = rolls.reduce((s, r) => s + r.actualSec, 0);
  const totalAlloc = rolls.reduce((s, r) => s + r.allocSec, 0);

  const allocSec = (timer.estMinutes ?? 0) * 60;
  const pct = allocSec ? Math.min(100, (elapsed / allocSec) * 100) : 0;
  const over = allocSec > 0 && elapsed > allocSec;

  return (
    <div className="space-y-6">
      <header className="cozy-card gradient-calm p-6">
        <h1 className="font-display text-3xl font-semibold">Time tracking</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Start a timer on any task and see how the real time compares to what you allocated.
        </p>
      </header>

      {/* Live timer */}
      <section aria-label="Active timer" className="cozy-card p-5">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          <Timer className="h-3.5 w-3.5" aria-hidden /> {running ? "Tracking now" : timer.title ? "Paused" : "Nothing tracking"}
        </div>

        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate text-base font-medium [overflow-wrap:anywhere]">
              {timer.title || "Pick a task below to start"}
            </p>
            <p className="mt-1 font-mono text-5xl font-semibold tabular-nums" aria-live="polite">
              {formatClock(elapsed)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {allocSec
                ? over
                  ? `${formatDuration(elapsed - allocSec)} over the ${timer.estMinutes}m allocated`
                  : `${formatDuration(allocSec - elapsed)} left of ${timer.estMinutes}m allocated`
                : "No allocated time on this task"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {running ? (
              <Button className="gap-1.5 rounded-full" onClick={() => void timeTracker.pause()} aria-label="Pause tracking">
                <Pause className="h-4 w-4" /> Pause
              </Button>
            ) : (
              <Button
                className="gap-1.5 rounded-full"
                disabled={!timer.title}
                onClick={() => timeTracker.resume()}
                aria-label="Resume tracking"
              >
                <Play className="h-4 w-4" /> Resume
              </Button>
            )}
            <Button
              variant="outline"
              className="gap-1.5 rounded-full"
              disabled={!timer.title}
              onClick={() => void timeTracker.stop()}
              aria-label="Stop and log tracking"
            >
              <Square className="h-4 w-4" /> Stop &amp; log
            </Button>
          </div>
        </div>

        {allocSec > 0 && (
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted" role="progressbar"
            aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label="Progress against allocated time">
            <div className={cn("h-full rounded-full transition-all", over ? "bg-destructive" : "bg-primary")}
              style={{ width: `${over ? 100 : pct}%` }} />
          </div>
        )}
      </section>

      {/* Start on a task */}
      <section aria-label="Start tracking a task" className="cozy-card p-5">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Start on…</h2>
        {candidates.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Nothing planned for today yet — schedule a task and it shows up here.</p>
        ) : (
          <ul className="mt-3 space-y-1.5">
            {candidates.map(t => {
              const act = resolveActivity(t);
              const isActive = timer.taskId === t.id;
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => void timeTracker.start({
                      id: t.id, title: t.title, estMinutes: t.estMinutes ?? null,
                      activity: act?.id ?? null, area: t.area ?? null,
                    })}
                    aria-label={`Start tracking ${t.title}`}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition-colors",
                      isActive ? "border-primary/50 bg-primary/10" : "border-border/60 hover:bg-muted",
                    )}
                  >
                    <Play className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                    <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{t.title}</span>
                    {act && <span className="shrink-0 text-[11px] text-muted-foreground">{act.label}</span>}
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 font-mono text-[11px]">
                      {t.estMinutes ? `${t.estMinutes}m` : "—"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Actual vs allocated */}
      <section aria-label="Actual versus allocated time" className="cozy-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            <Gauge className="h-3.5 w-3.5" aria-hidden /> Actual vs allocated
          </h2>
          <div className="inline-flex rounded-full border border-border/60 bg-background/60 p-0.5">
            {RANGES.map(r => (
              <button
                key={r.id}
                type="button"
                onClick={() => setDays(r.id)}
                aria-pressed={days === r.id}
                className={cn("rounded-full px-3 py-1 text-xs transition-colors",
                  days === r.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <p className="mt-2 text-xs text-muted-foreground">
          {loading ? "Loading…" : `${formatDuration(totalActual)} tracked across ${rolls.length} task${rolls.length === 1 ? "" : "s"}`}
          {!loading && totalAlloc > 0 && ` · ${formatDuration(totalAlloc)} allocated`}
        </p>

        {!loading && rolls.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No tracked time in this range yet.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {rolls.map(r => {
              const ratio = r.allocSec ? r.actualSec / r.allocSec : 0;
              const isOver = r.allocSec > 0 && r.actualSec > r.allocSec;
              return (
                <li key={r.key} className="space-y-1">
                  <div className="flex items-start justify-between gap-2 text-sm">
                    <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{r.title}</span>
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">
                      {formatDuration(r.actualSec)}{r.allocSec ? ` / ${formatDuration(r.allocSec)}` : ""}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn("h-full rounded-full", isOver ? "bg-destructive" : "bg-primary")}
                      style={{ width: `${r.allocSec ? Math.min(100, ratio * 100) : 100}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {r.sessions} session{r.sessions === 1 ? "" : "s"}
                    {r.allocSec
                      ? isOver
                        ? ` · ${formatDuration(r.actualSec - r.allocSec)} over`
                        : ` · ${formatDuration(r.allocSec - r.actualSec)} under`
                      : " · no allocation set"}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Raw sessions */}
      <section aria-label="Recent sessions" className="cozy-card p-5">
        <h2 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          <Clock className="h-3.5 w-3.5" aria-hidden /> Sessions
        </h2>
        {rows.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Sessions appear here once you stop or pause a timer.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border/50 text-sm">
            {rows.slice(0, 30).map(r => (
              <li key={r.id} className="flex items-center justify-between gap-2 py-1.5">
                <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{r.task_title || "Untitled"}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {new Date(r.started_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                </span>
                <span className="shrink-0 font-mono text-xs">{formatDuration(r.seconds)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
