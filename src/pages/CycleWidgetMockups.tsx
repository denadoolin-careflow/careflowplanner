import { useMemo } from "react";
import { Link } from "react-router-dom";
import { MoonPhase } from "astronomy-engine";
import { useCycle } from "@/lib/cycle-store";
import { getPhaseInfo, PHASE_META, type CyclePhase } from "@/lib/cycle";
import { lunarRhythmAt, LUNAR_RHYTHM } from "@/lib/cosmic/lunar-rhythm";
import { PhaseIcon } from "@/lib/phase-icons";
import type { RhythmPhase } from "@/lib/planner/rhythm-phase";
import { cn } from "@/lib/utils";

const ORDER: RhythmPhase[] = ["plan", "grow", "care", "letgo"];
const CYCLE_ORDER: CyclePhase[] = ["menstrual", "follicular", "ovulatory", "luteal"];
/** Inner season pairs with the matching Moon quarter (menstrual ↔ new moon). */
const CYCLE_TO_RHYTHM: Record<CyclePhase, RhythmPhase> = { menstrual: "plan", follicular: "grow", ovulatory: "care", luteal: "letgo" };
const tone = (p: RhythmPhase, k: "light" | "tint" | "deep" = "light") =>
  `hsl(var(--rhythm-${p}${k === "light" ? "" : `-${k}`}))`;

function useBoth() {
  const { periods, settings } = useCycle();
  return useMemo(() => {
    const now = new Date();
    const angle = MoonPhase(now);
    const moon = lunarRhythmAt(now);
    const info = getPhaseInfo(now, periods, settings);
    return {
      moon, moonFrac: angle / 360, moonDay: Math.round((angle / 360) * 29.5) + 1,
      cycle: info?.phase ?? null, cycleFrac: info ? (info.cycleDay - 1) / info.cycleLength : null,
      cycleDay: info?.cycleDay ?? null, cycleLength: info?.cycleLength ?? settings.avgCycleLength,
    };
  }, [periods, settings]);
}

function Ring({ r, frac, active, label }: { r: number; frac: number | null; active: RhythmPhase | null; label: string }) {
  const c = 2 * Math.PI * r;
  return (
    <g aria-label={label}>
      {ORDER.map((p, i) => (
        <circle key={p} r={r} cx={0} cy={0} fill="none" stroke={tone(p)} strokeWidth={active === p ? 14 : 9}
          strokeOpacity={active === p ? 1 : 0.45}
          strokeDasharray={`${c / 4 - 3} ${c}`} strokeDashoffset={-(c / 4) * i} transform="rotate(-90)" />
      ))}
      {frac != null && (
        <circle r={7} cx={r * Math.sin(frac * 2 * Math.PI)} cy={-r * Math.cos(frac * 2 * Math.PI)}
          fill="hsl(var(--card))" stroke="hsl(var(--foreground))" strokeWidth={2} />
      )}
    </g>
  );
}

function TwinRings() {
  const d = useBoth();
  const cyc = d.cycle ? CYCLE_TO_RHYTHM[d.cycle] : null;
  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center">
      <svg viewBox="-80 -80 160 160" className="h-48 w-48 shrink-0" role="img" aria-label="Moon and cycle rings">
        <Ring r={66} frac={d.moonFrac} active={d.moon} label="Moon cycle" />
        <Ring r={46} frac={d.cycleFrac} active={cyc} label="Menstrual cycle" />
        <text textAnchor="middle" y={-2} className="fill-foreground font-display" fontSize={14}>{LUNAR_RHYTHM[d.moon].glyph}</text>
        <text textAnchor="middle" y={14} className="fill-muted-foreground" fontSize={8}>{d.cycleDay ? `Day ${d.cycleDay}` : "Log cycle"}</text>
      </svg>
      <ul className="w-full space-y-2 text-sm">
        <li className="rounded-xl p-2" style={{ background: tone(d.moon, "tint") }}>
          <span className="font-semibold" style={{ color: tone(d.moon, "deep") }}>Outer · Moon: {LUNAR_RHYTHM[d.moon].label}</span>
          <span className="block text-xs text-foreground/80">{LUNAR_RHYTHM[d.moon].invitation}</span>
        </li>
        <li className="rounded-xl p-2" style={{ background: cyc ? tone(cyc, "tint") : undefined }}>
          <span className="font-semibold" style={{ color: cyc ? tone(cyc, "deep") : undefined }}>
            Inner · Cycle: {d.cycle ? PHASE_META[d.cycle].label : "Not logged yet"}
          </span>
          <span className="block text-xs text-foreground/80">{d.cycle ? PHASE_META[d.cycle].invitation : "Log a period start to see your inner ring."}</span>
        </li>
      </ul>
    </div>
  );
}

function Ribbon({ title, frac, labels, sub }: { title: string; frac: number | null; labels: string[]; sub: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between text-xs"><span className="font-semibold text-foreground">{title}</span><span className="text-muted-foreground">{sub}</span></div>
      <div className="relative grid h-9 grid-cols-4 overflow-hidden rounded-full">
        {ORDER.map((p, i) => (
          <div key={p} className="flex items-center justify-center gap-1 text-[11px] font-medium" style={{ background: tone(p, "tint"), color: tone(p, "deep") }}>
            <PhaseIcon phase={p} size="sm" /><span className="hidden sm:inline">{labels[i]}</span>
          </div>
        ))}
        {frac != null && <div aria-hidden className="absolute inset-y-0 w-1 rounded-full bg-foreground" style={{ left: `calc(${frac * 100}% - 2px)` }} />}
      </div>
    </div>
  );
}

function ParallelRibbons() {
  const d = useBoth();
  return (
    <div className="space-y-3">
      <Ribbon title="Moon" frac={d.moonFrac} labels={ORDER.map(p => LUNAR_RHYTHM[p].label)} sub={`Lunar day ${d.moonDay} of 29.5`} />
      <Ribbon title="Cycle" frac={d.cycleFrac} labels={CYCLE_ORDER.map(c => PHASE_META[c].label)}
        sub={d.cycleDay ? `Day ${d.cycleDay} of ${d.cycleLength}` : "Not logged yet"} />
      <p className="text-xs text-muted-foreground">The marker shows where you are today on each rhythm.</p>
    </div>
  );
}

function PhaseCards() {
  const d = useBoth();
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {ORDER.map((p, i) => {
        const cp = CYCLE_ORDER[i];
        const moonNow = d.moon === p, cycNow = d.cycle === cp;
        return (
          <div key={p} className={cn("rounded-2xl border-2 p-3", moonNow || cycNow ? "" : "border-transparent")}
            style={{ background: tone(p, "tint"), borderColor: moonNow || cycNow ? tone(p, "deep") : undefined }}>
            <div className="flex items-center gap-2"><PhaseIcon phase={p} size="sm" /><span className="font-display text-base" style={{ color: tone(p, "deep") }}>{LUNAR_RHYTHM[p].label}</span></div>
            <p className="mt-1 text-xs text-foreground/80">{LUNAR_RHYTHM[p].glyph} {LUNAR_RHYTHM[p].moon}</p>
            <p className="text-xs text-foreground/80">{PHASE_META[cp].glyph} {PHASE_META[cp].label}</p>
            <div className="mt-2 flex flex-wrap gap-1 text-[10px] font-semibold">
              {moonNow && <span className="rounded-full bg-card px-2 py-0.5 text-foreground">Moon now</span>}
              {cycNow && <span className="rounded-full bg-card px-2 py-0.5 text-foreground">You now</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const MOCKS = [
  { id: "A", name: "Twin Rings", note: "Moon on the outside, your cycle inside — one glance, both rhythms.", C: TwinRings },
  { id: "B", name: "Parallel Ribbons", note: "Two simple bars with a 'you are here' marker. Slimmest option.", C: ParallelRibbons },
  { id: "C", name: "Phase Cards", note: "Four Plan · Grow · Care · Let go cards; badges show where the Moon and you are.", C: PhaseCards },
];

export default function CycleWidgetMockups() {
  return (
    <div className="mx-auto max-w-3xl space-y-5 px-3 pb-16 pt-4">
      <header>
        <h1 className="font-display text-2xl text-foreground">Cycle & Moon widget ideas</h1>
        <p className="text-sm text-muted-foreground">Three previews using your real Moon and cycle data. Pick one and I'll add it to your day page. <Link to="/planner" className="text-primary underline">Back to Planner</Link></p>
      </header>
      {MOCKS.map(({ id, name, note, C }) => (
        <section key={id} aria-labelledby={`mock-${id}`} className="space-y-3 rounded-3xl border border-border/60 bg-card p-4 shadow-sm">
          <div>
            <h2 id={`mock-${id}`} className="font-display text-lg text-foreground">{id} · {name}</h2>
            <p className="text-xs text-muted-foreground">{note}</p>
          </div>
          <C />
        </section>
      ))}
    </div>
  );
}
