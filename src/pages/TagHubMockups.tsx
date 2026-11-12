import { useState } from "react";
import { Circle, MoreHorizontal, FolderKanban, FileText, CheckSquare, Plus, Smartphone, Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

type Phase = "plan" | "grow" | "care" | "letgo";
const PHASES: { id: Phase; label: string }[] = [
  { id: "plan", label: "Plan" }, { id: "grow", label: "Grow" }, { id: "care", label: "Care" }, { id: "letgo", label: "Let go" },
];
const tint = (p: Phase) => ({ background: `hsl(var(--rhythm-${p}-tint))`, color: `hsl(var(--rhythm-${p}-deep))` });
const edge = (p: Phase) => ({ borderLeftColor: `hsl(var(--rhythm-${p}-deep))` });

const PROJECTS = [
  { title: "Nana's care plan", phase: "grow" as Phase, done: 6, total: 10, next: "Book cardiology follow-up" },
  { title: "Move Nana's paperwork", phase: "plan" as Phase, done: 1, total: 5, next: "Scan POA documents" },
];
const TASKS = [
  { title: "Refill blood pressure meds", phase: "plan" as Phase, when: "Today · 9:00", date: "Nov 12" },
  { title: "Drive Nana to physical therapy", phase: "grow" as Phase, when: "Today · 1:30", date: "Nov 12" },
  { title: "Share visit notes with Aunt Linda", phase: "care" as Phase, when: "Tomorrow", date: "Nov 13" },
  { title: "Clear out expired prescriptions", phase: "letgo" as Phase, when: "This week", date: "Nov 15" },
];
const NOTES = [
  { title: "Doctor visit — Nov 10", snippet: "BP stable. Ask about sleep and the new dosage next visit…", date: "Nov 10" },
  { title: "Questions for the cardiologist", snippet: "Swelling in ankles? Can she keep walking daily?", date: "Nov 8" },
];
const RELATED = ["#medications", "#appointments", "#family", "#paperwork"];

function TagChip({ name }: { name: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-block">
      <button onClick={() => setOpen(!open)} className="rounded-full bg-secondary/20 px-2.5 py-1 text-xs font-medium text-foreground">{name}</button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-2 w-56 rounded-2xl border bg-card p-3 shadow-lg">
          <p className="font-display text-base">{name}</p>
          <p className="text-xs text-muted-foreground">2 projects · 7 tasks · 4 notes</p>
          <div className="mt-3 flex gap-2">
            <button className="flex-1 rounded-full bg-primary px-3 py-1.5 text-xs text-primary-foreground">Open hub</button>
            <button className="flex-1 rounded-full border px-3 py-1.5 text-xs">Add task</button>
          </div>
        </div>
      )}
    </span>
  );
}

const ProjectCard = ({ p }: { p: typeof PROJECTS[0] }) => (
  <div className="planner-card overflow-hidden rounded-[20px] border bg-card">
    <div className="h-1.5" style={{ background: `hsl(var(--rhythm-${p.phase}-deep))` }} />
    <div className="p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium [overflow-wrap:anywhere]">{p.title}</p>
        <span className="shrink-0 rounded-full px-2 py-0.5 text-[11px]" style={tint(p.phase)}>{PHASES.find(x => x.id === p.phase)!.label}</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">Next: {p.next}</p>
      <div className="mt-3 h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${(p.done / p.total) * 100}%` }} /></div>
      <p className="mt-1 text-[11px] text-muted-foreground">{p.done}/{p.total} done</p>
    </div>
  </div>
);
const TaskRow = ({ t }: { t: typeof TASKS[0] }) => (
  <div className="flex min-h-11 items-start gap-3 rounded-2xl border border-l-4 bg-card px-3 py-2.5" style={edge(t.phase)}>
    <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
    <div className="min-w-0 flex-1">
      <p className="text-sm [overflow-wrap:anywhere]">{t.title}</p>
      <span className="mt-1 inline-block rounded-full px-2 py-0.5 text-[11px]" style={tint(t.phase)}>{t.when}</span>
    </div>
  </div>
);
const NoteCard = ({ n }: { n: typeof NOTES[0] }) => (
  <div className="rounded-2xl border bg-card p-3">
    <p className="text-sm font-medium">{n.title}</p>
    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{n.snippet}</p>
    <p className="mt-2 text-[11px] text-muted-foreground">{n.date}</p>
  </div>
);
const Section = ({ icon: I, title, children }: { icon: any; title: string; children: React.ReactNode }) => (
  <section className="space-y-2">
    <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><I className="h-4 w-4" />{title}</h3>
    {children}
  </section>
);

function Stacked() {
  return (
    <div className="space-y-6">
      <Section icon={FolderKanban} title="Projects"><div className="grid gap-3 sm:grid-cols-2">{PROJECTS.map(p => <ProjectCard key={p.title} p={p} />)}</div></Section>
      <Section icon={CheckSquare} title="Open tasks by phase">
        {PHASES.map(ph => (
          <div key={ph.id} className="space-y-2">
            <span className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium" style={tint(ph.id)}>{ph.label}</span>
            {TASKS.filter(t => t.phase === ph.id).map(t => <TaskRow key={t.title} t={t} />)}
          </div>
        ))}
      </Section>
      <Section icon={FileText} title="Notes">{NOTES.map(n => <NoteCard key={n.title} n={n} />)}</Section>
    </div>
  );
}
function TwoCol({ phone }: { phone: boolean }) {
  return (
    <div className={cn("grid gap-6", !phone && "grid-cols-[1.4fr_1fr]")}>
      <Section icon={CheckSquare} title="Tasks"><div className="space-y-2">{TASKS.map(t => <TaskRow key={t.title} t={t} />)}</div></Section>
      <div className="space-y-6">
        <Section icon={FolderKanban} title="Projects"><div className="space-y-3">{PROJECTS.map(p => <ProjectCard key={p.title} p={p} />)}</div></Section>
        <Section icon={FileText} title="Notes"><div className="space-y-2">{NOTES.map(n => <NoteCard key={n.title} n={n} />)}</div></Section>
      </div>
    </div>
  );
}
function Timeline() {
  const [f, setF] = useState("All");
  const items = [
    ...TASKS.map(t => ({ kind: "Tasks", date: t.date, node: <TaskRow t={t} /> })),
    ...NOTES.map(n => ({ kind: "Notes", date: n.date, node: <NoteCard n={n} /> })),
    ...PROJECTS.map(p => ({ kind: "Projects", date: "Nov 1", node: <ProjectCard p={p} /> })),
  ].filter(i => f === "All" || i.kind === f).sort((a, b) => b.date.localeCompare(a.date, undefined, { numeric: true }));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">{["All", "Tasks", "Notes", "Projects"].map(x => (
        <button key={x} onClick={() => setF(x)} className={cn("rounded-full border px-3 py-1 text-xs", f === x && "bg-primary text-primary-foreground")}>{x}</button>
      ))}</div>
      <ol className="space-y-3 border-l-2 border-border pl-4">
        {items.map((i, idx) => (
          <li key={idx} className="relative"><span className="absolute -left-[23px] top-3 h-3 w-3 rounded-full bg-primary" />
            <p className="mb-1 text-[11px] text-muted-foreground">{i.date} · {i.kind}</p>{i.node}</li>
        ))}
      </ol>
    </div>
  );
}

export default function TagHubMockups() {
  const [layout, setLayout] = useState<"A" | "B" | "C">("A");
  const [phone, setPhone] = useState(false);
  const [dark, setDark] = useState(false);
  return (
    <div className={cn("min-h-screen bg-background p-4 text-foreground md:p-8", dark && "dark")}>
      <div className="mx-auto mb-6 flex max-w-5xl flex-wrap items-center gap-2">
        <h1 className="mr-auto font-display text-2xl">Tag hub mockups</h1>
        {(["A", "B", "C"] as const).map(l => (
          <button key={l} onClick={() => setLayout(l)} className={cn("rounded-full border px-3 py-1.5 text-xs", layout === l && "bg-primary text-primary-foreground")}>
            {l} · {l === "A" ? "Stacked" : l === "B" ? "Two columns" : "Timeline"}</button>
        ))}
        <button onClick={() => setPhone(!phone)} className="rounded-full border p-2" aria-label="Toggle phone">{phone ? <Monitor className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}</button>
        <button onClick={() => setDark(!dark)} className="rounded-full border p-2" aria-label="Toggle dark">{dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</button>
      </div>
      <div className={cn("mx-auto rounded-[28px] border bg-background p-5 shadow-sm", phone ? "max-w-[390px]" : "max-w-5xl")}>
        <header className="mb-4 flex items-start gap-3">
          <span className="mt-2 h-3 w-3 shrink-0 rounded-full bg-primary" />
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-3xl">#nana-care</h2>
            <p className="text-sm text-muted-foreground">2 projects · 4 open tasks · 2 notes</p>
          </div>
          <button className="rounded-full border p-2" aria-label="Tag options"><MoreHorizontal className="h-4 w-4" /></button>
        </header>
        <div className="mb-4 flex items-center gap-2 rounded-2xl border bg-card px-3 py-2">
          <Plus className="h-4 w-4 text-muted-foreground" />
          <input className="flex-1 bg-transparent text-sm outline-none" placeholder="Add a task or note to #nana-care…" />
        </div>
        <div className="mb-6 flex flex-wrap items-center gap-2"><span className="text-xs text-muted-foreground">Related:</span>{RELATED.map(r => <TagChip key={r} name={r} />)}</div>
        {layout === "A" && <Stacked />}
        {layout === "B" && <TwoCol phone={phone} />}
        {layout === "C" && <Timeline />}
      </div>
    </div>
  );
}
