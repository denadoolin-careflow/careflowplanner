import { useState } from "react";
import { BookOpen, FileText, Sprout, Leaf, Heart, Wind, CheckCircle2, Flag, Target } from "lucide-react";
import { Progress } from "@/components/ui/progress";

/** Temporary preview: three designs for the inside of a project, with sample content. */
const PHASES = [
  { k: "Plan", icon: Sprout, tasks: ["Sketch bed layout", "Price planters"] },
  { k: "Grow", icon: Leaf, tasks: ["Plant basil & thyme", "Set watering rhythm"] },
  { k: "Care", icon: Heart, tasks: ["Share herbs with Mom"] },
  { k: "Let go", icon: Wind, tasks: ["Compost old pots"] },
];
const MILESTONES = [["Beds built", true], ["First harvest", false], ["Share a meal", false]] as const;
const TIMELINE = [
  ["Oct 2", "Milestone · Beds built", Flag],
  ["Oct 6", "Note · Bed layout ideas", FileText],
  ["Oct 9", "Library · The Herb Lover's Guide", BookOpen],
  ["Oct 16", "Finished · Plant basil", CheckCircle2],
] as const;

function Cover() {
  return <div className="rounded-2xl bg-primary p-5 text-primary-foreground">
    <p className="text-[11px] uppercase tracking-widest opacity-80">Home & family · Grow</p>
    <h3 className="font-display text-2xl">Kitchen herb garden</h3>
    <div className="mt-3 flex items-center gap-3"><Progress value={45} className="h-1.5 flex-1 bg-primary-foreground/25" /><span className="text-xs">5/11</span></div>
  </div>;
}
function Timeline() {
  return <ol className="space-y-3 rounded-2xl border border-border bg-card p-4">
    {TIMELINE.map(([d, t, I]) => <li key={d} className="flex gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"><I className="h-4 w-4" /></span><div><p className="text-xs text-muted-foreground">{d}</p><p className="text-sm">{t}</p></div></li>)}
  </ol>;
}
function Garden() {
  return <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2 md:grid md:grid-cols-4 md:overflow-visible">
    {PHASES.map(({ k, icon: I, tasks }) => <section key={k} className="w-[80%] shrink-0 snap-start space-y-2 rounded-2xl border border-border bg-card p-3 md:w-auto">
      <p className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold"><I className="h-3.5 w-3.5" />{k}</p>
      {tasks.map(t => <div key={t} className="min-h-11 rounded-xl bg-muted/60 p-3 text-sm">{t}</div>)}
    </section>)}
  </div>;
}
function Seeds() {
  return <div className="flex flex-wrap gap-2">{MILESTONES.map(([m, d]) => <span key={m} className={`inline-flex min-h-9 items-center gap-1 rounded-full border px-3 text-xs ${d ? "border-secondary bg-secondary/15" : "border-border"}`}><Sprout className="h-3 w-3" />{m}</span>)}</div>;
}

function A() { return <div className="space-y-4"><Cover /><Timeline /></div>; }
function B() { return <div className="space-y-4"><h3 className="font-display text-2xl">Kitchen herb garden</h3><Seeds /><Garden /></div>; }
function C() {
  const [t, setT] = useState<"j" | "g">("j");
  return <div className="space-y-4">
    <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
      <h3 className="font-display text-xl">Kitchen herb garden</h3>
      <Progress value={45} className="h-1.5" />
      <p className="text-sm"><span className="text-muted-foreground">Next step:</span> Set watering rhythm</p>
      <p className="flex items-center gap-1 text-xs text-muted-foreground"><Target className="h-3 w-3" />Goal · Grow more of our food</p>
    </div>
    <div className="flex gap-2">{([["j", "Journal"], ["g", "Garden"]] as const).map(([k, l]) => <button key={k} onClick={() => setT(k)} aria-pressed={t === k} className={`min-h-11 rounded-full border px-4 text-sm ${t === k ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>{l}</button>)}</div>
    {t === "j" ? <Timeline /> : <><Seeds /><Garden /></>}
  </div>;
}

export default function ProjectDetailMockups() {
  const [tab, setTab] = useState<"A" | "B" | "C">("A");
  const opts = { A: ["Journal page", "Cover, then one timeline of milestones, notes, library and finished tasks."], B: ["Garden page", "Tasks in Plan, Grow, Care, Let go columns with milestone seeds on top."], C: ["Journal + Garden", "Shared summary card with tabs for Journal and Garden."] } as const;
  return <div className="mx-auto max-w-5xl space-y-4 px-4 py-6 pb-28">
    <header><p className="text-xs uppercase tracking-widest text-muted-foreground">Preview · sample content</p><h1 className="font-display text-3xl">Inside a project</h1></header>
    <div className="flex gap-2 overflow-x-auto pb-1">{(Object.keys(opts) as ("A" | "B" | "C")[]).map(k => <button key={k} onClick={() => setTab(k)} aria-pressed={tab === k} className={`min-h-11 shrink-0 rounded-full border px-4 text-sm ${tab === k ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>{k} · {opts[k][0]}</button>)}</div>
    <p className="text-sm text-muted-foreground">{opts[tab][1]}</p>
    {tab === "A" ? <A /> : tab === "B" ? <B /> : <C />}
  </div>;
}
