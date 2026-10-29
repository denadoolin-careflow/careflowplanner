import { useState } from "react";
import { Bell, Check, ChevronDown, Moon as MoonIcon } from "lucide-react";
import { PhaseIcon } from "@/lib/phase-icons";
import type { RhythmPhase } from "@/lib/planner/rhythm-phase";
import { cn } from "@/lib/utils";

/* Sample content only — the real Today page is untouched. */
const P: { id: RhythmPhase; label: string; caption: string; when: string; cards: { title: string; lines: string[] }[] }[] = [
  { id: "plan", label: "Plan", caption: "Prepare · organize", when: "Morning", cards: [
    { title: "Top 3", lines: ["Call pharmacy about refill", "Draft newsletter", "Pay electric bill"] },
    { title: "Rhythm & Moon aspects", lines: ["Waning Gibbous in Gemini", "5:06 AM Moon ✶ Mars — quick errands"] },
    { title: "Schedule", lines: ["9:00 Doctor visit with Mom", "1:00 Focus block", "6:00 Dinner"] },
  ] },
  { id: "grow", label: "Grow", caption: "Build · progress", when: "Midday", cards: [
    { title: "Focus goal", lines: ["Finish the CareFlow guide"] },
    { title: "Habits & routines", lines: ["Water · 4/8", "Walk 20 min", "Read 10 pages"] },
    { title: "Monthly next step", lines: ["Outline November garden"] },
  ] },
  { id: "care", label: "Care", caption: "Support · nurture", when: "Afternoon", cards: [
    { title: "Dinner tonight", lines: ["Roasted root soup"] },
    { title: "Home", lines: ["Kitchen reset", "Laundry · in the dryer"] },
    { title: "Loved ones & meds", lines: ["Text Gill", "Evening meds 8 PM"] },
    { title: "Mail & documents", lines: ["Insurance letter · review today"] },
  ] },
  { id: "letgo", label: "Let go", caption: "Release · rest", when: "Evening", cards: [
    { title: "Cosmic check-in", lines: ["What can I release with this waning Moon?"] },
    { title: "Journal & evening tarot", lines: ["The Star — gentle hope"] },
    { title: "Day review", lines: ["2 tasks to move to tomorrow"] },
  ] },
];
const NOW: RhythmPhase = "care";
const tint = (p: RhythmPhase) => `hsl(var(--rhythm-${p}-tint))`;
const deep = (p: RhythmPhase) => `hsl(var(--rhythm-${p}-deep))`;

function Header({ compact }: { compact?: boolean }) {
  return (
    <div className="space-y-2 rounded-2xl border bg-card p-3" style={{ background: `linear-gradient(135deg, ${tint(NOW)}, hsl(var(--card)))` }}>
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-background"><MoonIcon className="h-5 w-5" style={{ color: deep(NOW) }} /></span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg leading-tight">Thursday, Oct 29 · 2:47 PM</p>
          <p className="text-xs text-muted-foreground">Waning Gibbous in Gemini · Autumn · Cycle day 24</p>
        </div>
        {!compact && <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: tint(NOW), color: deep(NOW) }}>Now: Care</span>}
      </div>
      <div className="flex flex-wrap gap-1.5 text-[11px]">
        {(["Day: Care", "Week: Grow", "Month: Care", "Season: Grow", "Year: Let go"]).map((t, i) => {
          const ph: RhythmPhase[] = ["care", "grow", "care", "grow", "letgo"];
          return <span key={t} className="rounded-full border bg-background px-2 py-0.5 font-medium" style={{ color: deep(ph[i]) }}>{t}</span>;
        })}
      </div>
      <div className="flex items-center gap-2 rounded-xl bg-background/70 px-2 py-1.5 text-xs"><Bell className="h-3.5 w-3.5" />3 gentle reminders · Mail, Moon, Weekly reset</div>
    </div>
  );
}

function Card({ phase, title, lines, small }: { phase: RhythmPhase; title: string; lines: string[]; small?: boolean }) {
  return (
    <div className="rounded-xl border bg-card p-3" style={{ borderLeft: `3px solid ${deep(phase)}` }}>
      <p className={cn("font-medium", small ? "text-xs" : "text-sm")}>{title}</p>
      <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
        {lines.map(l => <li key={l} className="flex gap-1.5 break-words"><Check className="mt-0.5 h-3 w-3 shrink-0 opacity-50" />{l}</li>)}
      </ul>
    </div>
  );
}

function PhaseHead({ p, extra }: { p: typeof P[number]; extra?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <PhaseIcon phase={p.id} size="sm" />
      <div className="min-w-0 flex-1"><p className="font-display leading-tight">{p.label}</p><p className="text-[11px] text-muted-foreground">{p.caption}</p></div>
      {extra}
    </div>
  );
}

const Phone = ({ children }: { children: React.ReactNode }) => (
  <div className="mx-auto h-[760px] w-[360px] shrink-0 overflow-hidden rounded-[2rem] border-8 border-foreground/80 bg-background">
    <div className="h-full space-y-3 overflow-y-auto p-3">{children}</div>
  </div>
);
const Desktop = ({ children }: { children: React.ReactNode }) => (
  <div className="w-[1100px] shrink-0 overflow-hidden rounded-xl border-4 border-foreground/70 bg-background">
    <div className="flex h-6 items-center gap-1 bg-muted px-2">{[0, 1, 2].map(i => <span key={i} className="h-2 w-2 rounded-full bg-foreground/30" />)}</div>
    <div className="h-[700px] space-y-3 overflow-y-auto p-4">{children}</div>
  </div>
);

/* ---------------- A · Phase Tabs ---------------- */
function APhone() {
  const [t, setT] = useState<RhythmPhase>(NOW);
  const p = P.find(x => x.id === t)!;
  return (
    <Phone>
      <Header compact />
      <div role="tablist" className="sticky top-0 z-10 grid grid-cols-4 gap-1 rounded-2xl border bg-card p-1">
        {P.map(x => (
          <button key={x.id} role="tab" aria-selected={t === x.id} onClick={() => setT(x.id)}
            className="flex min-h-[48px] flex-col items-center justify-center rounded-xl text-[11px] font-medium"
            style={t === x.id ? { background: tint(x.id), color: deep(x.id) } : undefined}>
            <PhaseIcon phase={x.id} size="sm" className="!h-5 !w-5" />{x.label}
          </button>
        ))}
      </div>
      <PhaseHead p={p} />
      {p.cards.map(c => <Card key={c.title} phase={p.id} {...c} />)}
    </Phone>
  );
}
function ADesktop() {
  const [t, setT] = useState<RhythmPhase>(NOW);
  const p = P.find(x => x.id === t)!;
  return (
    <Desktop>
      <Header />
      <div className="grid grid-cols-[170px_1fr_280px] gap-4">
        <nav className="space-y-1">
          {P.map(x => (
            <button key={x.id} onClick={() => setT(x.id)} className="flex min-h-11 w-full items-center gap-2 rounded-xl px-2 text-sm"
              style={t === x.id ? { background: tint(x.id), color: deep(x.id), fontWeight: 600 } : undefined}>
              <PhaseIcon phase={x.id} size="sm" />{x.label}<span className="ml-auto text-[10px] opacity-70">{x.cards.length}</span>
            </button>
          ))}
        </nav>
        <div className="space-y-3"><PhaseHead p={p} /><div className="grid grid-cols-2 gap-3">{p.cards.map(c => <Card key={c.title} phase={p.id} {...c} />)}</div></div>
        <aside className="space-y-2 rounded-xl border bg-card p-3">
          <p className="text-sm font-medium">Schedule</p>
          {["9:00 Doctor visit", "11:00 Walk", "1:00 Focus block", "3:00 Laundry", "6:00 Dinner", "8:00 Meds"].map((s, i) => (
            <p key={s} className={cn("rounded-lg px-2 py-1 text-xs", i === 3 && "font-semibold")} style={i === 3 ? { background: tint(NOW) } : undefined}>{s}</p>
          ))}
        </aside>
      </div>
    </Desktop>
  );
}

/* ---------------- B · Day Flow ---------------- */
function FlowList({ wide }: { wide?: boolean }) {
  const [open, setOpen] = useState<Record<string, boolean>>({ care: true, letgo: true });
  const nowIdx = P.findIndex(x => x.id === NOW);
  return (
    <div className="relative space-y-3 pl-5">
      <span className="absolute bottom-0 left-2 top-0 w-0.5 bg-border" aria-hidden />
      {P.map((p, i) => (
        <section key={p.id} className="relative space-y-2">
          <span className="absolute -left-[18px] top-2 h-3 w-3 rounded-full border-2 border-background" style={{ background: i <= nowIdx ? deep(p.id) : tint(p.id) }} />
          <button className="w-full text-left" onClick={() => setOpen(o => ({ ...o, [p.id]: !o[p.id] }))}>
            <PhaseHead p={p} extra={<span className="flex items-center gap-1 text-[11px] text-muted-foreground">{p.when}{p.id === NOW && <b style={{ color: deep(p.id) }}>· now</b>}<ChevronDown className={cn("h-3.5 w-3.5", open[p.id] && "rotate-180")} /></span>} />
          </button>
          {open[p.id] ? <div className={cn("grid gap-2", wide && "grid-cols-2")}>{p.cards.map(c => <Card key={c.title} phase={p.id} {...c} />)}</div>
            : <p className="text-xs text-muted-foreground">{i < nowIdx ? "Done for today · " : ""}{p.cards.length} cards folded</p>}
        </section>
      ))}
    </div>
  );
}
const BPhone = () => <Phone><Header compact /><FlowList /></Phone>;
function BDesktop() {
  return (
    <Desktop>
      <Header />
      <div className="grid grid-cols-[300px_1fr] gap-4">
        <aside className="space-y-0 rounded-xl border bg-card p-3">
          {P.map(p => (
            <div key={p.id} className="border-l-4 py-2 pl-2" style={{ borderColor: deep(p.id) }}>
              <p className="text-[11px] font-semibold uppercase" style={{ color: deep(p.id) }}>{p.when}</p>
              {p.id === "plan" && <p className="text-xs">9:00 Doctor visit · 11:00 Walk</p>}
              {p.id === "grow" && <p className="text-xs">1:00 Focus block</p>}
              {p.id === "care" && <p className="text-xs font-semibold">3:00 Laundry · 6:00 Dinner ← now</p>}
              {p.id === "letgo" && <p className="text-xs">8:00 Meds · 9:30 Wind down</p>}
            </div>
          ))}
        </aside>
        <FlowList wide />
      </div>
    </Desktop>
  );
}

/* ---------------- C · Four-Quadrant Board ---------------- */
function CPhone() {
  const [zoom, setZoom] = useState<RhythmPhase | null>(null);
  const z = P.find(x => x.id === zoom);
  return (
    <Phone>
      <Header compact />
      {z ? (
        <div className="space-y-2">
          <button className="text-xs underline" onClick={() => setZoom(null)}>← All phases</button>
          <PhaseHead p={z} />
          {z.cards.map(c => <Card key={c.title} phase={z.id} {...c} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {P.map(p => (
            <button key={p.id} onClick={() => setZoom(p.id)} className="min-h-[150px] space-y-2 rounded-2xl border p-3 text-left" style={{ background: tint(p.id) }}>
              <PhaseIcon phase={p.id} size="sm" />
              <p className="font-display" style={{ color: deep(p.id) }}>{p.label}</p>
              <p className="text-[11px]">{p.cards[0].lines[0]}</p>
              <p className="text-[10px] text-muted-foreground">{p.cards.length} cards · tap to open</p>
            </button>
          ))}
        </div>
      )}
    </Phone>
  );
}
function CDesktop() {
  return (
    <Desktop>
      <Header />
      <div className="flex gap-2 overflow-x-auto rounded-xl border bg-card p-2 text-xs">
        {["9:00 Doctor", "11:00 Walk", "1:00 Focus", "3:00 Laundry", "6:00 Dinner", "8:00 Meds"].map(s => <span key={s} className="shrink-0 rounded-lg bg-muted px-2 py-1">{s}</span>)}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {P.map(p => (
          <section key={p.id} className="space-y-2 rounded-2xl border p-3" style={{ background: `linear-gradient(180deg, ${tint(p.id)}, hsl(var(--card)) 40%)`, outline: p.id === NOW ? `2px solid ${deep(p.id)}` : undefined }}>
            <PhaseHead p={p} extra={p.id === NOW ? <span className="text-[11px] font-semibold" style={{ color: deep(p.id) }}>Now</span> : null} />
            <div className="grid max-h-[220px] grid-cols-2 gap-2 overflow-y-auto">{p.cards.map(c => <Card key={c.title} phase={p.id} {...c} small />)}</div>
          </section>
        ))}
      </div>
    </Desktop>
  );
}

const DESIGNS = [
  { id: "A", name: "Phase Tabs", note: "One phase at a time — opens on the phase that matches now.", phone: APhone, desktop: ADesktop },
  { id: "B", name: "Day Flow", note: "The day as a river: morning Plan through evening Let go.", phone: BPhone, desktop: BDesktop },
  { id: "C", name: "Four-Quadrant Board", note: "All four phases at a glance; tap a tile to open it.", phone: CPhone, desktop: CDesktop },
] as const;

export default function TodayMockups() {
  const [d, setD] = useState<"A" | "B" | "C">("A");
  const cur = DESIGNS.find(x => x.id === d)!;
  return (
    <div className="mx-auto max-w-[1600px] space-y-4 p-4">
      <div>
        <h1 className="font-display text-2xl">Today page mockups</h1>
        <p className="text-sm text-muted-foreground">Sample content only. Pick A, B, C or a mix.</p>
      </div>
      <div role="tablist" className="flex flex-wrap gap-2">
        {DESIGNS.map(x => (
          <button key={x.id} role="tab" aria-selected={d === x.id} onClick={() => setD(x.id)}
            className={cn("min-h-11 rounded-full border px-4 text-sm", d === x.id ? "bg-primary text-primary-foreground" : "bg-card")}>
            {x.id} · {x.name}
          </button>
        ))}
      </div>
      <p className="text-sm">{cur.note}</p>
      <div className="flex gap-6 overflow-x-auto pb-4">
        <div className="space-y-1"><p className="text-xs font-semibold uppercase text-muted-foreground">Phone</p><cur.phone key={`p${d}`} /></div>
        <div className="space-y-1"><p className="text-xs font-semibold uppercase text-muted-foreground">Desktop</p><cur.desktop key={`d${d}`} /></div>
      </div>
    </div>
  );
}
