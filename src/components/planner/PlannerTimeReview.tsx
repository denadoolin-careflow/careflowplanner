import { useState } from "react";
import { PieChart as PieIcon } from "lucide-react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useTimeAllocation, fmtHours, type GroupBy } from "@/lib/planner/time-allocation";

/** Where planned time went: a category wheel plus a planned-vs-completed graph. */
export function PlannerTimeReview({ from, days, label, className }: {
  from: Date;
  days: number;
  label: string;
  className?: string;
}) {
  const [groupBy, setGroupBy] = useState<GroupBy>("kind");
  const { slices, totalPlannedMin, totalDoneMin, plannedShare } = useTimeAllocation(from, days, groupBy);

  const top = slices[0];
  const share = totalPlannedMin > 0 && top ? Math.round((top.plannedMin / totalPlannedMin) * 100) : 0;

  const bars = slices.slice(0, 8).map(s => ({
    name: s.label,
    Planned: Math.round(s.plannedMin / 6) / 10,
    Completed: Math.round(s.doneMin / 6) / 10,
    color: s.color,
  }));

  return (
    <section aria-label="Time review" className={`cozy-card space-y-3 p-3 ${className ?? ""}`}>
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
          <PieIcon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Time review</p>
          <h3 className="truncate font-display text-base font-semibold">Where {label} went</h3>
        </div>
        <div
          role="group"
          aria-label="Group categories by"
          className="inline-flex shrink-0 rounded-full border border-border/60 bg-background/60 p-0.5"
        >
          {(["kind", "area"] as GroupBy[]).map(g => (
            <button
              key={g}
              type="button"
              onClick={() => setGroupBy(g)}
              aria-pressed={groupBy === g}
              className={`rounded-full px-2.5 py-1 text-[11px] transition-colors ${
                groupBy === g ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {g === "kind" ? "Type" : "Area"}
            </button>
          ))}
        </div>
      </div>

      {slices.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">
          Nothing timed yet — schedule a few things and your balance shows up here.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="relative h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={slices}
                  dataKey="plannedMin"
                  nameKey="label"
                  innerRadius="62%"
                  outerRadius="92%"
                  paddingAngle={2}
                  stroke="none"
                >
                  {slices.map(s => <Cell key={s.key} fill={s.color} />)}
                </Pie>
                <Tooltip
                  formatter={(v: number, n: string) => [`${fmtHours(v)} (${Math.round((v / totalPlannedMin) * 100)}%)`, n]}
                  contentStyle={{ fontSize: 12, borderRadius: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
              <div>
                <div className="font-display text-xl font-semibold tabular-nums">{fmtHours(totalPlannedMin)}</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {Math.round(plannedShare * 100)}% of waking time
                </div>
              </div>
            </div>
          </div>

          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bars} layout="vertical" margin={{ left: 4, right: 8, top: 4, bottom: 0 }}>
                <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} unit="h" />
                <YAxis type="category" dataKey="name" width={78} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip formatter={(v: number) => `${v}h`} contentStyle={{ fontSize: 12, borderRadius: 12 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="Planned" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={8} />
                <Bar dataKey="Completed" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} barSize={8} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {slices.length > 0 && (
        <p className="text-[11px] text-muted-foreground">
          {top.label} took {share}% of {label}; {fmtHours(totalDoneMin)} of {fmtHours(totalPlannedMin)} planned is complete.
        </p>
      )}
    </section>
  );
}
