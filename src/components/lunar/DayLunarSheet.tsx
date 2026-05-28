import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Moon, ArrowRight, Flower2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { MoonGlyph } from "@/components/widgets/MoonGlyph";
import { getRhythmForecast, ELEMENT_META } from "@/lib/rhythm-forecast";
import { getMoonPhase } from "@/lib/moon";
import { toKeyPhase, KEY_PHASES } from "@/lib/lunar-phases";
import type { KeyPhase } from "@/lib/lunar-phases";
import { getSignInfo, SIGN_EMOJI, ELEMENT_EMOJI, type ZodiacSign } from "@/lib/zodiac";
import { cn } from "@/lib/utils";

interface Props {
  date: Date | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

/**
 * Bottom-sheet "how to plan with this day" — phase, zodiac, element,
 * do/don't, and quick links into Today + Lunar Living.
 */
export function DayLunarSheet({ date, open, onOpenChange }: Props) {
  const navigate = useNavigate();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl">
        {date && (() => {
          const forecast = getRhythmForecast(date);
          const phase = getMoonPhase(date);
          const key = KEY_PHASES[toKeyPhase(phase)];
          const cycleOrder: KeyPhase[] = ["sow", "grow", "glow", "let-go"];
          const elMeta = ELEMENT_META[forecast.element];
          const signName = forecast.sign.sign as ZodiacSign;
          const sign = getSignInfo(signName);
          const iso = format(date, "yyyy-MM-dd");

          return (
            <>
              <SheetHeader className="text-left">
                <SheetTitle className="flex items-center gap-3">
                  <MoonGlyph date={date} size={40} />
                  <span className="flex flex-col">
                    <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      {format(date, "EEEE, MMM d")}
                    </span>
                    <span className="font-display text-xl">{forecast.phaseLabel}</span>
                  </span>
                </SheetTitle>
              </SheetHeader>

              {/* Key-phase chip + invitation */}
              <div
                className="mt-3 rounded-2xl p-3"
                style={{ background: `hsl(${key.hsl} / 0.12)` }}
              >
                <div
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
                  style={{ background: `hsl(${key.hsl} / 0.22)`, color: `hsl(${key.hsl})` }}
                >
                  <span aria-hidden>{key.glyph}</span> {key.label}
                </div>
                <p className="mt-2 text-sm italic text-foreground/85">{key.invitation}</p>
              </div>

              {/* Canonical cycle order */}
              <div className="mt-3 rounded-2xl border border-border/50 bg-card/60 p-3">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Cycle order
                </div>
                <ol className="mt-2 grid grid-cols-4 gap-1.5">
                  {cycleOrder.map((k, i) => {
                    const kp = KEY_PHASES[k];
                    const active = k === key.key;
                    return (
                      <li
                        key={k}
                        className={cn(
                          "flex flex-col items-center gap-0.5 rounded-xl px-1.5 py-2 text-center text-[11px] leading-tight transition",
                          active ? "ring-1" : "opacity-70",
                        )}
                        style={
                          active
                            ? {
                                background: `hsl(${kp.hsl} / 0.18)`,
                                color: `hsl(${kp.hsl})`,
                                boxShadow: `inset 0 0 0 1px hsl(${kp.hsl} / 0.45)`,
                              }
                            : undefined
                        }
                        aria-current={active ? "step" : undefined}
                      >
                        <span className="text-[10px] opacity-60">{i + 1}</span>
                        <span className="text-base leading-none" aria-hidden>
                          {kp.glyph}
                        </span>
                        <span className="font-medium">{kp.verb}</span>
                        <span className="truncate opacity-75">
                          {kp.label.split(" · ")[1]}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </div>

              {/* Zodiac + element row */}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-2xl border border-border/50 bg-card/60 p-3">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Moon in</div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-lg" aria-hidden>{SIGN_EMOJI[signName]}</span>
                    <span className="font-display text-base text-foreground">{signName}</span>
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {sign.modality} · ruled by {sign.ruler}
                  </div>
                </div>
                <div className={cn("rounded-2xl border border-border/50 p-3", elMeta.accent.bg)}>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Element</div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-lg" aria-hidden>{ELEMENT_EMOJI[sign.element]}</span>
                    <span className={cn("font-display text-base", elMeta.accent.text)}>{elMeta.label}</span>
                  </div>
                  <div className={cn("mt-1 text-[11px]", elMeta.accent.text, "opacity-80")}>
                    {elMeta.verb} · {elMeta.focusAreas.join(" · ")}
                  </div>
                </div>
              </div>

              {/* Plan with this phase */}
              <div className="mt-3 rounded-2xl border border-border/50 bg-card/60 p-3">
                <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
                  <Moon className="h-3.5 w-3.5" /> Plan with this phase
                </div>
                <p className="mt-2 text-sm leading-relaxed text-foreground/85">{key.planning}</p>
                <ul className="mt-3 space-y-1.5">
                  {key.hints.map(h => (
                    <li key={h} className="flex items-start gap-2 text-sm text-foreground/85">
                      <span
                        className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ background: `hsl(${key.hsl})` }}
                      />
                      {h}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Do / Don't */}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                  <div className="text-[10px] font-semibold uppercase tracking-widest text-emerald-700 dark:text-emerald-300">Do</div>
                  <ul className="mt-2 space-y-1 text-[13px] text-foreground/85">
                    {forecast.guidance.doMore.map(d => (
                      <li key={d} className="flex items-start gap-1.5">
                        <span className="mt-1 inline-block h-1 w-1 shrink-0 rounded-full bg-emerald-500" /> {d}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-3">
                  <div className="text-[10px] font-semibold uppercase tracking-widest text-rose-700 dark:text-rose-300">Don't</div>
                  <ul className="mt-2 space-y-1 text-[13px] text-foreground/85">
                    {forecast.guidance.doLess.map(d => (
                      <li key={d} className="flex items-start gap-1.5">
                        <span className="mt-1 inline-block h-1 w-1 shrink-0 rounded-full bg-rose-500" /> {d}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Caregiver note */}
              <p className="mt-3 rounded-xl bg-secondary-soft/50 px-3 py-2 text-[13px] italic text-secondary-foreground/85">
                {forecast.guidance.caregiverNote}
              </p>

              {/* Footer actions */}
              <div className="mt-4 flex flex-col gap-2 pb-2 sm:flex-row">
                <Button
                  className="w-full sm:w-auto"
                  onClick={() => { onOpenChange(false); navigate(`/today?date=${iso}`); }}
                >
                  Open Today <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => { onOpenChange(false); navigate(`/health/lunar`); }}
                >
                  <Flower2 className="mr-1 h-3.5 w-3.5" /> Lunar Living
                </Button>
              </div>
            </>
          );
        })()}
      </SheetContent>
    </Sheet>
  );
}