import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { useHiddenCalendars } from "@/lib/calendar-visibility";
import { gcalListCalendars, type GCalCalendar } from "@/lib/google-calendar";
import { Eye, EyeOff, Calendar as CalIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Unified visibility legend across Personal, Household, and Google calendars.
 * Toggling here hides events project-wide via localStorage.
 */
export function MyCalendarsPanel() {
  const { state } = useStore();
  const [hidden, toggle] = useHiddenCalendars();
  const [gcals, setGcals] = useState<GCalCalendar[]>([]);

  useEffect(() => {
    gcalListCalendars()
      .then((s) => setGcals(s.calendars ?? []))
      .catch(() => {});
  }, []);

  const areas = state.areas ?? [];

  const Row = ({ id, label, color }: { id: string; label: string; color?: string }) => {
    const isHidden = hidden.includes(id);
    return (
      <button
        onClick={() => toggle(id)}
        className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-muted/40"
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color ?? "#94a3b8", opacity: isHidden ? 0.35 : 1 }} />
          <span className={cn("truncate", isHidden && "text-muted-foreground line-through")}>{label}</span>
        </span>
        {isHidden ? <EyeOff className="h-3.5 w-3.5 text-muted-foreground" /> : <Eye className="h-3.5 w-3.5 text-muted-foreground" />}
      </button>
    );
  };

  return (
    <div className="space-y-3">
      <div>
        <div className="mb-1 flex items-center gap-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <CalIcon className="h-3 w-3" /> My calendars
        </div>
        <Row id="cal:personal" label="Personal" color="hsl(var(--primary))" />
        <Row id="cal:tasks" label="Tasks" color="#7dd3fc" />
        <Row id="cal:holidays" label="Holidays & birthdays" color="#f9a8d4" />
      </div>
      {areas.length > 0 && (
        <div>
          <div className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Areas</div>
          {areas.filter((a: any) => !a.isArchived).slice(0, 8).map((a: any) => (
            <Row key={a.id} id={`area:${a.name}`} label={a.name} color={a.color} />
          ))}
        </div>
      )}
      {gcals.length > 0 && (
        <div>
          <div className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Google</div>
          {gcals.slice(0, 8).map((g) => (
            <Row key={g.id} id={`gcal:${g.id}`} label={g.summary} color={g.color} />
          ))}
        </div>
      )}
    </div>
  );
}