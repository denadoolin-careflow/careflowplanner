import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { addMonths, format, isSameDay } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MoonDisc, PhaseArt, PHASE_LINE, useMonthDays, type Day } from "@/components/cosmic/MoonArc";
import { SIGN_GLYPH } from "@/lib/cosmic/glyphs";
import { MOON_INFO } from "@/lib/moon";
import { seasonsInMonth } from "@/lib/seasons/zodiac-seasons";
import { RHYTHM_LABEL, type RhythmPhase } from "@/lib/planner/rhythm-phase";
import { cn } from "@/lib/utils";

const g = (s: string) => `${SIGN_GLYPH[s as keyof typeof SIGN_GLYPH] ?? ""}\uFE0E`;
const tok = (p: RhythmPhase, deep = false, a = 1) => `hsl(var(--rhythm-${p}${deep ? "-deep" : ""}) / ${a})`;

function SeasonLine({ month }: { month: Date }) {
  const s = seasonsInMonth(month);
  return <p className="text-xs text-muted-foreground">{s.map(x => `${x.season.glyph}\uFE0E ${x.season.sign}`).join(" → ")} season · {s[0]?.season.theme}</p>;
}

function Card({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <section className="min-w-0 rounded-2xl border bg-card p-4 shadow-sm">
      <h2 className="font-display text-xl text-primary">{title}</h2>
      <p className="mb-3 text-xs text-muted-foreground">{sub}</p>
      {children}
    </section>
  );
}

function Tide({ days, open }: { days: Day[]; open: (d: Date) => void }) {
  const W = 34, H = 150, w = days.length * W + 20;
  const y = (d: Day) => 110 - d.illum * 70;
  const path = days.map((d, i) => `${i ? "L" : "M"}${20 + i * W} ${y(d)}`).join(" ");
  return (
    <div className="overflow-x-auto">
      <svg width={w} height={H} className="block">
        {days.map((d, i) => <rect key={i} x={3 + i * W} y={0} width={W} height={H} fill={tok(d.rhythm, false, 0.14)} />)}
        <path d={path} fill="none" stroke="hsl(var(--primary) / 0.5)" strokeWidth={2} />
        {days.map((d, i) => (
          <g key={i} transform={`translate(${20 + i * W - (d.major ? 13 : 9)} ${y(d) - (d.major ? 13 : 9)})`} onClick={() => open(d.date)} className="cursor-pointer">
            <rect width={d.major ? 26 : 18} height={d.major ? 26 : 18} fill="transparent" />
            <foreignObject width={d.major ? 26 : 18} height={d.major ? 26 : 18}><MoonDisc illum={d.illum} waxing={d.waxing} rhythm={d.rhythm} size={d.major ? 26 : 18} /></foreignObject>
          </g>
        ))}
        {days.map((d, i) => (
          <g key={`t${i}`}>
            <text x={20 + i * W} y={132} textAnchor="middle" fontSize={11} fill="hsl(var(--foreground))">{g(d.sign)}</text>
            <text x={20 + i * W} y={146} textAnchor="middle" fontSize={9} fill="hsl(var(--muted-foreground))">{format(d.date, "d")}</text>
            {d.major && <text x={20 + i * W} y={14} textAnchor="middle" fontSize={9} fontWeight={700} fill={tok(d.rhythm, true)}>{MOON_INFO[d.phase].label.replace(" Moon", "").replace("Quarter", "Q")}</text>}
          </g>
        ))}
      </svg>
    </div>
  );
}

function Wheel({ days, open }: { days: Day[]; open: (d: Date) => void }) {
  const today = new Date();
  const [sel, setSel] = useState<Day>(days.find(d => isSameDay(d.date, today)) ?? days[0]);
  const S = 300, c = S / 2;
  const at = (i: number, r: number) => { const t = (i / days.length) * 2 * Math.PI - Math.PI / 2; return [c + Math.cos(t) * r, c + Math.sin(t) * r]; };
  return (
    <div className="mx-auto w-full max-w-[300px]">
      <svg viewBox={`0 0 ${S} ${S}`} className="w-full">
        <circle cx={c} cy={c} r={145} fill="hsl(var(--muted) / 0.4)" />
        {days.map((d, i) => { const [x, y] = at(i, 128); const [sx, sy] = at(i, 98); const on = sel === d; return (
          <g key={i} onClick={() => setSel(d)} className="cursor-pointer">
            <circle cx={x} cy={y} r={on ? 14 : 11} fill={tok(d.rhythm, false, on ? 0.5 : 0.2)} />
            <foreignObject x={x - 8} y={y - 8} width={16} height={16}><MoonDisc illum={d.illum} waxing={d.waxing} rhythm={d.rhythm} size={16} /></foreignObject>
            <text x={sx} y={sy + 4} textAnchor="middle" fontSize={10} fill="hsl(var(--muted-foreground))">{g(d.sign)}</text>
          </g>); })}
        <foreignObject x={c - 60} y={c - 60} width={120} height={120}>
          <div className="flex h-full flex-col items-center justify-center text-center">
            <MoonDisc illum={sel.illum} waxing={sel.waxing} rhythm={sel.rhythm} size={40} />
            <p className="mt-1 text-xs font-semibold">{format(sel.date, "MMM d")}</p>
            <p className="text-[10px]" style={{ color: tok(sel.rhythm, true) }}>{RHYTHM_LABEL[sel.rhythm]} · {g(sel.sign)} {sel.sign}</p>
          </div>
        </foreignObject>
      </svg>
      <Button variant="outline" size="sm" className="mt-2 h-11 w-full" onClick={() => open(sel.date)}>Open {format(sel.date, "MMM d")}</Button>
    </div>
  );
}

function Journey({ days, open }: { days: Day[]; open: (d: Date) => void }) {
  return (
    <div className="space-y-3">
      {days.reduce<Day[][]>((runs, d) => { const last = runs[runs.length - 1]; if (last && last[0].rhythm === d.rhythm) last.push(d); else runs.push([d]); return runs; }, []).map(ds => { const p = ds[0].rhythm; return (
        <div key={ds[0].date.toISOString()} className="rounded-xl p-3" style={{ background: tok(p, false, 0.18) }}>
          <div className="flex items-center gap-3">
            <PhaseArt phase={p} />
            <div className="min-w-0">
              <p className="font-display text-lg" style={{ color: tok(p, true) }}>{RHYTHM_LABEL[p]}</p>
              <p className="text-xs text-muted-foreground">{format(ds[0].date, "MMM d")}–{format(ds[ds.length - 1].date, "d")} · starts in {g(ds[0].sign)} {ds[0].sign}</p>
              <p className="text-xs italic">{PHASE_LINE[p]}</p>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {ds.map((d, i) => <button key={i} onClick={() => open(d.date)} className="flex h-11 w-9 flex-col items-center justify-center rounded-md hover:bg-background/60" aria-label={format(d.date, "MMM d")}>
              <MoonDisc illum={d.illum} waxing={d.waxing} rhythm={p} size={16} /><span className="text-[9px]">{format(d.date, "d")}</span></button>)}
          </div>
        </div>); })}
    </div>
  );
}

export default function MoonscapeMockups() {
  const [month, setMonth] = useState(() => new Date());
  const days = useMonthDays(month);
  const nav = useNavigate();
  const open = (d: Date) => nav(`/planner/${format(d, "yyyy-MM-dd")}?range=month`);
  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 pb-28">
      <header className="flex items-center justify-between gap-2">
        <div><h1 className="font-display text-2xl text-primary">Moonscape mockups</h1><SeasonLine month={month} /></div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-11 w-11" aria-label="Previous month" onClick={() => setMonth(m => addMonths(m, -1))}><ChevronLeft /></Button>
          <span className="w-24 text-center text-sm font-semibold">{format(month, "MMM yyyy")}</span>
          <Button variant="ghost" size="icon" className="h-11 w-11" aria-label="Next month" onClick={() => setMonth(m => addMonths(m, 1))}><ChevronRight /></Button>
        </div>
      </header>
      <div className={cn("grid gap-4 lg:grid-cols-3")}>
        <Card title="A · Lunar Tide" sub="A wave of moons rising to full; phase bands behind."><Tide days={days} open={open} /></Card>
        <Card title="B · Moon Wheel" sub="Tap a moon on the dial to see its phase and sign."><Wheel key={month.getMonth()} days={days} open={open} /></Card>
        <Card title="C · Phase Journey" sub="Four phase cards with their days."><Journey days={days} open={open} /></Card>
      </div>
    </div>
  );
}
