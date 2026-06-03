import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { ChevronDown, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useAstrologyEnabled, useTransitsEnabled } from "@/lib/astrology-prefs";
import { getTransitsForDate } from "@/lib/transits";
import { getRhythmForecast } from "@/lib/rhythm-forecast";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  collapsed: boolean;
  open: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
}

/**
 * Sidebar disclosure showing today's moon snapshot + active transits as a
 * compact list. Hidden when the astrology master toggle is off.
 */
export function AstrologySection({ collapsed, open, onToggle, onNavigate }: Props) {
  const [astroOn] = useAstrologyEnabled();
  const transitsOn = useTransitsEnabled();
  const [today, setToday] = useState(() => new Date());
  useEffect(() => {
    // Refresh at the next midnight tick so the sidebar reflects today.
    const t = setInterval(() => setToday(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  if (!astroOn) return null;

  const iso = format(today, "yyyy-MM-dd");
  const todayHref = `/today?date=${iso}`;
  const forecast = getRhythmForecast(today);
  const transits = transitsOn ? getTransitsForDate(today) : [];

  if (collapsed) {
    return (
      <div className="mb-1 flex flex-col items-center gap-0.5">
        <Tooltip delayDuration={150}>
          <TooltipTrigger asChild>
            <NavLink
              to={todayHref}
              onClick={onNavigate}
              className="grid h-10 w-10 place-items-center rounded-xl text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <span aria-hidden className="text-base leading-none">{forecast.glyph}</span>
            </NavLink>
          </TooltipTrigger>
          <TooltipContent side="right">
            {forecast.phaseLabel} · Moon in {forecast.sign.sign}
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <div className="mb-1">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
      >
        <Sparkles className="h-3.5 w-3.5 opacity-70" />
        <span className="flex-1 text-left">Astrology</span>
        <span className="text-[10px] normal-case tracking-normal text-sidebar-foreground/50">
          {forecast.glyph} {forecast.sign.glyph}
        </span>
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", open ? "rotate-0" : "-rotate-90")} />
      </button>
      <div className={cn("grid overflow-hidden transition-[grid-template-rows] duration-300 ease-out", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
        <div className="min-h-0 overflow-hidden">
          <div className="mt-1 flex flex-col gap-0.5 pl-1">
            <NavLink
              to={todayHref}
              onClick={onNavigate}
              className="group flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              title={`${forecast.phaseLabel} · Moon in ${forecast.sign.sign}`}
            >
              <span aria-hidden className="text-base leading-none">{forecast.glyph}</span>
              <span className="flex-1 truncate">{forecast.phaseLabel}</span>
              <span className="text-[10px] text-sidebar-foreground/50">{forecast.sign.sign}</span>
            </NavLink>
            {transitsOn && transits.length === 0 && (
              <p className="px-2 py-1 text-[11px] text-sidebar-foreground/50">No major transits today.</p>
            )}
            {transitsOn && transits.map(t => (
              <NavLink
                key={t.id}
                to={todayHref}
                onClick={onNavigate}
                title={t.detail}
                className={cn(
                  "group flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12px]",
                  "text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  t.tone === "warn" && "text-amber-600 dark:text-amber-400",
                )}
              >
                <span aria-hidden className="w-7 shrink-0 text-[11px] leading-none">{t.glyph}</span>
                <span className="flex-1 truncate">{t.label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}