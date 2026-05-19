import { format } from "date-fns";
import { Sparkles, ArrowUpRight, ArrowDownRight, ArrowRightLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { MoonGlyph } from "@/components/widgets/MoonGlyph";
import {
  getWeeklyRhythm,
  useRhythmForecastEnabled,
  ELEMENT_META,
} from "@/lib/rhythm-forecast";
import { useMoonDataVersion } from "@/lib/moon-providers";
import { ElementBadge } from "./ElementBadge";

interface Props {
  weekStart: Date;
  className?: string;
}

/**
 * Weekly Rhythm card — gentle overview of the week's lunar + elemental energy.
 * Shows phase trajectory, dominant element, theme, focus areas, reminder,
 * and a suggested planning style. Hidden when Rhythm Forecast is disabled.
 */
export function WeeklyRhythmCard({ weekStart, className }: Props) {
  const [on] = useRhythmForecastEnabled();
  useMoonDataVersion();
  if (!on) return null;

  const w = getWeeklyRhythm(weekStart);
  const element = ELEMENT_META[w.dominantElement];
  const DirIcon =
    w.direction === "waxing" ? ArrowUpRight :
    w.direction === "waning" ? ArrowDownRight : ArrowRightLeft;

  return (
    <section
      aria-label="Weekly rhythm forecast"
      className={cn(
        "relative overflow-hidden rounded-2xl ring-1 ring-border/60 shadow-soft backdrop-blur-md",
        "bg-gradient-to-br from-card/90 via-card/70 to-card/90 p-5",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-70"
        style={{
          background:
            "radial-gradient(ellipse at top right, hsl(var(--primary)/0.10), transparent 65%), radial-gradient(ellipse at bottom left, hsl(var(--accent)/0.10), transparent 70%)",
        }}
      />

      <header className="flex flex-wrap items-start gap-3">
        <div className="relative shrink-0">
          <span
            aria-hidden
            className="absolute inset-[-6px] rounded-full blur-md"
            style={{ background: "radial-gradient(circle, hsl(48 80% 70% / 0.30), transparent 70%)" }}
          />
          <MoonGlyph date={w.days[0].date} size={44} className="relative" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Weekly Rhythm · {format(weekStart, "MMM d")}
          </p>
          <p className="font-display text-base leading-tight">
            {w.energyTheme}
          </p>
          <p className="mt-0.5 text-[11.5px] text-muted-foreground">
            <DirIcon className="-mt-0.5 mr-1 inline h-3 w-3" />
            {w.direction === "waxing" ? "Light is growing" :
             w.direction === "waning" ? "Light is softening" : "Balanced light"}
            {" · "}
            Suggested style: <span className="text-foreground/80">{w.planningStyle}</span>
          </p>
        </div>
        <ElementBadge date={weekStart} />
      </header>

      <p className="mt-3 text-[13px] italic text-foreground/85">
        {w.overview}
      </p>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <div className="rounded-lg bg-primary-soft/40 p-2.5">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Energy theme</p>
          <p className="mt-0.5 text-[12.5px]">{element.label} · {element.verb}</p>
        </div>
        <div className="rounded-lg bg-secondary-soft/40 p-2.5">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Best focus areas</p>
          <p className="mt-0.5 text-[12.5px]">{w.focusAreas.join(", ")}</p>
        </div>
        <div className="rounded-lg bg-accent-soft/40 p-2.5">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Gentle reminder</p>
          <p className="mt-0.5 text-[12.5px]">{w.reminder}</p>
        </div>
      </div>

      {w.shifts.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            <Sparkles className="-mt-0.5 mr-1 inline h-3 w-3" />
            Phase shifts
          </span>
          {w.shifts.map((s) => (
            <span
              key={s.date.toISOString()}
              className="rounded-full border border-border/60 bg-background/60 px-2 py-0.5 text-[11px]"
            >
              {format(s.date, "EEE")} · {s.label}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
