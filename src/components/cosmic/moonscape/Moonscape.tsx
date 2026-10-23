import { useEffect, useState } from "react";
import { format, isSameDay } from "date-fns";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MoonArc, MoonDisc, PhaseArt, PHASE_LINE, useMonthDays, type Day } from "@/components/cosmic/MoonArc";
import { SIGN_GLYPH } from "@/lib/cosmic/glyphs";
import { MOON_INFO } from "@/lib/moon";
import { phaseSignAdvice } from "@/lib/cosmic/moon-energy";
import { RHYTHM_LABEL, type RhythmPhase } from "@/lib/planner/rhythm-phase";
import { cn } from "@/lib/utils";

const g = (s: string) => `${SIGN_GLYPH[s as keyof typeof SIGN_GLYPH] ?? ""}\uFE0E`;
const tok = (p: RhythmPhase, deep = false, a = 1) => `hsl(var(--rhythm-${p}${deep ? "-deep" : ""}) / ${a})`;

export type MoonscapeLayout = "arc" | "tide" | "wheel" | "journey";
export const MOONSCAPE_LAYOUTS: { id: MoonscapeLayout; label: string; blurb: string }[] = [
  { id: "arc", label: "Moon Arc", blurb: "Curved arc with phase cards" },
  { id: "tide", label: "Lunar Tide", blurb: "A wave of moons rising to full" },
  { id: "wheel", label: "Moon Wheel", blurb: "Dial that opens each phase journey" },
  { id: "journey", label: "Phase Journey", blurb: "Phase cards with their days" },
];
const KEY = "careflow.moonscape.layout";
const EVT = "careflow-moonscape-layout";
const read = (): MoonscapeLayout => { try { const v = localStorage.getItem(KEY); return MOONSCAPE_LAYOUTS.some(l => l.id === v) ? (v as MoonscapeLayout) : "arc"; } catch { return "arc"; } };

export function useMoonscapeLayout() {
  const [layout, setL] = useState<MoonscapeLayout>(read);
  useEffect(() => {
    const on = () => setL(read());
    window.addEventListener("storage", on); window.addEventListener(EVT, on);
    return () => { window.removeEventListener("storage", on); window.removeEventListener(EVT, on); };
  }, []);
  const set = (v: MoonscapeLayout) => { try { localStorage.setItem(KEY, v); } catch { /* ignore */ } setL(v); window.dispatchEvent(new Event(EVT)); };
  return [layout, set] as const;
}

export function MoonscapeLayoutPicker({ className }: { className?: string }) {
  const [layout, set] = useMoonscapeLayout();
  return (
    <div className={cn("grid gap-2 sm:grid-cols-2", className)} role="radiogroup" aria-label="Default moonscape layout">
      {MOONSCAPE_LAYOUTS.map(l => (
        <button key={l.id} role="radio" aria-checked={layout === l.id} onClick={() => set(l.id)}
          className={cn("min-h-11 rounded-lg border px-3 py-2 text-left text-sm", layout === l.id ? "border-primary bg-primary/10" : "hover:bg-muted")}>
          <span className="font-semibold">{l.label}</span><span className="block text-xs text-muted-foreground">{l.blurb}</span>
        </button>
      ))}
    </div>
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

export function runsOf(days: Day[]) {
  return days.reduce<Day[][]>((runs, d) => { const last = runs[runs.length - 1]; if (last && last[0].rhythm === d.rhythm) last.push(d); else runs.push([d]); return runs; }, []);
}

function RunCard({ ds, open, selected }: { ds: Day[]; open: (d: Date) => void; selected?: Date }) {
  const p = ds[0].rhythm;
  return (
        <div className="rounded-xl p-3" style={{ background: tok(p, false, 0.18) }}>
          <div className="flex items-center gap-3">
            <PhaseArt phase={p} />
            <div className="min-w-0">
              <p className="font-display text-lg" style={{ color: tok(p, true) }}>{RHYTHM_LABEL[p]}</p>
              <p className="text-xs text-muted-foreground">{format(ds[0].date, "MMM d")}–{format(ds[ds.length - 1].date, "d")} · starts in {g(ds[0].sign)} {ds[0].sign}</p>
              <p className="text-xs italic">{PHASE_LINE[p]}</p>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {ds.map((d, i) => <button key={i} onClick={() => open(d.date)} className={cn("flex h-11 w-9 flex-col items-center justify-center rounded-md hover:bg-background/60", selected && isSameDay(d.date, selected) && "bg-background ring-2 ring-primary")} aria-label={format(d.date, "MMM d")}>
              <MoonDisc illum={d.illum} waxing={d.waxing} rhythm={p} size={16} /><span className="text-[9px]">{format(d.date, "d")}</span></button>)}
          </div>
        </div>
  );
}

function Wheel({ days, open }: { days: Day[]; open: (d: Date) => void }) {
  const [sel, setSel] = useState<Day | null>(null);
  const S = 300, c = S / 2;
  const at = (i: number, r: number) => { const t = (i / days.length) * 2 * Math.PI - Math.PI / 2; return [c + Math.cos(t) * r, c + Math.sin(t) * r]; };
  const today = days.find(d => isSameDay(d.date, new Date())) ?? days[0];
  const show = sel ?? today;
  const run = sel ? runsOf(days).find(r => r.includes(sel)) : undefined;
  return (
    <div className="space-y-3">
      <div className="mx-auto w-full max-w-[300px]">
        <svg viewBox={`0 0 ${S} ${S}`} className="w-full">
          <circle cx={c} cy={c} r={145} fill="hsl(var(--muted) / 0.4)" />
          {days.map((d, i) => { const [x, y] = at(i, 128); const [sx, sy] = at(i, 98); const on = sel === d; return (
            <g key={i} onClick={() => setSel(on ? null : d)} className="cursor-pointer" role="button" aria-label={format(d.date, "MMM d")}>
              <circle cx={x} cy={y} r={on ? 15 : 12} fill={tok(d.rhythm, false, on ? 0.55 : 0.2)} stroke={on ? "hsl(var(--primary))" : "none"} />
              <foreignObject x={x - 8} y={y - 8} width={16} height={16} style={{ pointerEvents: "none" }}><MoonDisc illum={d.illum} waxing={d.waxing} rhythm={d.rhythm} size={16} /></foreignObject>
              <text x={sx} y={sy + 4} textAnchor="middle" fontSize={10} fill="hsl(var(--muted-foreground))">{g(d.sign)}</text>
            </g>); })}
          <foreignObject x={c - 60} y={c - 60} width={120} height={120}>
            <div className="flex h-full flex-col items-center justify-center text-center">
              <MoonDisc illum={show.illum} waxing={show.waxing} rhythm={show.rhythm} size={40} />
              <p className="mt-1 text-xs font-semibold">{format(show.date, "MMM d")}</p>
              <p className="text-[10px]" style={{ color: tok(show.rhythm, true) }}>{RHYTHM_LABEL[show.rhythm]} · {g(show.sign)} {show.sign}</p>
            </div>
          </foreignObject>
        </svg>
        {!sel && <p className="text-center text-xs text-muted-foreground">Tap a moon to open its phase journey.</p>}
      </div>
      {sel && run && (
        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
          <RunCard ds={run} open={d => setSel(days.find(x => isSameDay(x.date, d)) ?? sel)} selected={sel.date} />
          <div className="rounded-xl border bg-background p-3">
            <p className="text-sm font-semibold">{format(sel.date, "EEEE, MMM d")} · {MOON_INFO[sel.phase].glyph} {MOON_INFO[sel.phase].label} · {g(sel.sign)} {sel.sign}</p>
            <p className="mt-1 text-sm text-muted-foreground">{phaseSignAdvice(sel.rhythm, sel.sign)}</p>
            <Button size="sm" className="mt-2 h-11" onClick={() => open(sel.date)}>Open day</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Journey({ days, open }: { days: Day[]; open: (d: Date) => void }) {
  return <div className="space-y-3">{runsOf(days).map(ds => <RunCard key={ds[0].date.toISOString()} ds={ds} open={open} />)}</div>;
}

export function Moonscape({ month, selectedDate, onSelectDate, title = true }: { month: Date; selectedDate?: Date; onSelectDate?: (date: Date) => void; title?: boolean }) {
  const [layout] = useMoonscapeLayout();
  const days = useMonthDays(month);
  const open = (d: Date) => onSelectDate?.(d);
  return (
    <div className="relative">
      <div className="mb-1 flex justify-end">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-11 gap-1 text-xs" aria-label="Moonscape layout settings"><Settings2 className="h-4 w-4" /> Layout</Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80">
            <p className="mb-2 text-sm font-semibold">Default layout</p>
            <MoonscapeLayoutPicker className="sm:grid-cols-1" />
          </PopoverContent>
        </Popover>
      </div>
      {layout === "arc" && <MoonArc month={month} selectedDate={selectedDate} onSelectDate={onSelectDate} title={title} />}
      {layout === "tide" && <Tide days={days} open={open} />}
      {layout === "wheel" && <Wheel key={`${month.getFullYear()}-${month.getMonth()}`} days={days} open={open} />}
      {layout === "journey" && <Journey days={days} open={open} />}
    </div>
  );
}
