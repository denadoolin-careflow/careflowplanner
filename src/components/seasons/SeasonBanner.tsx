import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ELEMENT_CLASSES } from "@/lib/seasons/element-classes";
import { ELEMENT_META, seasonForDate, seasonsInMonth, seasonRangeLabel } from "@/lib/seasons/zodiac-seasons";

/**
 * Calm seasonal header: which zodiac season the month sits in,
 * its element colour, and one short "how to plan this month" line.
 */
export function SeasonBanner({
  date, compact = false, linkTo,
}: { date: Date; compact?: boolean; linkTo?: string }) {
  const spans = seasonsInMonth(date);
  const today = new Date();
  const active = spans.find(s => s.season.key === seasonForDate(today).key)?.season ?? spans[0].season;
  const el = ELEMENT_CLASSES[active.element];
  const howTo = active.planningFocus[0];
  const title = spans.length > 1
    ? `${spans[0].season.sign} to ${spans[spans.length - 1].season.sign} season`
    : `${active.sign} season`;

  const body = (
    <div className={cn("rounded-2xl border px-4 py-3", el.bg, el.border)}>
      <div className="flex items-start gap-3">
        <span className={cn("mt-0.5 text-2xl leading-none", el.text)} aria-hidden>{active.glyph}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <p className="font-display text-sm font-semibold">{title}</p>
            <span className="text-[11px] text-muted-foreground">
              {ELEMENT_META[active.element].label} · {seasonRangeLabel(active)}
            </span>
          </div>
          <p className={cn("text-xs font-medium", el.text)}>{active.theme}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            How to plan {format(date, "MMMM")}: {howTo.toLowerCase()}.
          </p>
          {!compact && (
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{active.overview}</p>
          )}
        </div>
        {linkTo && <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />}
      </div>
    </div>
  );

  return linkTo ? <Link to={linkTo} className="block">{body}</Link> : body;
}
