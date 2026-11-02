import { useState } from "react";
import { format } from "date-fns";
import { MonthSeasonHeader } from "@/components/planner/MonthSeasonHeader";
import { MonthlyMoonscape } from "@/components/planner/MonthlyMoonscape";
import { MobileWeekAgendaStrip } from "@/components/planner/mobile/MobileWeekAgendaStrip";
import { PlannerPriorityStrip } from "@/components/planner/PlannerPriorityStrip";

/** Placement preview: where the month photo + moonscape sit relative to the day strip and Top 3. */
export default function MonthPicMockups() {
  const [day, setDay] = useState(new Date());
  const month = new Date(day.getFullYear(), day.getMonth(), 1);

  const weekStrip = <MobileWeekAgendaStrip day={day} onSelect={setDay} rich />;
  const monthPhoto = <MonthSeasonHeader month={month} className="mb-3" />;
  const moonscape = (
    <div className="mb-3 rounded-[20px] bg-card p-4 shadow-soft">
      <MonthlyMoonscape month={month} selectedDate={day} onSelectDate={setDay} />
    </div>
  );
  const topThree = <PlannerPriorityStrip date={day} scope="day" className="mb-3" />;

  const options = [
    { id: "A", title: "A · Picture first", note: "Month photo and moonscape open the page, then the day strip, then Top 3.", parts: [monthPhoto, moonscape, weekStrip, topThree] },
    { id: "B", title: "B · Day strip first", note: "Day strip stays on top; photo and moonscape land just above Top 3.", parts: [weekStrip, monthPhoto, moonscape, topThree] },
  ];

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-24 pt-6">
      <h1 className="font-display text-3xl text-foreground">Month picture placement</h1>
      <p className="mt-1 text-[15px] text-muted-foreground">
        Two ways to move the November photo and the monthly moonscape above Top 3 and the week scroll. Tap any day to see the picture follow.
      </p>
      {options.map((o) => (
        <section key={o.id} aria-label={o.title} className="mt-8">
          <div className="sticky top-0 z-10 -mx-4 mb-3 border-b border-border/50 bg-background/95 px-4 py-2 backdrop-blur">
            <h2 className="font-display text-xl text-foreground">{o.title}</h2>
            <p className="text-[13px] text-muted-foreground">{o.note}</p>
          </div>
          <div className="rounded-[24px] border border-border/40 bg-background p-3 shadow-soft">
            <p className="px-1 pb-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{format(day, "EEEE, MMMM d")}</p>
            {o.parts.map((part, i) => <div key={i}>{part}</div>)}
          </div>
        </section>
      ))}
    </div>
  );
}
