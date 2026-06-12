import { useMemo } from "react";
import { Moon } from "lucide-react";
import { useCycle } from "@/lib/cycle-store";
import { getDailyEnergyGuidance } from "@/lib/daily-energy-guidance";
import { cn } from "@/lib/utils";

const ELEMENT_ACCENT: Record<string, string> = {
  Fire:  "hsl(20 70% 60%)",
  Earth: "hsl(140 45% 55%)",
  Air:   "hsl(48 85% 62%)",
  Water: "hsl(210 70% 65%)",
};

interface Props { date: Date; className?: string }

export function DailyEnergyGuidance({ date, className }: Props) {
  const { periods, settings } = useCycle();
  const g = useMemo(
    () => getDailyEnergyGuidance(date, periods, settings),
    [date, periods, settings],
  );
  const accent = ELEMENT_ACCENT[g.element] ?? "hsl(140 35% 55%)";

  return (
    <section
      aria-label="Daily energy guidance"
      className={cn(
        "w-full max-w-md animate-in fade-in duration-700",
        "rounded-2xl border border-border/50 bg-card/55 p-4 backdrop-blur sm:p-5",
        "shadow-soft",
        className,
      )}
      style={{ boxShadow: `inset 0 0 0 1px ${accent.replace(")", " / 0.18)")}` }}
    >
      <div className="flex items-center justify-center gap-1.5">
        <Moon className="h-3 w-3" style={{ color: accent }} />
        <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Daily Energy
        </p>
      </div>

      <blockquote
        className="mt-2 text-balance text-center font-display text-[15px] italic leading-snug text-foreground/90 sm:text-base"
      >
        “{g.headline}”
      </blockquote>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[11px] font-medium uppercase tracking-[0.16em]">
        {g.focus.map((word, i) => (
          <span key={word} className="inline-flex items-center gap-2">
            {i > 0 && <span className="text-muted-foreground/40">•</span>}
            <span style={{ color: accent }}>{word}</span>
          </span>
        ))}
      </div>

      <div className="mt-3 border-t border-border/40 pt-3 text-center">
        <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Reflection
        </p>
        <p className="mt-1 font-display text-[13px] italic leading-snug text-foreground/80">
          “{g.reflection}”
        </p>
      </div>

      <p className="mt-3 text-center text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">
        Moon Day {g.moonDay}
        {g.cyclePhase ? <> · <span className="capitalize">{g.cyclePhase}</span></> : null}
        {" · "}{g.element}
      </p>
    </section>
  );
}