import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, CalendarDays, Plus, Check, ChevronDown, Sun, MoonStar } from "lucide-react";
import { PHASE_ICONS } from "@/lib/phase-icons";

type Phase = "plan" | "grow" | "care" | "letgo";
const PHASES: { id: Phase; name: string; window: string; summary: string }[] = [
  { id: "plan", name: "Plan", window: "Before 11am", summary: "Morning Reset · 2 tasks" },
  { id: "grow", name: "Grow", window: "11am – 3pm", summary: "Dentist 1:00 · 3 tasks" },
  { id: "care", name: "Care", window: "3pm – 6pm", summary: "Mom's meds · 1 task" },
  { id: "letgo", name: "Let go", window: "After 6pm", summary: "Evening Reflection" },
];
const tint = (p: Phase) => ({ background: `hsl(var(--rhythm-${p}-tint))` });
const deep = (p: Phase) => ({ color: `hsl(var(--rhythm-${p}-deep))` });

function Badge({ p, active }: { p: Phase; active?: boolean }) {
  const Icon = PHASE_ICONS[p];
  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full"
      style={active ? { background: `hsl(var(--rhythm-${p}))`, color: "hsl(var(--rhythm-on))" } : { ...tint(p), ...deep(p) }}>
      <Icon className="h-4 w-4" aria-hidden />
    </span>
  );
}

const Card = ({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) => (
  <div className={`rounded-[20px] bg-card p-4 shadow-[0_1px_2px_hsl(var(--foreground)/0.06),0_8px_24px_-12px_hsl(var(--foreground)/0.18)] ${className}`} style={style}>{children}</div>
);

function Task({ title, done, p }: { title: string; done?: boolean; p?: Phase }) {
  return (
    <div className="flex min-h-11 items-center gap-3">
      <span className={`grid h-5 w-5 place-items-center rounded-md border-2 ${done ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/50"}`}>{done && <Check className="h-3 w-3" />}</span>
      <span className={`flex-1 text-[15px] ${done ? "text-muted-foreground line-through" : "text-foreground"}`}>{title}</span>
      {p && <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ ...tint(p), ...deep(p) }}>{PHASES.find(x => x.id === p)!.name}</span>}
    </div>
  );
}

function Phone({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <figure className="mx-auto w-full max-w-[390px]">
      <figcaption className="mb-2 text-center text-sm text-muted-foreground">{label}</figcaption>
      <div className="h-[720px] overflow-y-auto rounded-[36px] border-[6px] border-foreground/80 bg-background p-3">{children}</div>
    </figure>
  );
}

/* ---------- Option 1: streamlined Day feed ---------- */
function OptionOne() {
  const [open, setOpen] = useState<Phase>("grow");
  return (
    <Phone label="Calm feed: tasks within one scroll">
      <div className="space-y-3">
        <Card className="overflow-hidden p-0">
          <div className="p-4" style={{ background: "linear-gradient(160deg, hsl(var(--rhythm-letgo-tint)), hsl(var(--card)))" }}>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Monday · Today</p>
            <div className="flex items-end justify-between">
              <h3 className="font-display text-3xl text-foreground">November 2</h3>
              <MoonStar className="h-10 w-10" style={deep("letgo")} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Last Quarter in Leo · 52° · Autumn · Cycle day 14</p>
          </div>
          <div className="flex justify-between px-4 py-2 text-xs text-muted-foreground">
            {["S","M","T","W","T","F","S"].map((d, i) => (
              <span key={i} className={`grid h-9 w-9 place-items-center rounded-full ${i === 1 ? "bg-primary text-primary-foreground" : ""}`}>{d}</span>
            ))}
          </div>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Focus · Top 3</p>
          <Task title="Call pharmacy about refill" />
          <Task title="Finish November budget" done />
          <Task title="Pack bag for Ohio" />
        </Card>
        <h4 className="px-1 font-display text-lg">Your day</h4>
        {PHASES.map((ph) => (
          <Card key={ph.id} className="p-3" style={open === ph.id ? { boxShadow: `0 0 0 2px hsl(var(--rhythm-${ph.id}))` } : undefined}>
            <button className="flex min-h-11 w-full items-center gap-3 text-left" aria-expanded={open === ph.id} onClick={() => setOpen(ph.id)}>
              <Badge p={ph.id} active={open === ph.id} />
              <span className="flex-1">
                <span className="block font-semibold" style={deep(ph.id)}>{ph.name} <span className="font-normal text-muted-foreground">· {ph.window}</span></span>
                <span className="block text-sm text-muted-foreground">{ph.summary}</span>
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform motion-reduce:transition-none ${open === ph.id ? "rotate-180" : ""}`} />
            </button>
            {open === ph.id && (
              <div className="mt-1 border-t border-border/50 pt-1">
                <Task title="1:00 pm Dentist" />
                <Task title="Grocery run" />
                <div className="flex min-h-11 items-center gap-2 text-sm text-muted-foreground"><Plus className="h-4 w-4" /> Add to {ph.name}…</div>
              </div>
            )}
          </Card>
        ))}
        <Card>
          <button className="flex min-h-11 w-full items-center justify-between text-left">
            <span><span className="block font-semibold">Rhythms & notebook</span><span className="text-sm text-muted-foreground">Moon, cycle, guidance, today's note</span></span>
            <ChevronDown className="h-4 w-4" />
          </button>
        </Card>
      </div>
    </Phone>
  );
}

/* ---------- Option 2: unified horizon navigation ---------- */
const SCOPES = ["Day", "Week", "Month", "Season", "Year"] as const;
const LAYOUTS: Record<(typeof SCOPES)[number], [string, string]> = {
  Day: ["Flow", "Timeline"], Week: ["Schedule", "Cards"], Month: ["Calendar", "Rhythm"], Season: ["Phases", "Goals"], Year: ["Chapters", "Months"],
};
function OptionTwo() {
  const [scope, setScope] = useState<(typeof SCOPES)[number]>("Week");
  const [layout, setLayout] = useState(0);
  return (
    <Phone label="One scope bar, one layout switch">
      <div className="sticky top-0 z-10 -mx-3 -mt-3 space-y-2 bg-background/95 px-3 pb-2 pt-3 backdrop-blur">
        <div className="flex items-center gap-1">
          <button className="grid h-11 w-11 place-items-center rounded-full" aria-label="Previous"><ChevronLeft className="h-5 w-5" /></button>
          <h3 className="flex-1 text-center font-display text-xl">{scope === "Day" ? "Mon, Nov 2" : scope === "Week" ? "Nov 1 – 7" : scope === "Month" ? "November" : scope === "Season" ? "Autumn" : "2026"}</h3>
          <button className="grid h-11 w-11 place-items-center rounded-full" aria-label="Next"><ChevronRight className="h-5 w-5" /></button>
          <button className="grid h-11 w-11 place-items-center rounded-full bg-card shadow-sm" aria-label="Pick date"><CalendarDays className="h-5 w-5" /></button>
        </div>
        <div role="tablist" className="grid grid-cols-5 rounded-full bg-muted p-1">
          {SCOPES.map((s) => (
            <button key={s} role="tab" aria-selected={scope === s} onClick={() => { setScope(s); setLayout(0); }}
              className={`min-h-10 rounded-full text-sm font-semibold ${scope === s ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>{s}</button>
          ))}
        </div>
        <div className="flex gap-2">
          {LAYOUTS[scope].map((l, i) => (
            <button key={l} onClick={() => setLayout(i)} aria-pressed={layout === i}
              className={`min-h-9 rounded-full border px-4 text-sm ${layout === i ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>{l}</button>
          ))}
        </div>
      </div>
      <div className="mt-2 space-y-3">
        {(scope === "Week" ? ["Sun 1", "Mon 2", "Tue 3", "Wed 4"] : ["Plan", "Grow", "Care", "Let go"]).map((label, i) => {
          const p = PHASES[i].id;
          return (
            <Card key={label} className="p-3">
              <div className="mb-1 flex items-center gap-2"><Badge p={p} /><span className="font-semibold" style={deep(p)}>{label}</span></div>
              <Task title={["Laundry", "Dentist 1:00", "Pay water bill", "Journal"][i]} p={scope === "Week" ? p : undefined} />
            </Card>
          );
        })}
        <p className="px-1 text-center text-sm text-muted-foreground">Same header on every scope — only the content below changes.</p>
      </div>
    </Phone>
  );
}

/* ---------- Option 3: harmonized card system ---------- */
function OptionThree() {
  return (
    <Phone label="One card style and phase language">
      <div className="space-y-3">
        <Card style={tint("letgo")}>
          <div className="flex items-center gap-2"><Badge p="letgo" active /><span className="text-xs font-semibold uppercase tracking-wider" style={deep("letgo")}>Now · Let go</span></div>
          <h3 className="mt-2 font-display text-2xl text-foreground">Release what's finished</h3>
          <p className="mt-1 text-[15px] text-foreground/80">Clear one small thing and rest early tonight.</p>
        </Card>
        <div className="grid grid-cols-2 gap-3">
          {PHASES.map((ph) => (
            <Card key={ph.id} className="p-3">
              <Badge p={ph.id} />
              <p className="mt-2 font-semibold" style={deep(ph.id)}>{ph.name}</p>
              <p className="text-sm text-muted-foreground">{ph.summary}</p>
            </Card>
          ))}
        </div>
        <Card>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Every task looks the same everywhere</p>
          <Task title="Morning Reset" done p="plan" />
          <Task title="Dentist 1:00 pm" p="grow" />
          <Task title="Mom's evening meds" p="care" />
          <Task title="Evening Reflection" p="letgo" />
        </Card>
        <Card className="flex items-center gap-3">
          <Sun className="h-5 w-5 text-accent" />
          <p className="flex-1 text-[15px]">Headings in Playfair, body in Figtree, 20px rounded cards, no outlines.</p>
        </Card>
        <div className="flex justify-center pt-2">
          <button className="grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg" aria-label="Add"><Plus className="h-6 w-6" /></button>
        </div>
        <p className="text-center text-sm text-muted-foreground">One Add button — type "Dentist Thu 2pm in Grow".</p>
      </div>
    </Phone>
  );
}

const OPTIONS = [
  { n: 1, title: "Calm Day feed", desc: "Merge the photo, moon and week strip into one header; one Top 3; only the current phase open; rhythms and notebook tucked into one card.", C: OptionOne },
  { n: 2, title: "Unified navigation", desc: "One header and Day · Week · Month · Season · Year bar everywhere, with just two layout choices per scope.", C: OptionTwo },
  { n: 3, title: "One visual language", desc: "Same card, task row and phase colors on every screen, plus a single Add button that understands plain language.", C: OptionThree },
];

export default function PlannerSimplifyMockups() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <Link to="/planner" className="text-sm text-muted-foreground hover:text-foreground">← Back to Planner</Link>
      <h1 className="mt-2 font-display text-3xl text-foreground">Simplifying the Planner</h1>
      <p className="mt-1 max-w-2xl text-[15px] text-muted-foreground">Three preview concepts with sample data — tap around. Nothing here changes your real planner.</p>
      <div className="mt-6 grid gap-10 lg:grid-cols-3">
        {OPTIONS.map(({ n, title, desc, C }) => (
          <section key={n}>
            <h2 className="font-display text-xl text-foreground">Option {n} · {title}</h2>
            <p className="mb-4 mt-1 text-sm text-muted-foreground">{desc}</p>
            <C />
          </section>
        ))}
      </div>
    </div>
  );
}
