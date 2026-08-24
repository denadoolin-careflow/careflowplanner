import { useMemo } from "react";
import { format } from "date-fns";
import { useStore } from "@/lib/store";
import { DashCard, EmptyLine } from "@/components/today/dashboard/DashCard";
import { Button } from "@/components/ui/button";
import { Check, Wind } from "lucide-react";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";

const GENTLE = [
  "Drink a full glass of water.",
  "Step outside for two minutes.",
  "Stretch your shoulders and jaw.",
  "Sit down for one whole cup of tea.",
  "Put your phone face down for ten minutes.",
  "Text someone who makes you feel easy.",
  "Lie flat on the floor for a minute.",
];

/** Self-care: your own habits, one gentle suggestion, and a way to exhale. */
export function SelfCareCard({ date, onExhale }: { date: Date; onExhale: () => void }) {
  const { state, toggleHabit } = useStore();
  const iso = format(date, "yyyy-MM-dd");

  const habits = useMemo(
    () => state.habits.filter(h => h.category === "self-care" || h.category === "health").slice(0, 4),
    [state.habits],
  );

  const suggestion = GENTLE[Math.abs(Number(format(date, "yyyyMMdd"))) % GENTLE.length];

  return (
    <DashCard
      eyebrow="For you"
      title="Self-care"
      action={
        <Button size="sm" variant="ghost" onClick={onExhale} className="h-8 rounded-full text-[11px]">
          <Wind className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Exhale
        </Button>
      }
    >
      <div className="space-y-3">
        <p className="rounded-2xl border border-border/40 bg-muted/30 px-3 py-2 text-[12.5px] leading-relaxed text-muted-foreground">
          {suggestion}
        </p>

        {habits.length === 0 ? (
          <EmptyLine>No self-care habits yet — even one counts.</EmptyLine>
        ) : (
          <ul className="space-y-1.5">
            {habits.map(h => {
              const done = !!h.log[iso];
              return (
                <li key={h.id} className="flex items-start gap-2 text-[12.5px]">
                  <button
                    type="button"
                    onClick={() => { if (!done) haptics.success?.(); void toggleHabit(h.id, iso); }}
                    aria-label={done ? `Mark ${h.title} not done` : `Mark ${h.title} done`}
                    className={cn(
                      "mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border transition-all active:scale-125",
                      done ? "border-primary bg-primary text-primary-foreground" : "border-border text-transparent hover:bg-muted",
                    )}
                  >
                    <Check className="h-2.5 w-2.5" aria-hidden />
                  </button>
                  <span className={cn("min-w-0 flex-1 [overflow-wrap:anywhere]", done && "text-muted-foreground line-through")}>
                    {h.title}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </DashCard>
  );
}
