import { useMemo } from "react";
import { Link } from "react-router-dom";
import { getActiveAspects, intensityStars } from "@/lib/cosmic/active-aspects";
import { encodeEventId } from "@/lib/cosmic/event-id";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const ACTION_TONE: Record<string, string> = {
  "Reach out":   "bg-primary/15 text-primary",
  "Stay focused":"bg-accent/30 text-accent-foreground",
  "Capture ideas":"bg-moon/20 text-moon-foreground",
  "Trust your gut":"bg-secondary/30 text-secondary-foreground",
};

export function CurrentTransitsTable({ date = new Date(), limit = 4 }: { date?: Date; limit?: number }) {
  const aspects = useMemo(() => getActiveAspects(date, limit), [date, limit]);

  return (
    <section className="cozy-card p-5" aria-label="Current transits">
      <header className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-base">Current Transits</h3>
        <Link to="/cosmic-flow/timeline" className="text-xs text-primary hover:underline">View all</Link>
      </header>

      {aspects.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">A quiet sky — a fine day for steady ordinary things.</p>
      ) : (
        <ul className="divide-y divide-border/40">
          {aspects.map(a => {
            const id = encodeEventId({ kind: "phase", date: format(date, "yyyy-MM-dd"), planet: a.a, sign: a.aSign });
            const toneClass = ACTION_TONE[a.action] ?? "bg-primary/15 text-primary";
            return (
              <li key={a.id} className="py-3 first:pt-0 last:pb-0">
                <Link to={`/cosmic-flow/event/${encodeURIComponent(id)}`} className="grid grid-cols-[44px_minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,130px)] items-center gap-3 hover:opacity-90">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted/60 text-lg" aria-hidden>
                    <span>{a.aGlyph}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-medium leading-tight">{a.title}</p>
                    <p className="text-[11px] text-muted-foreground">{a.window}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12.5px] leading-snug">{a.meaning}</p>
                    <p className="text-[11px] text-muted-foreground">Affects: {a.affects}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Intensity</p>
                    <p className="font-mono text-[13px] tracking-tight text-primary/80">{intensityStars(a.intensity)}</p>
                    <Badge className={`mt-0.5 border-transparent px-2 text-[10.5px] font-medium ${toneClass}`}>{a.action}</Badge>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}