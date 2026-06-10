import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, isSameDay } from "date-fns";
import { cachedSnapshot, type DaySnapshot } from "@/lib/cosmic/event-meta";
import { ELEMENT_VAR, type Element } from "@/lib/cosmic/glyphs";
import { CosmicDaySheet } from "@/components/cosmic/CosmicDaySheet";
import { cn } from "@/lib/utils";
import { TransitDetailSheet } from "@/components/cosmic/TransitDetailSheet";
import { elementFor } from "@/lib/cosmic/event-meta";
import { format as fmt } from "date-fns";
import type { CosmicEvent } from "@/lib/cosmic/events";

function cellStyle(el: Element | null, intensity: number): React.CSSProperties {
  if (!el) return {};
  const v = ELEMENT_VAR[el];
  const alpha = Math.min(0.32, 0.08 + intensity * 0.04);
  return { background: `hsl(var(${v}) / ${alpha})`, borderColor: `hsl(var(${v}) / 0.35)` };
}

function DayCell({ snap, onClick }: { snap: DaySnapshot; onClick: () => void }) {
  const today = isSameDay(snap.date, new Date());
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex min-h-[78px] flex-col rounded-lg border p-1.5 text-left transition-colors hover:opacity-90",
        today && "ring-2 ring-primary/60",
      )}
      style={cellStyle(snap.dominantElement, snap.intensity)}
    >
      <div className="flex items-start justify-between">
        <span className="text-[12px] font-medium">{snap.date.getDate()}</span>
        <span className="text-[14px] leading-none" aria-hidden>{snap.moonGlyph}</span>
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-1">
        {snap.hasEclipse && (
          <span className="rounded-sm bg-amber-500/20 px-1 text-[9px] font-medium text-amber-700 dark:text-amber-300">ECL</span>
        )}
        {snap.hasRetro && (
          <span className="rounded-sm bg-rose-500/20 px-1 text-[9px] font-medium text-rose-700 dark:text-rose-300">℞</span>
        )}
        {snap.events.some(e => e.kind === "ingress") && (
          <span className="rounded-sm bg-emerald-500/20 px-1 text-[9px] font-medium text-emerald-700 dark:text-emerald-300">→</span>
        )}
      </div>

      {/* Intensity bar */}
      {snap.intensity > 0 && (
        <span
          className="absolute inset-x-1 bottom-0.5 h-[2px] rounded-full bg-foreground/30"
          style={{ width: `${Math.min(100, snap.intensity * 14)}%` }}
        />
      )}
    </button>
  );
}

function LegendDot({ varName, label }: { varName: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
      <span className="h-2 w-2 rounded-full" style={{ background: `hsl(var(${varName}))` }} />
      {label}
    </span>
  );
}

export default function CosmicCalendar() {
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [openDate, setOpenDate] = useState<Date | null>(null);
  const [openEvent, setOpenEvent] = useState<CosmicEvent | null>(null);

  const days = useMemo(() => {
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) =>
      cachedSnapshot(new Date(month.getFullYear(), month.getMonth(), i + 1)),
    );
  }, [month]);

  const firstDow = new Date(month.getFullYear(), month.getMonth(), 1).getDay();

  const monthTransits = useMemo(() => {
    const all: { day: number; date: Date; event: CosmicEvent }[] = [];
    for (const snap of days) {
      for (const ev of snap.events) all.push({ day: snap.date.getDate(), date: snap.date, event: ev });
    }
    return all;
  }, [days]);

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-3 pb-28 sm:p-6">
      <header className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm" className="h-8 px-2">
          <Link to="/cosmic-flow"><ArrowLeft className="h-4 w-4 mr-1" />Back</Link>
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h1 className="font-display text-lg w-36 text-center">
            {month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
          </h1>
          <Button variant="ghost" size="icon" onClick={() => setMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="w-12" />
      </header>

      <div className="cozy-card p-3">
        <div className="grid grid-cols-7 mb-1 text-center text-[10px] text-muted-foreground">
          {["S","M","T","W","T","F","S"].map((d, i) => <div key={`${d}-${i}`}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDow }).map((_, i) => <div key={`p-${i}`} />)}
          {days.map(snap => (
            <DayCell key={snap.date.toISOString()} snap={snap} onClick={() => setOpenDate(snap.date)} />
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
          <LegendDot varName="--element-fire" label="Fire" />
          <LegendDot varName="--element-earth" label="Earth" />
          <LegendDot varName="--element-air" label="Air" />
          <LegendDot varName="--element-water" label="Water" />
          <span className="text-[10px] text-muted-foreground">·</span>
          <span className="text-[10px] text-muted-foreground">℞ retrograde · ECL eclipse · → ingress</span>
        </div>
      </div>

      <section className="cozy-card p-4" aria-label="Transits this month">
        <header className="mb-2 flex items-center justify-between">
          <h2 className="font-display text-base">Transits this month</h2>
          <span className="text-[11px] text-muted-foreground">{monthTransits.length} events</span>
        </header>
        {monthTransits.length === 0 ? (
          <p className="text-sm italic text-muted-foreground">A quiet month — fine for steady, ordinary things.</p>
        ) : (
          <ul className="divide-y divide-border/40">
            {monthTransits.map((row, i) => {
              const el = elementFor(row.event, row.date);
              const glyphStyle: React.CSSProperties = el ? { color: `hsl(var(${ELEMENT_VAR[el]}))` } : {};
              return (
                <li key={`${row.event.id}-${i}`}>
                  <button
                    type="button"
                    onClick={() => setOpenEvent(row.event)}
                    className="flex w-full items-center gap-3 py-2 text-left transition-colors hover:bg-muted/40"
                  >
                    <span className="w-12 shrink-0 text-[11px] text-muted-foreground">{fmt(row.date, "EEE d")}</span>
                    <span className="text-base" aria-hidden style={glyphStyle}>{row.event.glyph}</span>
                    <span className="min-w-0 flex-1 truncate text-[13px]">{row.event.title}</span>
                    {el && (
                      <span className="rounded-full px-2 py-0.5 text-[10px]" style={{ background: `hsl(var(${ELEMENT_VAR[el]}) / 0.18)`, color: `hsl(var(${ELEMENT_VAR[el]}))` }}>
                        {el}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <CosmicDaySheet open={!!openDate} onOpenChange={o => !o && setOpenDate(null)} date={openDate} />
      <TransitDetailSheet event={openEvent} open={!!openEvent} onOpenChange={v => !v && setOpenEvent(null)} />
    </div>
  );
}
