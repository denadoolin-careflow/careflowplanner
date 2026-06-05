import { useState } from "react";
import type { NatalChartV2 } from "@/lib/cosmic/chart";

const SIGN_GLYPHS = ["♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓"];

/** SVG natal wheel with clickable signs/houses/planets. */
export function NatalWheel({ chart, onSelect, size = 320 }: { chart: NatalChartV2; onSelect?: (kind: "planet" | "house" | "sign", id: string) => void; size?: number }) {
  const [hover, setHover] = useState<string | null>(null);
  const cx = size / 2, cy = size / 2;
  const rOuter = size / 2 - 4;
  const rSign = rOuter - 26;
  const rHouse = rSign - 30;
  const rPlanet = rHouse - 26;

  function polar(angle: number, r: number) {
    // 0° Aries is on the left (East), counter-clockwise increasing.
    const a = (180 - angle) * (Math.PI / 180);
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  }

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-xs mx-auto" role="img" aria-label="Natal chart wheel">
      <circle cx={cx} cy={cy} r={rOuter} fill="hsl(var(--card))" stroke="hsl(var(--border))" />
      <circle cx={cx} cy={cy} r={rSign} fill="none" stroke="hsl(var(--border)/0.6)" />
      <circle cx={cx} cy={cy} r={rHouse} fill="none" stroke="hsl(var(--border)/0.4)" />

      {/* Sign segments */}
      {SIGN_GLYPHS.map((g, i) => {
        const mid = i * 30 + 15;
        const p = polar(mid, (rSign + rOuter) / 2);
        return (
          <g key={g} onClick={() => onSelect?.("sign", g)} className="cursor-pointer">
            <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central" fontSize={14} fill="hsl(var(--foreground))">{g}</text>
          </g>
        );
      })}

      {/* Sign dividers */}
      {Array.from({ length: 12 }).map((_, i) => {
        const a = polar(i * 30, rSign);
        const b = polar(i * 30, rOuter);
        return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="hsl(var(--border))" />;
      })}

      {/* House cusps */}
      {chart.houses?.cusps.map((c, i) => {
        const a = polar(c, 0);
        const b = polar(c, rHouse);
        return <line key={`h-${i}`} x1={cx} y1={cy} x2={b.x} y2={b.y} stroke={i === 0 ? "hsl(var(--primary))" : "hsl(var(--border)/0.5)"} strokeWidth={i === 0 || i === 9 ? 1.5 : 0.6} />;
      })}
      {chart.houses?.cusps.map((c, i) => {
        const mid = c + 15;
        const p = polar(mid, (rHouse + rPlanet) / 2 + 8);
        return <text key={`hn-${i}`} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central" fontSize={9} fill="hsl(var(--muted-foreground))">{i + 1}</text>;
      })}

      {/* Planets */}
      {chart.planets.map(p => {
        const pos = polar(p.longitude, rPlanet);
        return (
          <g key={p.body} onClick={() => onSelect?.("planet", p.body as string)}
             onMouseEnter={() => setHover(p.body as string)} onMouseLeave={() => setHover(null)}
             className="cursor-pointer">
            <circle cx={pos.x} cy={pos.y} r={hover === p.body ? 12 : 9} fill="hsl(var(--background))" stroke="hsl(var(--primary))" />
            <text x={pos.x} y={pos.y} textAnchor="middle" dominantBaseline="central" fontSize={11} fill="hsl(var(--foreground))">{p.glyph}</text>
          </g>
        );
      })}

      {/* ASC marker */}
      {chart.houses && (
        <text {...polar(chart.houses.ascendant, rOuter - 6)} textAnchor="middle" fontSize={9} fill="hsl(var(--primary))">ASC</text>
      )}
    </svg>
  );
}