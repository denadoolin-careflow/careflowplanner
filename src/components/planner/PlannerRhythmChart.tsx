import { ComposedChart, Area, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceArea, Legend } from "recharts";
import { useRhythmSeries } from "@/lib/planner/time-allocation";
import { cn } from "@/lib/utils";

/**
 * Planned vs completed hours across the window, read against moon
 * illumination, cycle phase bands and any logged energy.
 */
export function PlannerRhythmChart({ from, days, className }: { from: Date; days: number; className?: string }) {
  const { days: series, insights, hasCycle, hasLogs } = useRhythmSeries(from, days);

  const data = series.map(d => ({
    name: d.label,
    Planned: d.plannedH,
    Completed: d.doneH,
    Moon: Math.round(d.illumination) / 10, // 0-10 scale, shares the hours axis
    Energy: d.energyScore,
    iso: d.iso,
    moonLabel: d.moonLabel,
    cycleLabel: d.cycleLabel,
  }));

  // Contiguous cycle-phase runs become soft background bands.
  const bands: { from: string; to: string; color: string }[] = [];
  series.forEach((d, i) => {
    if (!d.cyclePhase || !d.cycleColor) return;
    const prev = series[i - 1];
    if (prev && prev.cyclePhase === d.cyclePhase) bands[bands.length - 1].to = d.label;
    else bands.push({ from: d.label, to: d.label, color: d.cycleColor });
  });

  if (series.every(d => d.plannedH === 0)) {
    return (
      <p className={cn("py-6 text-center text-xs text-muted-foreground", className)}>
        Nothing timed in this stretch yet — schedule a few things and your rhythm shows up here.
      </p>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
            {bands.map((b, i) => (
              <ReferenceArea
                key={`${b.from}-${i}`}
                x1={b.from}
                x2={b.to}
                fill={b.color}
                fillOpacity={0.1}
                stroke="none"
              />
            ))}
            <XAxis dataKey="name" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10 }} width={30} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 12 }}
              formatter={(v: number, n: string) => {
                if (n === "Moon") return [`${Math.round(v * 10)}% lit`, "Moon"];
                if (n === "Energy") return [v ? `${v.toFixed(1)} / 3` : "—", "Energy"];
                return [`${v}h`, n];
              }}
              labelFormatter={(l: string) => {
                const row = data.find(d => d.name === l);
                return [l, row?.moonLabel, row?.cycleLabel].filter(Boolean).join(" · ");
              }}
            />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Area type="monotone" dataKey="Moon" stroke="hsl(var(--muted-foreground))" strokeOpacity={0.5} fill="hsl(var(--muted-foreground))" fillOpacity={0.08} />
            <Bar dataKey="Planned" fill="hsl(var(--primary))" fillOpacity={0.35} radius={[4, 4, 0, 0]} />
            <Bar dataKey="Completed" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            {hasLogs && <Line type="monotone" dataKey="Energy" stroke="hsl(var(--phase-ovulatory))" strokeWidth={2} dot={{ r: 2 }} connectNulls />}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {hasCycle && (
        <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
          {[...new Map(series.filter(d => d.cyclePhase).map(d => [d.cyclePhase, d])).values()].map(d => (
            <span key={d.cyclePhase} className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full" style={{ background: d.cycleColor ?? undefined }} />
              {d.cycleLabel?.split(" · ")[0]}
            </span>
          ))}
        </div>
      )}

      {insights.length > 0 ? (
        <ul className="space-y-1 text-[11.5px] text-muted-foreground">
          {insights.map(t => <li key={t}>· {t}</li>)}
        </ul>
      ) : (
        <p className="text-[11px] text-muted-foreground">
          Keep logging energy and cycle days — patterns appear here once there's enough to be honest about.
        </p>
      )}
    </div>
  );
}
