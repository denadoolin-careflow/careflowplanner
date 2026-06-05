import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildMonthEvents, type AstroEvent } from "@/lib/cosmic/astro/calendar";

const KIND_COLOR: Record<string, string> = {
  "new-moon": "bg-slate-200 dark:bg-slate-700",
  "first-quarter": "bg-blue-200 dark:bg-blue-900",
  "full-moon": "bg-amber-200 dark:bg-amber-900",
  "last-quarter": "bg-purple-200 dark:bg-purple-900",
  "ingress": "bg-emerald-200 dark:bg-emerald-900",
  "retrograde-start": "bg-rose-200 dark:bg-rose-900",
  "direct-station": "bg-teal-200 dark:bg-teal-900",
  "voc": "bg-zinc-200 dark:bg-zinc-700",
  "solstice": "bg-orange-200 dark:bg-orange-900",
  "equinox": "bg-lime-200 dark:bg-lime-900",
};

export default function CosmicCalendar() {
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const events = useMemo(() => buildMonthEvents(month.getFullYear(), month.getMonth()), [month]);

  const byDate: Record<string, AstroEvent[]> = {};
  for (const e of events) (byDate[e.date] ||= []).push(e);

  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const firstDow = new Date(month.getFullYear(), month.getMonth(), 1).getDay();

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-3 pb-28 sm:p-6">
      <header className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm" className="h-8 px-2"><Link to="/cosmic-flow"><ArrowLeft className="h-4 w-4 mr-1" />Back</Link></Button>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}><ChevronLeft className="h-4 w-4" /></Button>
          <h1 className="font-display text-lg w-32 text-center">{month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</h1>
          <Button variant="ghost" size="icon" onClick={() => setMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}><ChevronRight className="h-4 w-4" /></Button>
        </div>
        <div className="w-12" />
      </header>

      <div className="cozy-card p-3">
        <div className="grid grid-cols-7 text-center text-[10px] text-muted-foreground mb-1">
          {["S","M","T","W","T","F","S"].map(d => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDow }).map((_, i) => <div key={`p-${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const iso = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const dayEvents = byDate[iso] ?? [];
            return (
              <div key={iso} className="min-h-[64px] rounded border border-border/40 p-1 text-[10px]">
                <div className="font-medium">{day}</div>
                <div className="mt-0.5 space-y-0.5">
                  {dayEvents.slice(0, 3).map((e, idx) => (
                    <div key={idx} className={`truncate rounded px-1 py-0.5 ${KIND_COLOR[e.kind] ?? "bg-muted"}`} title={e.label}>
                      {e.label}
                    </div>
                  ))}
                  {dayEvents.length > 3 && <p className="text-muted-foreground">+{dayEvents.length - 3} more</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}