import { useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MoonGlyph } from "@/components/widgets/MoonGlyph";
import { getMoonPhase, MOON_INFO } from "@/lib/moon";
import { getMoonSign, ELEMENT_EMOJI, MOON_IN_SIGN_GUIDE, type ZodiacInfo } from "@/lib/zodiac";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface MoonCalendarProps {
  selected: Date;
  onSelect: (d: Date) => void;
  markedDates?: Set<string>; // yyyy-MM-dd dates that have a journal entry
}

/** Soft tint per zodiac element. Uses semantic tokens so it stays themeable. */
const ELEMENT_CLASS: Record<ZodiacInfo["element"], { bg: string; ring: string; chip: string; label: string }> = {
  Fire:  { bg: "bg-[hsl(15_75%_60%/0.10)]",  ring: "ring-[hsl(15_75%_60%/0.35)]",  chip: "bg-[hsl(15_75%_60%/0.18)] text-[hsl(15_45%_30%)] dark:text-[hsl(15_70%_80%)]",  label: "Fire" },
  Earth: { bg: "bg-[hsl(95_30%_45%/0.10)]",  ring: "ring-[hsl(95_30%_45%/0.35)]",  chip: "bg-[hsl(95_30%_45%/0.18)] text-[hsl(95_30%_22%)] dark:text-[hsl(95_35%_78%)]",  label: "Earth" },
  Air:   { bg: "bg-[hsl(200_55%_60%/0.10)]", ring: "ring-[hsl(200_55%_60%/0.35)]", chip: "bg-[hsl(200_55%_60%/0.18)] text-[hsl(200_45%_28%)] dark:text-[hsl(200_60%_82%)]", label: "Air" },
  Water: { bg: "bg-[hsl(245_45%_60%/0.10)]", ring: "ring-[hsl(245_45%_60%/0.35)]", chip: "bg-[hsl(245_45%_60%/0.20)] text-[hsl(245_40%_30%)] dark:text-[hsl(245_50%_82%)]", label: "Water" },
};

/**
 * Monthly calendar with a soft moon glyph in each cell.
 * Showcase phases at a glance + select a date to journal.
 */
export function MoonCalendar({ selected, onSelect, markedDates }: MoonCalendarProps) {
  const [cursor, setCursor] = useState(() => startOfMonth(selected));
  const [overview, setOverview] = useState<Date | null>(null);

  const days = useMemo(() => {
    return eachDayOfInterval({
      start: startOfWeek(startOfMonth(cursor)),
      end: endOfWeek(endOfMonth(cursor)),
    });
  }, [cursor]);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setCursor(addMonths(cursor, -1))}
          className="grid h-8 w-8 place-items-center rounded-full hover:bg-muted"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <h3 className="font-display text-lg">{format(cursor, "MMMM yyyy")}</h3>
        <button
          type="button"
          onClick={() => setCursor(addMonths(cursor, 1))}
          className="grid h-8 w-8 place-items-center rounded-full hover:bg-muted"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i} className="py-1 text-center">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const inMonth = isSameMonth(d, cursor);
          const isSel = isSameDay(d, selected);
          const phase = getMoonPhase(d);
          const isMajor =
            phase === "new" ||
            phase === "first-quarter" ||
            phase === "full" ||
            phase === "last-quarter";
          const iso = format(d, "yyyy-MM-dd");
          const hasEntry = markedDates?.has(iso);
          const sign = getMoonSign(d);
          const elem = ELEMENT_CLASS[sign.element];
          return (
            <button
              key={iso}
              type="button"
              onClick={() => { onSelect(d); setOverview(d); }}
              title={`${format(d, "MMM d")} · ${MOON_INFO[phase].label} in ${sign.name} (${sign.element})`}
              className={cn(
                "relative flex aspect-square flex-col items-center justify-center rounded-xl border text-[11px] transition",
                inMonth
                  ? cn("border-border/40 hover:brightness-105", elem.bg)
                  : "border-transparent text-muted-foreground/50",
                isSel && "border-primary ring-2 ring-primary/30",
              )}
            >
              <span className="text-[10px]">{format(d, "d")}</span>
              <MoonGlyph date={d} size={isMajor ? 22 : 16} className="mt-0.5" />
              {inMonth && (
                <span
                  className={cn("absolute left-1 top-1 grid h-3.5 w-3.5 place-items-center rounded-full text-[8px] leading-none", elem.chip)}
                  aria-label={`${sign.name} · ${sign.element}`}
                >
                  {sign.symbol}
                </span>
              )}
              {hasEntry && (
                <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>

      {/* Element legend */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
        <span className="uppercase tracking-wider">Elements:</span>
        {(["Fire", "Earth", "Air", "Water"] as ZodiacInfo["element"][]).map((e) => (
          <span key={e} className={cn("inline-flex items-center gap-1 rounded-full px-1.5 py-0.5", ELEMENT_CLASS[e].chip)}>
            {ELEMENT_EMOJI[e]} {e}
          </span>
        ))}
      </div>

      <MoonDayOverview date={overview} onClose={() => setOverview(null)} />
    </div>
  );
}

function MoonDayOverview({ date, onClose }: { date: Date | null; onClose: () => void }) {
  if (!date) return (
    <Dialog open={false} onOpenChange={(o) => !o && onClose()}><DialogContent /></Dialog>
  );
  const phase = getMoonPhase(date);
  const moon = MOON_INFO[phase];
  const sign = getMoonSign(date);
  const elem = ELEMENT_CLASS[sign.element];
  const guide = MOON_IN_SIGN_GUIDE[sign.name];
  return (
    <Dialog open={!!date} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[calc(100vw-1.5rem)] max-w-md p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="pr-8 font-display text-base sm:text-lg">
            {moon.label} in {sign.name} {sign.symbol}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="text-4xl leading-none">{moon.glyph}</div>
            <div className="min-w-0 flex-1">
              <div className="text-xs text-muted-foreground">{format(date, "EEEE, MMMM d, yyyy")}</div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className={cn("rounded-full px-2 py-0.5", elem.chip)}>
                  {ELEMENT_EMOJI[sign.element]} {sign.element}
                </span>
                <span className="rounded-full border border-border/60 px-2 py-0.5 text-muted-foreground">{sign.modality}</span>
                <span className="rounded-full border border-border/60 px-2 py-0.5 text-muted-foreground">Ruler · {sign.ruler}</span>
              </div>
            </div>
          </div>

          <p className="rounded-md bg-muted/40 p-3 text-sm italic text-foreground/85">{moon.invitation}</p>

          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Vibe</p>
            <p className="mt-1 text-sm">{guide.vibe}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Body</p>
            <p className="mt-1 text-sm text-foreground/85">{guide.body}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Tiny actions</p>
            <ul className="mt-1 space-y-1">
              {guide.actions.map((a) => (
                <li key={a} className="rounded-md border border-border/50 bg-card/60 px-2.5 py-1.5 text-xs text-foreground/85">· {a}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-md border border-dashed border-border/60 px-2.5 py-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground/80">Ease off:</span> {guide.avoid}
          </div>

          <p className="pt-1 text-xs italic text-muted-foreground">{moon.affirmation}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}