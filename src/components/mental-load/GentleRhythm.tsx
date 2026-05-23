import { useEffect, useState } from "react";
import { SectionCard } from "@/components/cards/SectionCard";
import { loadRecentCheckins, MentalLoadCheckin, loadTone } from "@/lib/mental-load";
import { cn } from "@/lib/utils";

export function GentleRhythm({ uid }: { uid: string }) {
  const [rows, setRows] = useState<MentalLoadCheckin[]>([]);
  useEffect(() => { loadRecentCheckins(uid, 14).then(setRows); }, [uid]);

  const byDate = new Map(rows.map((r) => [r.date, r]));
  const days: { date: string; label: string; r?: MentalLoadCheckin }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    days.push({ date: iso, label: d.toLocaleDateString(undefined, { weekday: "short" })[0], r: byDate.get(iso) });
  }

  // Find heaviest weekday across recent data
  const weekdayLoad: Record<number, { sum: number; n: number }> = {};
  rows.forEach((r) => {
    const wd = new Date(r.date).getDay();
    const load = (6 - r.energy) + (6 - r.emotional) + (6 - r.caregiving);
    weekdayLoad[wd] = weekdayLoad[wd] ?? { sum: 0, n: 0 };
    weekdayLoad[wd].sum += load; weekdayLoad[wd].n += 1;
  });
  const heaviest = Object.entries(weekdayLoad).map(([wd, v]) => ({ wd: Number(wd), avg: v.sum / v.n }))
    .sort((a, b) => b.avg - a.avg)[0];
  const dayName = (n: number) => ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"][n];

  return (
    <SectionCard title="Gentle rhythm" subtitle="The last 14 days — softer colors mean lighter days." accent="calm">
      <div className="flex items-end gap-1">
        {days.map((d) => (
          <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex h-12 w-full flex-col gap-0.5">
              {d.r ? (
                <>
                  <div className={cn("flex-1 rounded-sm", loadTone(d.r.energy))} title={`energy ${d.r.energy}/5`} />
                  <div className={cn("flex-1 rounded-sm", loadTone(d.r.emotional))} title={`emotional ${d.r.emotional}/5`} />
                  <div className={cn("flex-1 rounded-sm", loadTone(d.r.caregiving))} title={`caregiving ${d.r.caregiving}/5`} />
                </>
              ) : (
                <div className="flex-1 rounded-sm bg-muted/40" />
              )}
            </div>
            <span className="text-[10px] text-muted-foreground">{d.label}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        {rows.length < 3
          ? "A few more check-ins will reveal your patterns. No pressure."
          : heaviest
            ? `${dayName(heaviest.wd)} tend to feel heaviest — consider a softer plan.`
            : "You're holding things gently this week."}
      </p>
    </SectionCard>
  );
}