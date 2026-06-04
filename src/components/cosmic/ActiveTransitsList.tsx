import { useMemo } from "react";
import { Link } from "react-router-dom";
import { getTransitsForDate } from "@/lib/transits";
import { encodeEventId } from "@/lib/cosmic/event-id";
import { format } from "date-fns";

export function ActiveTransitsList({ date = new Date() }: { date?: Date }) {
  const transits = useMemo(() => getTransitsForDate(date), [date]);
  return (
    <section className="cozy-card flex flex-col gap-3 p-5" aria-label="Active transits">
      <header className="flex items-center justify-between">
        <h3 className="font-display text-base">Active Transits</h3>
        <Link to="/cosmic-flow/timeline" className="text-xs text-primary hover:underline">View all</Link>
      </header>
      {transits.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">A quiet sky — a fine day for steady ordinary things.</p>
      ) : (
        <ul className="space-y-2">
          {transits.map(t => {
            const id = encodeEventId({
              kind: t.kind === "in-sign" ? "phase" : (t.kind as any),
              date: format(date, "yyyy-MM-dd"),
              planet: t.planet,
              sign: t.sign,
            });
            return (
              <li key={t.id}>
                <Link
                  to={`/cosmic-flow/event/${encodeURIComponent(id)}`}
                  className="block rounded-lg border border-border/50 bg-card/60 p-2.5 transition-colors hover:bg-card"
                >
                  <div className="flex items-center gap-2 text-sm">
                    <span aria-hidden className="text-base">{t.glyph}</span>
                    <span className="font-medium">{t.label}</span>
                  </div>
                  <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">{t.detail}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}