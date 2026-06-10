import { useMemo, useState } from "react";
import { Sparkles, Telescope, Wand2, PenLine } from "lucide-react";
import { getTransitsForDate, type Transit } from "@/lib/transits";
import { useTransitsEnabled } from "@/lib/astrology-prefs";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PlanWithEnergyDialog } from "@/components/rhythm/PlanWithEnergyDialog";
import { getRhythmForecast } from "@/lib/rhythm-forecast";
import { TransitJournalInline } from "@/components/cosmic/TransitJournalInline";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const TONE: Record<Transit["tone"], string> = {
  soft: "bg-primary/10 text-primary border-primary/30",
  warn: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
  rest: "bg-accent/15 text-accent-foreground border-accent/30",
};

/**
 * Horizontally scrollable strip of today's notable astrological transits.
 * Renders nothing when the user has astrology or transits turned off.
 */
export function TransitStrip({ date }: { date: Date }) {
  const enabled = useTransitsEnabled();
  const [planOpen, setPlanOpen] = useState(false);
  const transits = useMemo(() => (enabled ? getTransitsForDate(date) : []), [date, enabled]);
  const forecast = useMemo(() => getRhythmForecast(date), [date]);

  const iso = format(date, "yyyy-MM-dd");
  if (!enabled) return null;
  if (transits.length === 0) {
    return (
      <section
        aria-label="Today's transits"
        className="rounded-2xl border border-border/60 bg-card/60 px-4 py-3 text-[12.5px] italic text-muted-foreground"
      >
        <Telescope className="mr-1 inline h-3.5 w-3.5" />
        Sky is quiet today — no major ingresses, retrogrades, or void moon.
      </section>
    );
  }

  return (
    <section
      aria-label="Today's transits"
      className="rounded-2xl border border-border/60 bg-gradient-to-br from-card/95 via-card/80 to-card/95 p-4 shadow-[var(--shadow-soft)]"
    >
      <header className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          <Telescope className="h-3 w-3" /> Today's transits
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 rounded-full px-2.5 text-[11px]"
          onClick={() => setPlanOpen(true)}
        >
          <Wand2 className="mr-1 h-3 w-3" /> Plan around this
        </Button>
      </header>
      <ul className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {transits.map(t => (
          <li key={t.id} className="shrink-0">
            <div className={cn("inline-flex items-center gap-1 rounded-full border pl-3 pr-1 py-0.5 text-xs font-medium", TONE[t.tone])}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="flex items-center gap-1.5 py-1">
                    <span aria-hidden className="text-sm leading-none">{t.glyph}</span>
                    <span>{t.label}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[260px] text-[12px] leading-snug">
                  {t.detail}
                </TooltipContent>
              </Tooltip>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="rounded-full p-1 hover:bg-background/50"
                    aria-label={`Journal ${t.label}`}
                  >
                    <PenLine className="h-3 w-3" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-3" align="end">
                  <div className="mb-2 flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    <span aria-hidden>{t.glyph}</span>
                    <span>{t.label}</span>
                  </div>
                  <p className="mb-2 text-[12px] leading-snug text-muted-foreground">{t.detail}</p>
                  <TransitJournalInline
                    eventId={`today~${iso}~${t.id}`}
                    eventLabel={t.label}
                    eventDate={iso}
                    compact
                  />
                </PopoverContent>
              </Popover>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-2 flex items-center gap-1 text-[11px] italic text-muted-foreground">
        <Sparkles className="h-3 w-3" />
        Caregiver-paced reading — keep what serves you, leave the rest.
      </p>
      <PlanWithEnergyDialog open={planOpen} onOpenChange={setPlanOpen} date={date} forecast={forecast} />
    </section>
  );
}