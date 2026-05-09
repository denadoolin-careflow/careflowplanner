import { History } from "lucide-react";
import { SectionCard } from "@/components/cards/SectionCard";
import { usePomodoroHistory } from "@/lib/pomodoro-history";

function fmtMinutes(seconds: number) {
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem ? `${h}h ${rem}m` : `${h}h`;
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

export function PomodoroHistory() {
  const { rows, stats, loaded } = usePomodoroHistory();

  if (!loaded) {
    return (
      <SectionCard title="Sprint history" accent="sage">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </SectionCard>
    );
  }

  if (rows.length === 0) {
    return (
      <SectionCard
        title="Sprint history"
        subtitle="Completed focus sessions land here."
        accent="sage"
      >
        <p className="text-sm text-muted-foreground">
          No sprints yet. Start a session above and your first row will appear when the focus chime rings.
        </p>
      </SectionCard>
    );
  }

  return (
    <div className="space-y-4">
      <SectionCard
        title="Sprint history"
        subtitle={`${stats.total} sprint${stats.total === 1 ? "" : "s"} · ${fmtMinutes(stats.totalSeconds)} of focus`}
        accent="sage"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              By template
            </div>
            <ul className="space-y-1.5">
              {stats.byTemplate.map(a => (
                <li key={a.key} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate">{a.label}</span>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {a.count} · {fmtMinutes(a.totalSeconds)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              By task
            </div>
            <ul className="space-y-1.5">
              {stats.byTask.slice(0, 8).map(a => (
                <li key={a.key} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate">{a.label}</span>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {a.count} · {fmtMinutes(a.totalSeconds)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Recent sprints"
        accent="warm"
      >
        <ul className="divide-y divide-border/60">
          {rows.slice(0, 20).map(r => (
            <li key={r.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <div className="min-w-0">
                <div className="truncate font-medium">{r.task_title || "Freeform session"}</div>
                <div className="text-[11px] text-muted-foreground">
                  {r.template_label ? `${r.template_label} · ` : ""}{fmtDate(r.completed_at)}
                </div>
              </div>
              <div className="shrink-0 inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] tabular-nums text-muted-foreground">
                <History className="h-3 w-3" />
                {fmtMinutes(r.focus_seconds)}
              </div>
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}
