import { useMemo } from "react";
import { getForecast } from "@/lib/cosmic/forecast";

const TONE_COLOR: Record<string, string> = {
  favorable: "hsl(145 50% 55%)",
  challenging: "hsl(20 75% 60%)",
  reflective: "hsl(258 50% 65%)",
};

export function CosmicForecastChart({ from = new Date(), days = 7 }: { from?: Date; days?: number }) {
  const data = useMemo(() => getForecast(from, days), [from, days]);
  const scores = data.map(d => d.score);
  const max = Math.max(...scores, 3);
  const min = Math.min(...scores, -3);
  const range = Math.max(1, max - min);
  return (
    <section className="cozy-card flex flex-col gap-3 p-4 sm:p-5" aria-label="Cosmic forecast">
      <header>
        <h3 className="font-display text-base">Cosmic Forecast</h3>
        <p className="text-xs text-muted-foreground">Next {days} days</p>
      </header>
      <div className="flex h-28 items-end justify-between gap-1 sm:h-32 sm:gap-2">
        {data.map(d => {
          const norm = (d.score - min) / range;
          const h = Math.max(18, Math.round(norm * 100));
          return (
            <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-md ring-1 ring-white/10 transition-all"
                style={{ height: `${h}%`, background: TONE_COLOR[d.tone] }}
                title={`${d.label}: ${d.tone}`}
              />
              <span className="text-[10px] sm:text-[11px] text-muted-foreground">{d.label}</span>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
        <Legend color={TONE_COLOR.favorable} label="Favorable" />
        <Legend color={TONE_COLOR.challenging} label="Challenging" />
        <Legend color={TONE_COLOR.reflective} label="Reflective" />
      </div>
    </section>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}