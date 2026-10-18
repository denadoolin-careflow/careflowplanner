import { forwardRef, useMemo, useState } from "react";
import type { NatalChartV2, NatalPlanet } from "@/lib/cosmic/chart";
import { SIGN_GLYPH, ELEMENT_VAR, SIGN_ELEMENT } from "@/lib/cosmic/glyphs";
import type { Sign } from "@/lib/transits";

const SIGNS: Sign[] = [
  "Aries","Taurus","Gemini","Cancer","Leo","Virgo",
  "Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces",
];

/* Bi-wheel geometry (astrosuite-style) */
const SIZE = 720;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R_OUTER = 352;        // outer rim
const R_SIGN = 334;         // zodiac glyph radius
const R_SIGN_IN = 316;      // inner edge of sign ring / outer edge of transit band
const R_T_GLYPH = 286;      // transit glyphs
const R_T_LABEL = 258;      // transit degree labels
const R_MID = 236;          // natal band outer edge
const R_N_GLYPH = 208;      // natal glyphs
const R_N_LABEL = 178;      // natal degree labels
const R_HOUSE = 158;        // house-number band outer edge
const R_HUB = 132;          // aspect hub

const ASPECTS = [
  { a: 0, orb: 8, kind: "neutral" },
  { a: 60, orb: 5, kind: "flow" },
  { a: 90, orb: 7, kind: "hard" },
  { a: 120, orb: 7, kind: "flow" },
  { a: 180, orb: 8, kind: "hard" },
] as const;

const KIND_VAR: Record<string, string> = {
  hard: "--chart-hard",
  flow: "--chart-flow",
  neutral: "--chart-neutral",
};

export interface TransitPoint { body: string; glyph: string; longitude: number; retrograde?: boolean }

interface Props {
  chart: NatalChartV2;
  onSelectPlanet?: (p: NatalPlanet) => void;
  onSelectSign?: (sign: Sign) => void;
  onSelectHouse?: (house: number) => void;
  showAspects?: boolean;
  transitPlanets?: TransitPoint[];
  highlightHouse?: number;
}

function fmtDeg(lon: number) {
  const inSign = ((lon % 30) + 30) % 30;
  let d = Math.floor(inSign);
  let m = Math.round((inSign - d) * 60);
  if (m === 60) { d += 1; m = 0; }
  return `${d}°${String(m).padStart(2, "0")}′`;
}

function spread<T extends { lon: number }>(items: T[], minSep: number): (T & { shown: number })[] {
  const out = [...items].sort((a, b) => a.lon - b.lon).map(i => ({ ...i, shown: i.lon }));
  for (let pass = 0; pass < 8; pass++) {
    for (let i = 0; i < out.length && out.length > 1; i++) {
      const a = out[i], b = out[(i + 1) % out.length];
      const gap = (b.shown - a.shown + 360) % 360;
      if (gap < minSep) {
        const push = (minSep - gap) / 2;
        a.shown = (a.shown - push + 360) % 360;
        b.shown = (b.shown + push) % 360;
      }
    }
  }
  return out;
}

export const NatalWheel = forwardRef<SVGSVGElement, Props>(function NatalWheel(
  { chart, onSelectPlanet, onSelectSign, onSelectHouse, showAspects = true, transitPlanets, highlightHouse },
  ref,
) {
  const [hover, setHover] = useState<string | null>(null);
  const [hoverHouse, setHoverHouse] = useState<number | null>(null);
  const anchor = chart.houses ? chart.houses.ascendant : Math.floor((chart.planets.find(p => p.body === "Sun")?.longitude ?? 0) / 30) * 30;

  const ang = (lon: number) => ((180 - (((lon - anchor) % 360) + 360) % 360) * Math.PI) / 180;
  const pt = (lon: number, r: number) => { const a = ang(lon); return { x: CX + r * Math.cos(a), y: CY - r * Math.sin(a) }; };
  const rotFor = (lon: number) => {
    // text rotation so labels read along the radius, never upside-down
    let deg = -((ang(lon) * 180) / Math.PI);
    deg = ((deg % 360) + 360) % 360;
    if (deg > 90 && deg < 270) deg -= 180;
    return deg;
  };
  const sector = (start: number, end: number, rIn: number, rOut: number) => {
    const p1 = pt(start, rOut), p2 = pt(end, rOut), p3 = pt(end, rIn), p4 = pt(start, rIn);
    const span = (((end - start) % 360) + 360) % 360;
    const large = span > 180 ? 1 : 0;
    return `M${p1.x},${p1.y} A${rOut},${rOut} 0 ${large} 0 ${p2.x},${p2.y} L${p3.x},${p3.y} A${rIn},${rIn} 0 ${large} 1 ${p4.x},${p4.y} Z`;
  };

  const natal = useMemo(() => spread(chart.planets.map(p => ({ p, lon: p.longitude })), 7), [chart.planets]);
  const transits = useMemo(() => spread((transitPlanets ?? []).map(t => ({ t, lon: t.longitude })), 7), [transitPlanets]);

  const cusps = chart.houses?.cusps ?? Array.from({ length: 12 }, (_, i) => (anchor + i * 30) % 360);
  const line = "hsl(var(--chart-line))";
  const elColor = (s: Sign) => `hsl(var(${ELEMENT_VAR[SIGN_ELEMENT[s]]}))`;

  // aspect lines (natal-natal + transit-natal)
  const aspectLines = useMemo(() => {
    const res: { key: string; a: number; b: number; kind: string; orb: number; transit: boolean }[] = [];
    const test = (l1: number, l2: number) => {
      const sep = Math.abs((((l1 - l2 + 180) % 360) + 360) % 360 - 180);
      for (const asp of ASPECTS) { const o = Math.abs(sep - asp.a); if (o <= asp.orb) return { kind: asp.kind, orb: o, a: asp.a }; }
      return null;
    };
    if (showAspects) {
      const ps = chart.planets;
      for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
        const h = test(ps[i].longitude, ps[j].longitude);
        if (h && h.a !== 0) res.push({ key: `n-${i}-${j}`, a: ps[i].longitude, b: ps[j].longitude, kind: h.kind, orb: h.orb, transit: false });
      }
      (transitPlanets ?? []).forEach((t, i) => ps.forEach((n, j) => {
        const h = test(t.longitude, n.longitude);
        if (h && h.a !== 0 && h.orb <= 3) res.push({ key: `t-${i}-${j}`, a: t.longitude, b: n.longitude, kind: h.kind, orb: h.orb, transit: true });
      }));
    }
    return res;
  }, [chart.planets, transitPlanets, showAspects]);

  const angles = chart.houses ? [
    { label: "As", lon: chart.houses.ascendant },
    { label: "Mc", lon: chart.houses.midheaven },
  ] : [];

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      xmlns="http://www.w3.org/2000/svg"
      className="w-full max-w-[720px] mx-auto touch-manipulation select-none"
      role="img"
      aria-label="Natal chart wheel with transits"
      fontFamily="'Nunito Sans', system-ui, sans-serif"
    >
      {/* rings */}
      <circle cx={CX} cy={CY} r={R_OUTER} fill="hsl(var(--chart-surface))" stroke={line} strokeWidth={1} />
      <circle cx={CX} cy={CY} r={R_SIGN_IN} fill="none" stroke={line} strokeWidth={0.8} />
      <circle cx={CX} cy={CY} r={R_MID} fill="none" stroke={line} strokeWidth={0.8} />
      <circle cx={CX} cy={CY} r={R_HOUSE} fill="none" stroke={line} strokeWidth={0.8} />
      <circle cx={CX} cy={CY} r={R_HUB} fill="hsl(var(--chart-surface))" stroke={line} strokeWidth={0.8} />

      {/* highlighted house (e.g. time-lord house) */}
      {highlightHouse && (
        <path d={sector(cusps[highlightHouse - 1], cusps[highlightHouse % 12], R_HOUSE, R_SIGN_IN)} fill="hsl(var(--chart-highlight) / 0.35)" />
      )}

      {/* zodiac signs */}
      {SIGNS.map((s, i) => {
        const p = pt(i * 30 + 15, R_SIGN);
        const b = pt(i * 30, R_OUTER), b2 = pt(i * 30, R_SIGN_IN);
        return (
          <g key={s} onClick={() => onSelectSign?.(s)} className={onSelectSign ? "cursor-pointer" : undefined}>
            <line x1={b.x} y1={b.y} x2={b2.x} y2={b2.y} stroke={line} strokeOpacity={0.5} strokeWidth={0.6} />
            <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central" fontSize={20} fill={elColor(s)}>{SIGN_GLYPH[s]}</text>
          </g>
        );
      })}

      {/* house cusps + numbers */}
      {cusps.map((c, i) => {
        const next = cusps[(i + 1) % 12];
        const mid = c + ((((next - c) % 360) + 360) % 360) / 2;
        const a = pt(c, R_HUB), b = pt(c, R_SIGN_IN);
        const n = pt(mid, (R_HOUSE + R_HUB) / 2);
        const isHover = hoverHouse === i + 1;
        return (
          <g key={`h-${i}`}>
            <path
              d={sector(c, next, R_HUB, R_HOUSE)}
              fill={isHover ? "hsl(var(--chart-highlight) / 0.5)" : "transparent"}
              onClick={() => onSelectHouse?.(i + 1)}
              onMouseEnter={() => setHoverHouse(i + 1)}
              onMouseLeave={() => setHoverHouse(null)}
              className={onSelectHouse ? "cursor-pointer" : undefined}
            />
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={line} strokeWidth={i % 3 === 0 ? 1.1 : 0.7} />
            <text x={n.x} y={n.y} textAnchor="middle" dominantBaseline="central" fontSize={13} fill="hsl(var(--muted-foreground))" pointerEvents="none">{i + 1}</text>
          </g>
        );
      })}

      {/* aspect lines */}
      {aspectLines.map(l => {
        const p1 = pt(l.a, R_HUB), p2 = pt(l.b, R_HUB);
        const w = l.orb < 1 ? 2.6 : l.orb < 2.5 ? 1.4 : 0.8;
        return (
          <line key={l.key} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
            stroke={`hsl(var(${KIND_VAR[l.kind]}))`} strokeOpacity={l.orb < 1 ? 0.9 : 0.6} strokeWidth={w}
            strokeDasharray={l.transit && l.kind === "flow" ? "3 3" : undefined} />
        );
      })}

      {/* natal ticks on hub */}
      {chart.planets.map(p => {
        const a = pt(p.longitude, R_HUB), b = pt(p.longitude, R_HUB + 7);
        return <line key={`tick-${p.body}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="hsl(var(--foreground))" strokeWidth={1.4} />;
      })}

      {/* natal planets */}
      {natal.map(({ p, lon, shown }) => {
        const g = pt(shown, R_N_GLYPH), lb = pt(shown, R_N_LABEL);
        const t1 = pt(lon, R_MID), t2 = pt(lon, R_MID - 8), lead = pt(shown, R_MID - 14);
        const color = elColor(p.sign);
        const isHover = hover === p.body;
        return (
          <g key={p.body} onClick={() => onSelectPlanet?.(p)} onMouseEnter={() => setHover(p.body as string)} onMouseLeave={() => setHover(null)} className="cursor-pointer">
            <line x1={t1.x} y1={t1.y} x2={t2.x} y2={t2.y} stroke="hsl(var(--foreground))" strokeWidth={1.4} />
            <line x1={t2.x} y1={t2.y} x2={lead.x} y2={lead.y} stroke={color} strokeDasharray="2 2" strokeWidth={0.8} />
            <text x={g.x} y={g.y} textAnchor="middle" dominantBaseline="central" fontSize={isHover ? 26 : 23} fill={color}>{p.glyph}</text>
            <text x={lb.x} y={lb.y} textAnchor="middle" dominantBaseline="central" fontSize={11}
              fill={p.retrograde ? "hsl(var(--chart-hard))" : "hsl(var(--foreground) / 0.75)"}
              transform={`rotate(${rotFor(shown)} ${lb.x} ${lb.y})`}>{fmtDeg(p.longitude)}</text>
          </g>
        );
      })}

      {/* transit planets */}
      {transits.map(({ t, lon, shown }) => {
        const g = pt(shown, R_T_GLYPH), lb = pt(shown, R_T_LABEL);
        const t1 = pt(lon, R_SIGN_IN), t2 = pt(lon, R_SIGN_IN - 8), lead = pt(shown, R_SIGN_IN - 14);
        const sign = SIGNS[Math.floor(((t.longitude % 360) + 360) % 360 / 30)];
        const color = elColor(sign);
        return (
          <g key={`tr-${t.body}`}>
            <title>{`Transiting ${t.body} ${fmtDeg(t.longitude)} ${sign}${t.retrograde ? " (retrograde)" : ""}`}</title>
            <line x1={t1.x} y1={t1.y} x2={t2.x} y2={t2.y} stroke="hsl(var(--foreground))" strokeWidth={1.2} />
            <line x1={t2.x} y1={t2.y} x2={lead.x} y2={lead.y} stroke={color} strokeDasharray="2 2" strokeWidth={0.8} />
            <text x={g.x} y={g.y} textAnchor="middle" dominantBaseline="central" fontSize={21} fill={color}>{t.glyph}</text>
            <text x={lb.x} y={lb.y} textAnchor="middle" dominantBaseline="central" fontSize={10.5}
              fill={t.retrograde ? "hsl(var(--chart-hard))" : "hsl(var(--foreground) / 0.7)"}
              transform={`rotate(${rotFor(shown)} ${lb.x} ${lb.y})`}>{fmtDeg(t.longitude)}</text>
          </g>
        );
      })}

      {/* angles */}
      {angles.map(a => {
        const g = pt(a.lon, R_N_GLYPH - 2), lb = pt(a.lon + 5, R_N_LABEL + 4);
        const t1 = pt(a.lon, R_HUB), t2 = pt(a.lon, R_MID);
        return (
          <g key={a.label}>
            <line x1={t1.x} y1={t1.y} x2={t2.x} y2={t2.y} stroke="hsl(var(--foreground))" strokeWidth={1.6} />
            <text x={g.x} y={g.y} textAnchor="middle" dominantBaseline="central" fontSize={22} fontWeight={700} fill="hsl(var(--foreground))" fontFamily="'DM Serif Display', serif">{a.label}</text>
            <text x={lb.x} y={lb.y} textAnchor="middle" dominantBaseline="central" fontSize={10.5} fill="hsl(var(--foreground) / 0.75)" transform={`rotate(${rotFor(a.lon + 5)} ${lb.x} ${lb.y})`}>{fmtDeg(a.lon)}</text>
          </g>
        );
      })}
    </svg>
  );
});
