import { SIGN_GLYPH } from "@/lib/cosmic/glyphs";
import { signTintVar, type ChartColorMode } from "@/lib/cosmic/chart-colors";
import { BODY_GLYPHS } from "@/lib/cosmic/astro/bodies";
import type { Sign } from "@/lib/transits";

interface WheelHouse { house: number; sign: Sign; ruler: string; transits: string[]; profected: boolean }

export function HousesWheel({ houses, selected, onSelect, colorMode }: {
  houses: WheelHouse[]; selected: number; onSelect: (house: number) => void; colorMode: ChartColorMode;
}) {
  const point = (angle: number, radius: number) => {
    const radians = angle * Math.PI / 180;
    return [200 + Math.cos(radians) * radius, 200 - Math.sin(radians) * radius];
  };
  const current = houses.find(h => h.house === selected);
  return (
    <svg viewBox="0 0 400 400" className="mx-auto aspect-square w-full max-w-[460px] select-none" aria-label="Twelve life area houses">
      {houses.map(h => {
        const start = 180 + (h.house - 1) * 30;
        const end = start + 30;
        const a = point(start, 194), b = point(end, 194), c = point(end, 92), d = point(start, 92);
        const label = point(start + 15, 158), sign = point(start + 15, 126), transit = point(start + 15, 178);
        const color = `hsl(var(${signTintVar(h.sign, colorMode, h.house)}))`;
        return <g key={h.house} role="button" tabIndex={0} aria-label={`House ${h.house}, ${h.sign}, ruled by ${h.ruler}`} aria-pressed={selected === h.house}
          onClick={() => onSelect(h.house)} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(h.house); } }} className="cursor-pointer outline-none group">
          <path d={`M${a} A194,194 0 0 0 ${b} L${c} A92,92 0 0 1 ${d} Z`} fill={color} fillOpacity={selected === h.house ? 0.4 : 0.17}
            stroke={selected === h.house || h.profected ? "hsl(var(--primary))" : "hsl(var(--chart-line))"} strokeWidth={selected === h.house ? 3 : 1} className="group-focus-visible:stroke-primary group-focus-visible:stroke-[3]" />
          <text x={label[0]} y={label[1]} textAnchor="middle" dominantBaseline="central" fontSize="18" fill="hsl(var(--foreground))" pointerEvents="none">{h.house}</text>
          <text x={sign[0]} y={sign[1]} textAnchor="middle" dominantBaseline="central" fontSize="21" fill="hsl(var(--foreground))" pointerEvents="none">{SIGN_GLYPH[h.sign]}︎</text>
          <text x={transit[0]} y={transit[1]} textAnchor="middle" dominantBaseline="central" fontSize="12" fill="hsl(var(--foreground))" pointerEvents="none">{h.transits.slice(0, 3).map(b => BODY_GLYPHS[b as keyof typeof BODY_GLYPHS]).join(" ")}</text>
          <title>{h.sign} · {h.ruler}{h.transits.length ? ` · Passing through: ${h.transits.join(", ")}` : ""}</title>
        </g>;
      })}
      <text x="200" y="180" textAnchor="middle" fontSize="14" fill="hsl(var(--muted-foreground))">HOUSE {selected}</text>
      <text x="200" y="208" textAnchor="middle" fontSize="22" fill="hsl(var(--foreground))" fontFamily="'DM Serif Display', serif">{current?.sign}</text>
      <text x="200" y="234" textAnchor="middle" fontSize="13" fill="hsl(var(--muted-foreground))">{current?.ruler}</text>
    </svg>
  );
}