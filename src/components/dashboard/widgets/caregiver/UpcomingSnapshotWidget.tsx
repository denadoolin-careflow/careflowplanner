import { useMemo } from "react";
import { useStore, todayISO } from "@/lib/store";
import { CalendarHeart } from "lucide-react";

function nextDayISO(): string {
  const d = new Date(); d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function UpcomingSnapshotWidget() {
  const { state } = useStore();
  const T = todayISO();
  const TM = nextDayISO();

  const next = useMemo(() => state.appointments
    .filter((a) => a.date === T)
    .sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""))
    .slice(0, 3), [state.appointments, T]);

  const tomorrow = useMemo(() => state.appointments
    .filter((a) => a.date === TM)
    .sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""))
    .slice(0, 2), [state.appointments, TM]);

  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">Next up</p>
        {next.length === 0 ? (
          <p className="text-sm text-muted-foreground">A clear day. Enjoy it.</p>
        ) : (
          <ul className="space-y-1">
            {next.map((a) => (
              <li key={a.id} className="flex items-center gap-2 truncate text-sm">
                <span className="tabular-nums text-xs text-muted-foreground">{a.time ?? "—"}</span>
                <CalendarHeart className="h-3.5 w-3.5 text-secondary-foreground" />
                <span className="truncate">{a.title}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {tomorrow.length > 0 && (
        <div>
          <p className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">Tomorrow</p>
          <ul className="space-y-0.5 text-xs text-foreground/80">
            {tomorrow.map((a) => (<li key={a.id} className="truncate">{a.time ?? "—"} {a.title}</li>))}
          </ul>
        </div>
      )}
    </div>
  );
}