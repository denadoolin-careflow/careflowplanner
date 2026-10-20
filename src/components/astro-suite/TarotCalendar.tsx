import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, isToday, startOfMonth, startOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight, Telescope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TarotCardArt, artForCard } from "./TarotCardArt";
import { getCardById } from "@/lib/astro-suite/tarot";
import { LunarDateConnections } from "@/components/cosmic/LunarDateConnections";
import { cosmicDateFromParam } from "@/lib/cosmic/lunar-rhythm";
import { SPREADS, dailyPullFor, loadPulls, pullsByDate, type TarotPull } from "@/lib/astro-suite/tarot-pulls";

/** Month grid of daily tarot pulls; tap a day to see its card and spreads. */
export function TarotCalendar({ initialDate }: { initialDate?: string }) {
  const [pulls, setPulls] = useState<TarotPull[]>(() => loadPulls());
  const start = cosmicDateFromParam(initialDate ?? null);
  const [month, setMonth] = useState(startOfMonth(start));
  const [selected, setSelected] = useState(format(start, "yyyy-MM-dd"));

  useEffect(() => {
    const on = () => setPulls(loadPulls());
    window.addEventListener("careflow:tarot-pulls", on);
    return () => window.removeEventListener("careflow:tarot-pulls", on);
  }, []);

  const byDate = useMemo(() => pullsByDate(pulls, format(month, "yyyy-MM")), [pulls, month]);
  const days = eachDayOfInterval({ start: startOfWeek(month), end: endOfWeek(endOfMonth(month)) });
  const dayPulls = pullsByDate(pulls).get(selected) ?? [];
  const daily = dailyPullFor(pulls, selected);
  const spreads = dayPulls.filter(p => p.spread !== "single");

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-soft space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-lg">Card calendar</h2>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" aria-label="Previous month" onClick={() => setMonth(m => addMonths(m, -1))}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="min-w-[7.5rem] text-center text-sm">{format(month, "MMMM yyyy")}</span>
          <Button size="icon" variant="ghost" aria-label="Next month" onClick={() => setMonth(m => addMonths(m, 1))}><ChevronRight className="h-4 w-4" /></Button>
          <Button size="sm" variant="outline" onClick={() => { const n = new Date(); setMonth(startOfMonth(n)); setSelected(format(n, "yyyy-MM-dd")); }}>Today</Button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-wider text-muted-foreground">
        {["S","M","T","W","T","F","S"].map((d, i) => <span key={i}>{d}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map(d => {
          const iso = format(d, "yyyy-MM-dd");
          const list = byDate.get(iso) ?? [];
          const dp = list.find(p => p.spread === "single");
          const card = dp ? getCardById(dp.cards[0]?.id) : undefined;
          const extra = list.filter(p => p.spread !== "single").length;
          return (
            <button key={iso} onClick={() => setSelected(iso)} aria-label={`${format(d, "MMM d")}${card ? `, ${card.name}` : ""}`}
              className={cn("relative flex aspect-[3/4] flex-col items-center overflow-hidden rounded-lg border p-0.5 text-[10px]",
                !isSameMonth(d, month) && "opacity-40",
                selected === iso ? "border-primary ring-1 ring-primary" : "border-border bg-background hover:bg-muted")}>
              <span className={cn("z-10 rounded px-1", isToday(d) && "bg-primary text-primary-foreground")}>{format(d, "d")}</span>
              {card && <img src={artForCard(card)} alt="" className={cn("absolute inset-0 h-full w-full object-cover opacity-80", dp!.cards[0].orientation === "reversed" && "rotate-180")} />}
              {extra > 0 && <span className="absolute bottom-0.5 right-0.5 z-10 rounded-full bg-accent px-1 text-[9px] text-accent-foreground">+{extra}</span>}
            </button>
          );
        })}
      </div>

      <div className="space-y-3 border-t border-border pt-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-display text-base">{format(new Date(`${selected}T12:00:00`), "EEEE, MMM d, yyyy")}</p>
          <Button asChild size="sm" variant="outline"><Link to={`/cosmic-flow/sky?date=${selected}`}><Telescope className="mr-1 h-3.5 w-3.5" />See the sky that day</Link></Button>
        </div>
        <LunarDateConnections date={cosmicDateFromParam(selected)} current="tarot" />
        {!dayPulls.length && <p className="text-sm text-muted-foreground">No cards pulled this day.</p>}
        {daily && (() => {
          const pc = daily.cards[0]; const card = getCardById(pc.id); if (!card) return null;
          const rev = pc.orientation === "reversed";
          return (
            <div className="flex gap-3">
              <div className="w-20 shrink-0"><TarotCardArt card={card} size="sm" reversed={rev} /></div>
              <div className="text-sm"><p className="text-xs uppercase tracking-wider text-muted-foreground">Daily card</p>
                <p className="font-medium">{card.name}{rev && " (reversed)"}</p><p className="text-foreground/85">{rev ? card.reversed : card.upright}</p></div>
            </div>
          );
        })()}
        {spreads.map(p => (
          <div key={p.id} className="rounded-xl border border-border p-2">
            <p className="text-xs text-muted-foreground">{SPREADS[p.spread].label} · {format(new Date(p.createdAt), "h:mm a")}</p>
            <ul className="mt-1 space-y-0.5 text-sm">
              {p.cards.map(c => <li key={c.id}><span className="text-muted-foreground">{c.position}:</span> {getCardById(c.id)?.name}{c.orientation === "reversed" && " (reversed)"}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
