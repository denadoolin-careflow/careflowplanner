import { useMemo } from "react";
import { moonIllumination } from "@/lib/planner-day-pulse";

/** Compact SVG moon visualization + phase label for the planner header. */
export function MoonInsightCard({ date, size = 36 }: { date: Date; size?: number }) {
  const m = useMemo(() => moonIllumination(date), [date]);
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-border/60 bg-card/60 px-3 py-2">
      <MoonSVG fraction={m.fraction} size={size} />
      <div className="leading-tight">
        <p className="text-xs font-semibold">{m.phaseName}</p>
        <p className="text-[10px] text-muted-foreground">{m.pct}% illuminated</p>
      </div>
    </div>
  );
}

export function MoonSVG({ fraction, size = 48 }: { fraction: number; size?: number }) {
  // fraction 0 = new, 0.5 = full. Use a compact 2-circle mask approximation.
  const r = size / 2;
  const waxing = fraction < 0.5;
  const illum = waxing ? fraction * 2 : (1 - fraction) * 2; // 0..1
  // Offset of the terminator circle
  const off = (1 - illum) * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <defs>
        <clipPath id={`moon-${size}-${fraction.toFixed(2)}`}>
          <circle cx={r} cy={r} r={r} />
        </clipPath>
      </defs>
      <circle cx={r} cy={r} r={r} fill="hsl(var(--muted))" />
      <g clipPath={`url(#moon-${size}-${fraction.toFixed(2)})`}>
        <circle
          cx={waxing ? r - off : r + off}
          cy={r}
          r={r}
          fill="hsl(var(--foreground))"
          fillOpacity={0.9}
        />
      </g>
      <circle cx={r} cy={r} r={r - 0.5} fill="none" stroke="hsl(var(--border))" strokeWidth={1} />
    </svg>
  );
}