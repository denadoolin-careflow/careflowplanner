import { useMemo } from "react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Coffee, Sun, Sunset, Check, ChevronRight } from "lucide-react";
import { DashCard, EmptyLine } from "./DashCard";
import { capacityLimit, useCapacity } from "./capacity-context";

const PARTS = [
  { key: "Morning", label: "Morning", icon: Coffee },
  { key: "Afternoon", label: "Afternoon", icon: Sun },
  { key: "Evening", label: "Evening", icon: Sunset },
] as const;

function TaskLine({ id, title, done, onToggle, onOpen }: {
  id: string; title: string; done: boolean;
  onToggle: (id: string) => void; onOpen?: (id: string) => void;
}) {
  return (
    <li className="flex items-start gap-2">
      <button
        type="button"
        onClick={() => onToggle(id)}
        aria-label={done ? `Mark ${title} not done` : `Mark ${title} done`}
        className={cn(
          "mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border transition-colors",
          done ? "border-primary bg-primary text-primary-foreground" : "border-border text-transparent hover:bg-muted",
        )}
      >
        <Check className="h-2.5 w-2.5" aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => onOpen?.(id)}
        className={cn("min-w-0 flex-1 text-left text-[12.5px] leading-snug [overflow-wrap:anywhere] hover:underline", done && "text-muted-foreground line-through")}
      >
        {title}
      </button>
    </li>
  );
}

export function PlanColumn({ date, onTaskClick }: { date: Date; onTaskClick?: (id: string) => void }) {
  const { state, toggleTask } = useStore();
  const navigate = useNavigate();
  const capacity = useCapacity();
  const iso = format(date, "yyyy-MM-dd");

  const today = useMemo(() => state.tasks.filter(t => t.dueDate === iso), [state.tasks, iso]);
  const doneCount = today.filter(t => t.done).length;

  const grouped = useMemo(() => {
    const g: Record<string, typeof today> = { Morning: [], Afternoon: [], Evening: [], Anytime: [] };
    for (const t of today) {
      const p = typeof (t as any).dayPart === "string"
        ? String((t as any).dayPart).toLowerCase() : "";
      if (p === "morning") g.Morning.push(t);
      else if (p === "afternoon") g.Afternoon.push(t);
      else if (p === "evening") g.Evening.push(t);
      else g.Anytime.push(t);
    }
    return g;
  }, [today]);

  const upcoming = useMemo(() => {
    const items = state.appointments
      .filter(a => a.date === iso)
      .sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));
    return items.slice(0, capacityLimit(3, capacity));
  }, [state.appointments, iso, capacity]);

  const perPart = capacityLimit(4, capacity);

  return (
    <div className="space-y-3">
      <DashCard
        eyebrow="Plan"
        title="Timeline"
        action={
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
            {doneCount} of {today.length} done
          </span>
        }
      >
        <div className="space-y-4">
          {PARTS.map(({ key, label, icon: Icon }) => {
            const list = grouped[key];
            return (
              <div key={key}>
                <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <Icon className="h-3.5 w-3.5 text-primary" aria-hidden /> {label}
                </div>
                {list.length === 0 ? (
                  <EmptyLine>Open.</EmptyLine>
                ) : (
                  <ul className="space-y-1.5">
                    {list.slice(0, perPart).map(t => (
                      <TaskLine key={t.id} id={t.id} title={t.title} done={!!t.done}
                        onToggle={(id) => void toggleTask(id)} onOpen={onTaskClick} />
                    ))}
                    {list.length > perPart && (
                      <li className="text-[11px] text-muted-foreground">+ {list.length - perPart} more</li>
                    )}
                  </ul>
                )}
              </div>
            );
          })}
          {grouped.Anytime.length > 0 && !capacity.isLow && (
            <div>
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Anytime</div>
              <ul className="space-y-1.5">
                {grouped.Anytime.slice(0, perPart).map(t => (
                  <TaskLine key={t.id} id={t.id} title={t.title} done={!!t.done}
                    onToggle={(id) => void toggleTask(id)} onOpen={onTaskClick} />
                ))}
              </ul>
            </div>
          )}
        </div>
      </DashCard>

      <DashCard
        eyebrow="Plan"
        title="Upcoming"
        action={
          <button type="button" onClick={() => navigate("/calendar")}
            className="inline-flex items-center text-[11px] text-muted-foreground hover:text-foreground">
            Calendar <ChevronRight className="h-3 w-3" aria-hidden />
          </button>
        }
      >
        {upcoming.length === 0 ? (
          <EmptyLine>Nothing on the calendar today.</EmptyLine>
        ) : (
          <ul className="space-y-2">
            {upcoming.map(a => (
              <li key={a.id} className="flex items-baseline gap-2 text-[12.5px]">
                <span className="w-16 shrink-0 text-[11px] text-muted-foreground">
                  {a.allDay || !a.time ? "All day" : a.time}
                </span>
                <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{a.title}</span>
              </li>
            ))}
          </ul>
        )}
      </DashCard>
    </div>
  );
}