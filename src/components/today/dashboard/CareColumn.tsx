import { useMemo } from "react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/lib/store";
import { Users, Home, HeartPulse, ChevronRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { DashCard, EmptyLine } from "./DashCard";
import { capacityLimit, useCapacity } from "./capacity-context";

export function CareColumn({ date }: { date: Date }) {
  const { state, toggleCleaning, toggleHabit } = useStore();
  const navigate = useNavigate();
  const capacity = useCapacity();
  const iso = format(date, "yyyy-MM-dd");

  const people = state.recipients.slice(0, capacityLimit(3, capacity));

  const homeItems = useMemo(() => {
    const open = state.cleaning.filter(c => !c.done);
    // On low capacity, drop the heavier cadences.
    const filtered = capacity.isLow
      ? open.filter(c => c.cadence === "daily")
      : open;
    return filtered.slice(0, capacityLimit(3, capacity));
  }, [state.cleaning, capacity]);

  const healthHabits = useMemo(
    () => state.habits
      .filter(h => h.category === "health" || h.category === "self-care")
      .slice(0, capacityLimit(3, capacity)),
    [state.habits, capacity],
  );

  return (
    <div className="space-y-3">
      {people.length === 0 ? (
        <DashCard
          eyebrow="Care" title="People"
          action={
            <button type="button" onClick={() => navigate("/care")}
              className="inline-flex items-center text-[11px] text-muted-foreground hover:text-foreground">
              All <ChevronRight className="h-3 w-3" aria-hidden />
            </button>
          }
        >
          <EmptyLine>No one added yet — add the people you care for.</EmptyLine>
        </DashCard>
      ) : (
        people.map(p => (
          <PersonCareCard key={p.id} person={p} date={date} onTaskClick={onTaskClick} />
        ))
      )}


      <DashCard
        eyebrow="Care" title="Home"
        action={
          <button type="button" onClick={() => navigate("/home")}
            className="inline-flex items-center text-[11px] text-muted-foreground hover:text-foreground">
            Reset <ChevronRight className="h-3 w-3" aria-hidden />
          </button>
        }
      >
        {homeItems.length === 0 ? (
          <EmptyLine>{capacity.isLow ? "Only the essentials today." : "Home is caught up."}</EmptyLine>
        ) : (
          <ul className="space-y-1.5">
            {homeItems.map(c => (
              <li key={c.id} className="flex items-start gap-2 text-[12.5px]">
                <button
                  type="button"
                  onClick={() => void toggleCleaning(c.id)}
                  aria-label={`Mark ${c.title} done`}
                  className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border border-border text-transparent hover:bg-muted"
                >
                  <Check className="h-2.5 w-2.5" aria-hidden />
                </button>
                <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{c.title}</span>
                <span className="text-[11px] text-muted-foreground">{c.zone}</span>
              </li>
            ))}
          </ul>
        )}
      </DashCard>

      <DashCard eyebrow="Care" title="Health">
        {healthHabits.length === 0 ? (
          <EmptyLine>No health habits tracked yet.</EmptyLine>
        ) : (
          <ul className="space-y-1.5">
            {healthHabits.map(h => {
              const done = !!h.log[iso];
              return (
                <li key={h.id} className="flex items-start gap-2 text-[12.5px]">
                  <button
                    type="button"
                    onClick={() => void toggleHabit(h.id, iso)}
                    aria-label={done ? `Mark ${h.title} not done` : `Mark ${h.title} done`}
                    className={cn(
                      "mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border transition-colors",
                      done ? "border-primary bg-primary text-primary-foreground" : "border-border text-transparent hover:bg-muted",
                    )}
                  >
                    <Check className="h-2.5 w-2.5" aria-hidden />
                  </button>
                  <span className={cn("min-w-0 flex-1 [overflow-wrap:anywhere]", done && "text-muted-foreground line-through")}>{h.title}</span>
                </li>
              );
            })}
          </ul>
        )}
      </DashCard>
    </div>
  );
}