import { useMemo, useState } from "react";
import type { NatalChartV2, NatalPlanet } from "@/lib/cosmic/chart";
import { SIGN_GLYPH, ELEMENT_VAR, SIGN_ELEMENT, ASPECT_COLOR_VAR } from "@/lib/cosmic/glyphs";
import type { Sign } from "@/lib/transits";

const SIGNS: Sign[] = [
  "Aries","Taurus","Gemini","Cancer","Leo","Virgo",
  "Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces",
];

const SIZE = 360;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R_OUTER = 168;
const R_SIGN_INNER = 140;
const R_HOUSE_RING = 112;
const R_PLANET = 92;
const R_INNER = 56;

/**
 * Convert ecliptic longitude → screen angle (radians, SVG convention).
 * Ascendant anchored at 9 o'clock (180° screen), houses run CCW.
 */
function lonToScreen(lon: number, ascSignIndex: number): number {
  // Degrees forward from start of the Ascendant sign (0..360, CCW in zodiac).
  const fromAscSignStart = (((lon - ascSignIndex * 30) % 360) + 360) % 360;
  // 0° at the Ascendant cusp = 180° screen; progress CCW → screen angle decreases.
  return ((180 - fromAscSignStart) * Math.PI) / 180;
}
function polar(lon: number, r: number, ascSignIndex: number) {
  const a = lonToScreen(lon, ascSignIndex);
  return { x: CX + r * Math.cos(a), y: CY - r * Math.sin(a) };
}
function arcPath(startLon: number, endLon: number, rIn: number, rOut: number, ascSignIndex: number): string {
  const a1 = lonToScreen(startLon, ascSignIndex);
  const a2 = lonToScreen(endLon, ascSignIndex);
  const p1 = { x: CX + rOut * Math.cos(a1), y: CY - rOut * Math.sin(a1) };
  const p2 = { x: CX + rOut * Math.cos(a2), y: CY - rOut * Math.sin(a2) };
  const p3 = { x: CX + rIn * Math.cos(a2), y: CY - rIn * Math.sin(a2) };
  const p4 = { x: CX + rIn * Math.cos(a1), y: CY - rIn * Math.sin(a1) };
  // CCW sweep (a2 < a1 in screen radians because we anchor + go CCW)
  return `M${p1.x},${p1.y} A${rOut},${rOut} 0 0 0 ${p2.x},${p2.y} L${p3.x},${p3.y} A${rIn},${rIn} 0 0 1 ${p4.x},${p4.y} Z`;
}

/** Spread overlapping planet glyphs so they don't collide. */
function spreadPositions(planets: NatalPlanet[], ascSignIndex: number): { p: NatalPlanet; lon: number }[] {
  const sorted = [...planets].sort((a, b) => a.longitude - b.longitude);
  const minSep = 7;
  const out: { p: NatalPlanet; lon: number }[] = sorted.map(p => ({ p, lon: p.longitude }));
  for (let pass = 0; pass < 4; pass++) {
    for (let i = 0; i < out.length; i++) {
      const a = out[i], b = out[(i + 1) % out.length];
      let gap = (b.lon - a.lon + 360) % 360;
      if (gap < minSep) {
        const push = (minSep - gap) / 2;
        a.lon = (a.lon - push + 360) % 360;
        b.lon = (b.lon + push) % 360;
      }
    }
  }
  void ascSignIndex;
  return out;
}

interface Props {
  chart: NatalChartV2;
  onSelectPlanet?: (p: NatalPlanet) => void;
  showAspects?: boolean;
}

export function NatalWheel({ chart, onSelectPlanet, showAspects = true }: Props) {
  const [hover, setHover] = useState<string | null>(null);
  const ascSignIndex = chart.houses ? Math.floor(chart.houses.ascendant / 30) % 12 : 0;

  const positions = useMemo(() => spreadPositions(chart.planets, ascSignIndex), [chart.planets, ascSignIndex]);
  const planetScreenLon = new Map(positions.map(({ p, lon }) => [p.body as string, lon]));

  const ringStroke = "hsl(var(--border))";

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="w-full max-w-sm mx-auto touch-manipulation select-none"
      role="img"
      aria-label="Natal chart wheel"
    >
      {/* outer ring */}
      <circle cx={CX} cy={CY} r={R_OUTER} fill="hsl(var(--card))" stroke={ringStroke} strokeWidth={1.2} />

      {/* element-colored sign slices */}
      {SIGNS.map((sign, idx) => {
        const start = idx * 30;
        const end = start + 30;
        const colorVar = ELEMENT_VAR[SIGN_ELEMENT[sign]];
        return (
          <path
            key={`slice-${sign}`}
            d={arcPath(start, end, R_SIGN_INNER, R_OUTER, ascSignIndex)}
            fill={`hsl(var(${colorVar}) / 0.18)`}
            stroke={ringStroke}
            strokeOpacity={0.5}
          />
        );
      })}

      {/* sign glyphs */}
      {SIGNS.map((sign, idx) => {
        const mid = idx * 30 + 15;
        const pos = polar(mid, (R_SIGN_INNER + R_OUTER) / 2, ascSignIndex);
        const colorVar = ELEMENT_VAR[SIGN_ELEMENT[sign]];
        return (
          <text
            key={sign}
            x={pos.x}
            y={pos.y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={16}
            fill={`hsl(var(${colorVar}))`}
            style={{ fontWeight: 600 }}
          >
            {SIGN_GLYPH[sign]}
          </text>
        );
      })}

      {/* house ring */}
      <circle cx={CX} cy={CY} r={R_SIGN_INNER} fill="none" stroke={ringStroke} strokeOpacity={0.6} />
      <circle cx={CX} cy={CY} r={R_HOUSE_RING} fill="hsl(var(--background))" stroke={ringStroke} strokeOpacity={0.5} />

      {/* house cusps + numbers */}
      {chart.houses?.cusps.map((cusp, i) => {
        const aIn = polar(cusp, R_INNER, ascSignIndex);
        const aOut = polar(cusp, R_SIGN_INNER, ascSignIndex);
        const isAngle = i === 0 || i === 3 || i === 6 || i === 9; // ASC IC DSC MC
        return (
          <line
            key={`cusp-${i}`}
            x1={aIn.x}
            y1={aIn.y}
            x2={aOut.x}
            y2={aOut.y}
            stroke={isAngle ? "hsl(var(--primary))" : "hsl(var(--border))"}
            strokeOpacity={isAngle ? 0.85 : 0.45}
            strokeWidth={isAngle ? 1.5 : 0.6}
          />
        );
      })}
      {chart.houses?.cusps.map((cusp, i) => {
        const mid = cusp + 15;
        const pos = polar(mid, (R_INNER + R_HOUSE_RING) / 2, ascSignIndex);
        return (
          <text
            key={`hnum-${i}`}
            x={pos.x}
            y={pos.y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={10}
            fill="hsl(var(--muted-foreground))"
          >
            {i + 1}
          </text>
        );
      })}

      {/* aspect lines */}
      {showAspects && chart.aspects
        .filter(a => ["conjunction","opposition","trine","square","sextile"].includes(a.aspect.name))
        .map((a, i) => {
          const lonA = planetScreenLon.get(a.a);
          const lonB = planetScreenLon.get(a.b);
          if (lonA == null || lonB == null) return null;
          const pa = polar(lonA, R_INNER, ascSignIndex);
          const pb = polar(lonB, R_INNER, ascSignIndex);
          const colorVar = ASPECT_COLOR_VAR[a.aspect.name] ?? "--aspect-neutral";
          const w = a.aspect.name === "conjunction" ? 0.5 : 0.8;
          return (
            <line
              key={`asp-${i}`}
              x1={pa.x}
              y1={pa.y}
              x2={pb.x}
              y2={pb.y}
              stroke={`hsl(var(${colorVar}))`}
              strokeOpacity={0.55}
              strokeWidth={w}
            />
          );
        })}

      {/* planets */}
      {positions.map(({ p, lon }) => {
        const pos = polar(lon, R_PLANET, ascSignIndex);
        const isHover = hover === p.body;
        return (
          <g
            key={p.body}
            onClick={() => onSelectPlanet?.(p)}
            onMouseEnter={() => setHover(p.body as string)}
            onMouseLeave={() => setHover(null)}
            className="cursor-pointer"
          >
            <circle
              cx={pos.x}
              cy={pos.y}
              r={isHover ? 13 : 11}
              fill="hsl(var(--background))"
              stroke={`hsl(var(${ELEMENT_VAR[SIGN_ELEMENT[p.sign]]}))`}
              strokeWidth={isHover ? 1.5 : 1}
            />
            <text
              x={pos.x}
              y={pos.y + 0.5}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={13}
              fill="hsl(var(--foreground))"
            >
              {p.glyph}
            </text>
            {p.retrograde && (
              <text
                x={pos.x + 9}
                y={pos.y - 8}
                textAnchor="middle"
                fontSize={7}
                fill="hsl(var(--destructive))"
                style={{ fontWeight: 700 }}
              >
                ℞
              </text>
            )}
          </g>
        );
      })}

      {/* axis labels */}
      {chart.houses && (
        <>
          <text {...polar(chart.houses.ascendant, R_OUTER + 2, ascSignIndex)} textAnchor="end" fontSize={9} fill="hsl(var(--primary))" style={{ fontWeight: 700 }}>ASC</text>
          <text {...polar(chart.houses.ascendant + 180, R_OUTER + 2, ascSignIndex)} textAnchor="start" fontSize={9} fill="hsl(var(--muted-foreground))">DSC</text>
          <text {...polar(chart.houses.midheaven, R_OUTER + 2, ascSignIndex)} textAnchor="middle" fontSize={9} fill="hsl(var(--primary))" style={{ fontWeight: 700 }}>MC</text>
          <text {...polar(chart.houses.midheaven + 180, R_OUTER + 2, ascSignIndex)} textAnchor="middle" fontSize={9} fill="hsl(var(--muted-foreground))">IC</text>
        </>
      )}
    </svg>
  );
}