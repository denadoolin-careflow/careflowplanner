import { useMemo } from "react";
import { format } from "date-fns";
import type { ExtPlanet } from "@/lib/cosmic/astro/bodies";
import { orbSeries } from "@/lib/cosmic/sky";

/** Line graph of a transit tightening to exact (top) and separating. */
export function OrbPeakChart({ body, natalLon, angle, from = new Date(), days = 180, maxOrb = 8 }: {
  body: ExtPlanet; natalLon: number; angle: number; from?: Date; days?: number; maxOrb?: number;
}) {
  const pts = useMemo(() => orbSeries(body, natalLon, angle, from, days, body === "Moon" ? 0.25 : 2), [body, natalLon, angle, from, days]);
  const W = 320, H = 110, pad = 6;
  const x = (i: number) => pad + (i / (pts.length - 1)) * (W - 2 * pad);
  const y = (o: number) => pad + (Math.min(o, maxOrb) / maxOrb) * (H - 2 * pad - 14);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.orb).toFixed(1)}`).join(" ");
  const peaks = pts.map((p, i) => ({ p, i })).filter(({ p, i }) => i > 0 && i < pts.length - 1 && p.orb < 1.5 && p.orb <= pts[i - 1].orb && p.orb <= pts[i + 1].orb);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Transit strength over time">
      <line x1={pad} x2={W - pad} y1={y(0)} y2={y(0)} stroke="hsl(var(--primary) / 0.3)" strokeDasharray="3 3" />
      <text x={W - pad} y={y(0) - 2} textAnchor="end" fontSize={8} fill="hsl(var(--muted-foreground))">exact</text>
      <path d={d} fill="none" stroke="hsl(var(--primary))" strokeWidth={1.6} />
      {peaks.map(({ p, i }) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(p.orb)} r={3} fill="hsl(var(--accent))" />
          <text x={x(i)} y={H - 4} textAnchor="middle" fontSize={8} fill="hsl(var(--foreground))">{format(p.date, "MMM d")}</text>
        </g>
      ))}
      <text x={pad} y={H - 4} fontSize={8} fill="hsl(var(--muted-foreground))">{format(pts[0].date, "MMM d")}</text>
    </svg>
  );
}
