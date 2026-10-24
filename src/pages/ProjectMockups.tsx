import { useState } from "react";
import { BookOpen, FileText, Sprout, Leaf, Heart, Wind, Target } from "lucide-react";
import { Progress } from "@/components/ui/progress";

/** Temporary preview: three project designs with sample content. Removed after a choice is made. */
const PHASES = [
  { k: "Plan", icon: Sprout, cls: "bg-phase-plan-tint text-phase-plan" },
  { k: "Grow", icon: Leaf, cls: "bg-phase-grow-tint text-phase-grow" },
  { k: "Care", icon: Heart, cls: "bg-phase-care-tint text-phase-care" },
  { k: "Let go", icon: Wind, cls: "bg-phase-letgo-tint text-phase-letgo" },
];
const SAMPLE = {
  Plan: ["Sketch garden beds", "Price raised planters"],
  Grow: ["Plant herbs", "Weekly watering rhythm"],
  Care: ["Share basil with Mom"],
  "Let go": ["Compost old pots"],
} as Record<string, string[]>;

function A() {
  return <div className="flex snap-x gap-3 overflow-x-auto pb-2">
    {PHASES.map(({ k, icon: I, cls }) => <div key={k} className="w-[78%] shrink-0 snap-start space-y-2 rounded-2xl border border-border bg-card p-3 sm:w-64">
      <p className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${cls}`}><I className="h-3.5 w-3.5" />{k}</p>
      {SAMPLE[k].map(t => <div key={t} className="rounded-xl bg-muted/60 p-3 text-sm">{t}</div>)}
    </div>)}
  </div>;
}

function B() {
  return <div className="overflow-hidden rounded-2xl border border-border bg-card">
    <div className="bg-gradient-brand p-5 text-primary-foreground"><p className="text-xs uppercase tracking-widest opacity-80">Project journal</p><h3 className="font-display text-2xl">Kitchen herb garden</h3><p className="text-sm opacity-90">Joy & creativity · Spring</p></div>
    <ol className="space-y-3 p-4">
      {[["Oct 2", "Started planning beds", FileText], ["Oct 9", "Read 'The Herb Lover's Guide'", BookOpen], ["Oct 16", "First basil sprouts!", Sprout]].map(([d, t, I]: any) =>
        <li key={d} className="flex gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"><I className="h-4 w-4" /></span><div><p className="text-xs text-muted-foreground">{d}</p><p className="text-sm">{t}</p></div></li>)}
    </ol>
    <div className="flex flex-wrap gap-1.5 border-t border-border p-4 text-xs"><span className="rounded-full bg-muted px-2.5 py-1">Note · Bed layout</span><span className="rounded-full bg-muted px-2.5 py-1">Library · Herb guide</span><span className="rounded-full bg-muted px-2.5 py-1">Goal · Grow more food</span></div>
  </div>;
}

function C() {
  const areas = [["Home & family", [["Kitchen herb garden", 60], ["Declutter garage", 25]]], ["Health & daily care", [["Morning walks", 80]]], ["Career & purpose", [["Portfolio refresh", 40]]]] as const;
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
    {areas.map(([a, ps]) => <section key={a} className="space-y-2 rounded-2xl border border-border bg-card p-3">
      <h3 className="font-display text-base">{a}</h3>
      {ps.map(([n, p]) => <div key={n} className="space-y-1.5 rounded-xl bg-muted/50 p-3"><div className="flex justify-between text-sm"><span>{n}</span><span className="text-xs text-muted-foreground">{p}%</span></div><Progress value={p} className="h-1.5" /><p className="flex items-center gap-1 text-[11px] text-muted-foreground"><Target className="h-3 w-3" />Linked goal</p></div>)}
    </section>)}
  </div>;
}

export default function ProjectMockups() {
  const [tab, setTab] = useState<"A" | "B" | "C">("A");
  const opts = { A: ["Garden board", "Columns by Plan, Grow, Care, Let go."], B: ["Project journal", "Cover, progress timeline, linked notes and library."], C: ["Life-area dashboard", "Projects grouped by life area with goal progress."] } as const;
  return <div className="mx-auto max-w-5xl space-y-4 px-4 py-6 pb-28">
    <header><p className="text-xs uppercase tracking-widest text-muted-foreground">Preview · sample content</p><h1 className="font-display text-3xl">Project designs</h1></header>
    <div className="flex flex-wrap gap-2">{(Object.keys(opts) as ("A" | "B" | "C")[]).map(k => <button key={k} onClick={() => setTab(k)} aria-pressed={tab === k} className={`min-h-11 rounded-full border px-4 text-sm ${tab === k ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>{k} · {opts[k][0]}</button>)}</div>
    <p className="text-sm text-muted-foreground">{opts[tab][1]}</p>
    {tab === "A" ? <A /> : tab === "B" ? <B /> : <C />}
  </div>;
}
