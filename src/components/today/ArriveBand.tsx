import { useEffect, useState } from "react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { GreetingBlock } from "@/components/today/dashboard/GreetingBlock";
import { MorningCheckInPrompt } from "@/components/checkin/MorningCheckInPrompt";
import { getIntention, setIntention } from "@/lib/daily-intention";
import { BURNOUT_META, useBurnoutCheckIn, type BurnoutLevel } from "@/lib/burnout-checkin";
import { useOverdueTasks } from "@/components/planner/PlannerOverdueSection";
import { Input } from "@/components/ui/input";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const LEVELS: { level: BurnoutLevel; emoji: string; label: string }[] = [
  { level: "spacious", emoji: "🌤️", label: "Full" },
  { level: "steady", emoji: "🌿", label: "Good" },
  { level: "tender", emoji: "🌸", label: "Low" },
  { level: "depleted", emoji: "🌑", label: "Barely" },
];

/**
 * The "arrive" zone of Today: one quiet band with the greeting, how much
 * capacity you have, a single line of intention, and anything overdue.
 */
export function ArriveBand({ date }: { date: Date }) {
  const iso = format(date, "yyyy-MM-dd");
  const { entry, setLevel } = useBurnoutCheckIn(date);
  const overdue = useOverdueTasks(date);
  const navigate = useNavigate();
  const [intention, setLocal] = useState("");
  useEffect(() => { setLocal(getIntention(iso)); }, [iso]);

  return (
    <section aria-label="Arrive" className="animate-fade-in space-y-3">
      <GreetingBlock date={date} />

      <div className="rounded-3xl border border-border/40 bg-card/55 p-4 shadow-soft backdrop-blur-xl">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div
            role="radiogroup"
            aria-label="Capacity today"
            className="flex shrink-0 flex-wrap gap-1.5"
          >
            {LEVELS.map(o => {
              const active = entry.level === o.level;
              return (
                <button
                  key={o.level}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setLevel(active ? null : o.level)}
                  className={cn(
                    "inline-flex min-h-[38px] items-center gap-1.5 rounded-full border px-3 text-[12px] transition-colors",
                    active
                      ? "border-primary/50 bg-primary/10 font-medium text-foreground"
                      : "border-border/50 bg-background/40 text-muted-foreground hover:bg-muted/40",
                  )}
                >
                  <span aria-hidden>{o.emoji}</span>
                  {o.label}
                </button>
              );
            })}
          </div>

          <Input
            value={intention}
            onChange={(e) => { setLocal(e.target.value); setIntention(iso, e.target.value); }}
            placeholder="One line for today…"
            aria-label="Today's intention"
            className="h-10 min-w-0 flex-1 rounded-full bg-background/50 text-[13px]"
          />

          {overdue.length > 0 && (
            <button
              type="button"
              onClick={() => navigate("/tasks/today")}
              className="inline-flex min-h-[38px] shrink-0 items-center gap-1.5 rounded-full border border-border/50 bg-background/40 px-3 text-[12px] text-muted-foreground transition-colors hover:bg-muted/40"
            >
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
              {overdue.length} overdue
            </button>
          )}
        </div>

        <p className="mt-2.5 text-[12px] leading-relaxed text-muted-foreground">
          {entry.level
            ? BURNOUT_META[entry.level].hint
            : "Pick a capacity and today's plan softens or stretches to match."}
        </p>
      </div>
    </section>
  );
}
