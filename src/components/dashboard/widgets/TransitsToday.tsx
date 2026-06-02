import { useMemo } from "react";
import { Telescope } from "lucide-react";
import { getTransitsForDate } from "@/lib/transits";
import { useTransitsEnabled } from "@/lib/astrology-prefs";
import { cn } from "@/lib/utils";

/**
 * Compact dashboard widget that lists today's notable transits.
 * Renders its own card chrome — register with `bare: true`.
 */
export function TransitsTodayWidget() {
  const enabled = useTransitsEnabled();
  const transits = useMemo(() => (enabled ? getTransitsForDate(new Date()) : []), [enabled]);
  if (!enabled) return null;

  return (
    <section
      aria-label="Transits today"
      className="cozy-card flex h-full flex-col gap-2 p-4"
    >
      <header className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        <Telescope className="h-3 w-3" /> Transits today
      </header>
      {transits.length === 0 ? (
        <p className="text-[12.5px] italic text-muted-foreground">
          Quiet sky. A small steady day is a fine day.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {transits.slice(0, 4).map(t => (
            <li
              key={t.id}
              className={cn(
                "rounded-xl border border-border/50 bg-card/60 px-2.5 py-1.5 text-[12.5px]",
              )}
            >
              <div className="flex items-center gap-1.5">
                <span aria-hidden className="text-sm leading-none">{t.glyph}</span>
                <span className="font-medium">{t.label}</span>
              </div>
              <p className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground">{t.detail}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}