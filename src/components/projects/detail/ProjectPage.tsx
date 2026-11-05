import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Check, ChevronDown, ChevronLeft, FileText, MoreHorizontal, Paperclip, Play, Plus, Upload } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { PHASE_ICONS } from "@/lib/phase-icons";
import { RHYTHM_LABEL, type RhythmPhase } from "@/lib/planner/rhythm-phase";
import { PHASE_ORDER } from "@/lib/today-phase-items";
import { projectDue, projectPhase, projectProgress } from "@/lib/projects/phase";
import { phaseOfTask, type GardenPhase } from "@/lib/projects/garden-phases";
import { ProgressRing, PhasePill } from "@/components/projects/ProgressRing";
import { QuickTaskSheet } from "@/components/tasks/QuickTaskSheet";
import { createNote, updateNote } from "@/lib/notes";
import { addLink, uploadDoc, type CabinetDoc } from "@/lib/filing-cabinet";
import { parseTaskInput } from "@/lib/nlp-task";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { Project, Task } from "@/lib/types";
import { useDraggable, useDropZone, toastWithUndo, type DragPayload } from "@/lib/dnd/pointer-dnd";
import { useSetWeeklyFocus } from "@/components/projects/FocusProjectPicker";

const G2R: Record<GardenPhase, RhythmPhase> = { Plan: "plan", Grow: "grow", Care: "care", "Let go": "letgo" };
const R2G: Record<RhythmPhase, GardenPhase> = { plan: "Plan", grow: "Grow", care: "Care", letgo: "Let go" };
const ROLE: Record<RhythmPhase, string> = { plan: "Decide and prepare", grow: "Make and build", care: "Share, launch and tend", letgo: "Wrap up and reflect" };
const tint = (p: RhythmPhase) => `hsl(var(--rhythm-${p}-tint))`;
const deep = (p: RhythmPhase) => `hsl(var(--rhythm-${p}-deep))`;
const main = (p: RhythmPhase) => `hsl(var(--rhythm-${p}))`;
const md = (iso?: string) => (iso ? format(new Date(`${iso}T00:00`), "MMM d") : "");
const db = supabase as any;

/** Move a task into a phase and (optionally) before another task, renumbering that phase's order. */
function useMoveTask(project: Project, sections: any[]) {
  const { state, updateTask } = useStore();
  return async (taskId: string, phase: RhythmPhase, beforeId?: string) => {
    const t = state.tasks.find(x => x.id === taskId); if (!t || taskId === beforeId) return;
    const prev = { garden: t.garden, sortOrder: t.sortOrder };
    const from = G2R[phaseOfTask(t, sections)];
    const peers = state.tasks.filter(x => x.projectId === project.id && !x.parentTaskId && !x.done && x.id !== taskId && G2R[phaseOfTask(x, sections)] === phase)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    if (from === phase && !beforeId) return;
    const idx = beforeId ? Math.max(0, peers.findIndex(x => x.id === beforeId)) : peers.length;
    const order = [...peers.slice(0, idx), t, ...peers.slice(idx)];
    await updateTask(t.id, { garden: { ...(t.garden ?? {}), phase: R2G[phase] }, sortOrder: idx } as any);
    for (let i = 0; i < order.length; i++) if (order[i].id !== t.id && (order[i].sortOrder ?? 0) !== i) await updateTask(order[i].id, { sortOrder: i } as any);
    toastWithUndo(from === phase ? "Reordered" : `Moved to ${RHYTHM_LABEL[phase]}`, () => updateTask(t.id, prev as any));
  };
}

function TaskLine({ t, phase, onDropBefore }: { t: Task; phase: RhythmPhase; onDropBefore?: (d: DragPayload) => void }) {
  const { toggleTask } = useStore();
  const [open, setOpen] = useState(false);
  const drag = useDraggable({ type: "task", id: t.id }, !!onDropBefore && !t.done);
  const z = useDropZone(["task"], d => onDropBefore?.(d));
  return (
    <li {...drag.props} {...(onDropBefore ? z.props : {})} className={cn("flex min-h-[48px] items-center gap-3 rounded-2xl bg-card px-3 py-1.5 ring-1 ring-border/60 transition", onDropBefore && !t.done && "cursor-grab", z.isOver && "shadow-[0_-3px_0_0_hsl(var(--foreground)/0.5)]")}>
      <button type="button" onClick={() => void toggleTask(t.id)} aria-label={t.done ? `Mark ${t.title} not done` : `Complete ${t.title}`} aria-pressed={t.done} className="grid h-11 w-11 shrink-0 place-items-center -m-2">
        <span className="grid h-6 w-6 place-items-center rounded-full border-2" style={{ borderColor: main(phase), background: t.done ? main(phase) : "transparent", color: "hsl(var(--card))" }}>
          {t.done && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
        </span>
      </button>
      <button type="button" onClick={() => setOpen(true)} className={cn("min-w-0 flex-1 break-words py-2 text-left text-[15px]", t.done && "text-muted-foreground line-through")}>{t.title}</button>
      {t.dueDate && <PhasePill phase={phase}>{md(t.dueDate)}</PhasePill>}
      <QuickTaskSheet task={t} open={open} onOpenChange={setOpen} />
    </li>
  );
}

function PhaseTaskGroup({ phase, tasks, project, here, move }: { phase: RhythmPhase; tasks: Task[]; project: Project; here: boolean; move: (id: string, ph: RhythmPhase, before?: string) => Promise<void> }) {
  const { addTask } = useStore();
  const [showDone, setShowDone] = useState(false);
  const [v, setV] = useState("");
  const open = tasks.filter(t => !t.done).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)); const done = tasks.filter(t => t.done);
  const z = useDropZone(["task"], d => void move(d.id, phase));
  const Icon = PHASE_ICONS[phase];
  const add = async (e: React.FormEvent) => {
    e.preventDefault(); const raw = v.trim(); if (!raw) return; setV("");
    const p = parseTaskInput(raw);
    await addTask({ title: p.title || raw, dueDate: p.dueDate, priority: p.priority, energy: p.energy, tags: p.tags, estMinutes: p.estMinutes, projectId: project.id, area: (project.areaName as any) ?? undefined, garden: { phase: R2G[phase] } } as any);
  };
  return (
    <section {...z.props} className={cn("planner-card border-l-4 p-4 transition", z.isOver && "ring-2")} style={{ borderLeftColor: main(phase), ...(z.isOver ? { "--tw-ring-color": main(phase), background: tint(phase) } as React.CSSProperties : {}) }}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-full" style={{ background: here ? main(phase) : tint(phase), color: here ? "hsl(var(--card))" : deep(phase) }}><Icon className="h-4 w-4" /></span>
        <h3 className="font-display text-lg" style={{ color: deep(phase) }}>{RHYTHM_LABEL[phase]}</h3>
        <span className="text-sm text-muted-foreground">{ROLE[phase]}</span>
        {here && <span className="ml-auto rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">Here now</span>}
      </div>
      <ul className="space-y-2">{open.map(t => <TaskLine key={t.id} t={t} phase={phase} onDropBefore={d => void move(d.id, phase, t.id)} />)}</ul>
      {z.isOver && <p className="mt-2 rounded-full bg-card/80 px-3 py-1 text-center text-xs font-semibold" style={{ color: deep(phase) }}>Move to {RHYTHM_LABEL[phase]}</p>}
      {done.length > 0 && (
        <button type="button" onClick={() => setShowDone(s => !s)} aria-expanded={showDone} className="mt-2 inline-flex min-h-[44px] items-center gap-1 text-sm font-semibold text-muted-foreground">
          <Check className="h-4 w-4" />{done.length} done<ChevronDown className={cn("h-4 w-4 transition", showDone && "rotate-180")} />
        </button>
      )}
      {showDone && <ul className="space-y-2">{done.map(t => <TaskLine key={t.id} t={t} phase={phase} />)}</ul>}
      <form onSubmit={add} className="mt-2">
        <input value={v} onChange={e => setV(e.target.value)} aria-label={`Add to ${RHYTHM_LABEL[phase]}`} placeholder={`Add to ${RHYTHM_LABEL[phase]}…`}
          className="h-11 w-full rounded-2xl border border-dashed bg-transparent px-4 text-sm placeholder:text-muted-foreground focus:outline-none" style={{ borderColor: main(phase) }} />
      </form>
    </section>
  );
}

function Milestones({ project, phase }: { project: Project; phase: RhythmPhase }) {
  const { updateProject } = useStore();
  const ms = [...(project.milestones ?? [])].sort((a, b) => (a.date ?? "9999").localeCompare(b.date ?? "9999"));
  const [title, setTitle] = useState(""); const [date, setDate] = useState("");
  const save = (list: typeof ms) => updateProject(project.id, { milestones: list });
  return (
    <section className="planner-card p-4">
      <div className="mb-2 flex items-baseline justify-between"><h3 className="font-display text-lg">Milestones</h3><span className="text-xs text-muted-foreground">on the calendar</span></div>
      <ol className="relative space-y-1 border-l-2 pl-4" style={{ borderColor: tint(phase) }}>
        {ms.map(m => (
          <li key={m.id} className="relative flex min-h-[44px] items-center gap-3">
            <button type="button" aria-label={m.done ? `Mark ${m.title} not done` : `Complete ${m.title}`} onClick={() => save(ms.map(x => x.id === m.id ? { ...x, done: !x.done } : x))}
              className="absolute -left-[27px] h-4 w-4 rounded-full border-2 bg-card" style={{ borderColor: main(phase), background: m.done ? main(phase) : undefined }} />
            <span className="w-14 shrink-0 font-display text-sm text-muted-foreground">{md(m.date) || "—"}</span>
            <span className={cn("min-w-0 flex-1 break-words text-sm", m.done && "text-muted-foreground line-through")}>{m.title}</span>
            <button type="button" aria-label={`Remove ${m.title}`} onClick={() => save(ms.filter(x => x.id !== m.id))} className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-muted">×</button>
          </li>
        ))}
      </ol>
      <form className="mt-2 flex gap-2" onSubmit={e => { e.preventDefault(); if (!title.trim()) return; void save([...ms, { id: crypto.randomUUID(), title: title.trim(), date: date || undefined, done: false }]); setTitle(""); setDate(""); }}>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Add a milestone…" aria-label="Milestone name" className="h-11 min-w-0 flex-1 rounded-2xl border border-dashed bg-transparent px-3 text-sm focus:outline-none" style={{ borderColor: main(phase) }} />
        <input type="date" value={date} onChange={e => setDate(e.target.value)} aria-label="Milestone date" className="h-11 w-36 rounded-2xl bg-background px-2 text-sm ring-1 ring-border" />
      </form>
    </section>
  );
}

function Notepad({ project }: { project: Project }) {
  const { updateProject } = useStore();
  const navigate = useNavigate();
  const padId = (project.details as any)?.notepadNoteId as string | undefined;
  const [text, setText] = useState(""); const [loaded, setLoaded] = useState(false);
  const [linked, setLinked] = useState<{ id: string; title: string }[]>([]);
  const idRef = useRef<string | undefined>(padId); const timer = useRef<number>();
  const creating = useRef<Promise<string> | null>(null);
  useEffect(() => {
    let live = true;
    void (async () => {
      const { data } = await db.from("notes").select("id,title,body").eq("project_id", project.id).eq("archived", false).order("updated_at", { ascending: false });
      if (!live) return;
      const rows = (data ?? []) as { id: string; title: string; body: string }[];
      const pad = rows.find(r => r.id === padId);
      if (pad) setText(pad.body ?? "");
      setLinked(rows.filter(r => r.id !== padId).map(r => ({ id: r.id, title: r.title || "Untitled" })));
      setLoaded(true);
    })();
    return () => { live = false; };
  }, [project.id, padId]);
  const ensure = async () => {
    if (idRef.current) return idRef.current;
    creating.current ??= createNote({ title: `${project.name} notes`, body: "", projectId: project.id }).then(async n => {
      idRef.current = n.id;
      await updateProject(project.id, { details: { ...(project.details ?? {}), notepadNoteId: n.id } as any });
      return n.id;
    });
    return creating.current;
  };
  const onChange = (v: string) => {
    setText(v);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(async () => { const id = await ensure(); await updateNote(id, { body: v }); }, 600);
  };
  const newNote = async () => { const n = await createNote({ title: "Untitled", projectId: project.id }); navigate(`/notes/${n.id}`); };
  return (
    <section className="planner-card p-4">
      <div className="mb-2 flex items-baseline justify-between"><h3 className="font-display text-lg">Notepad</h3><span className="text-xs font-semibold" style={{ color: deep("plan") }}>Saves to Notes</span></div>
      <textarea value={text} onChange={e => onChange(e.target.value)} disabled={!loaded} aria-label="Project notepad"
        placeholder={`Jot anything about ${project.name}… it saves to Notes as "${project.name} notes" and stays linked here.`}
        className="min-h-[140px] w-full rounded-2xl bg-background p-3 text-sm ring-1 ring-border focus:outline-none focus:ring-2 focus:ring-primary" />
      {padId && <Link to={`/notes/${padId}`} className="mt-1 inline-flex min-h-[44px] items-center text-xs font-semibold text-muted-foreground underline">Open in Notes</Link>}
      <div className="mt-2 flex items-center justify-between"><h4 className="text-sm font-semibold text-muted-foreground">Linked notes</h4>
        <button type="button" onClick={newNote} className="inline-flex min-h-[44px] items-center gap-1 text-sm font-semibold text-primary"><Plus className="h-4 w-4" />New note</button></div>
      <ul className="space-y-1.5">
        {linked.length === 0 && <li className="text-sm text-muted-foreground">No other notes yet.</li>}
        {linked.map(n => (
          <li key={n.id}><Link to={`/notes/${n.id}`} className="flex min-h-[44px] items-center gap-2 rounded-xl bg-muted/60 px-3 text-sm font-semibold">
            <FileText className="h-4 w-4 shrink-0" aria-hidden /><span className="min-w-0 flex-1 break-words">{n.title}</span><span className="text-xs text-muted-foreground">Notes ›</span></Link></li>
        ))}
      </ul>
    </section>
  );
}

const fmtSize = (b?: number | null) => !b ? "" : b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`;
const badge = (mime?: string | null, title = "") => {
  const ext = title.split(".").pop()?.toUpperCase() ?? "";
  if (mime?.includes("pdf")) return { l: "PDF", p: "letgo" as RhythmPhase };
  if (mime?.startsWith("image")) return { l: "IMG", p: "plan" as RhythmPhase };
  if (/XLS|CSV/.test(ext) || mime?.includes("sheet")) return { l: "XLS", p: "care" as RhythmPhase };
  return { l: ext.slice(0, 4) || "FILE", p: "grow" as RhythmPhase };
};

function Files({ project }: { project: Project }) {
  const [docs, setDocs] = useState<CabinetDoc[]>([]);
  const [pickOpen, setPickOpen] = useState(false);
  const [all, setAll] = useState<CabinetDoc[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const load = async () => {
    const { data: links } = await db.from("entity_links").select("source_id").eq("source_type", "document").eq("target_type", "project").eq("target_id", project.id);
    const ids = (links ?? []).map((l: any) => l.source_id);
    if (!ids.length) { setDocs([]); return; }
    const { data } = await db.from("cabinet_documents").select("*").in("id", ids).is("trashed_at", null).order("created_at", { ascending: false });
    setDocs(data ?? []);
  };
  useEffect(() => { void load(); }, [project.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const target = { type: "project" as const, id: project.id, label: project.name };
  const openPicker = async () => {
    const { data } = await db.from("cabinet_documents").select("*").is("trashed_at", null).order("created_at", { ascending: false }).limit(100);
    setAll((data ?? []).filter((d: CabinetDoc) => !docs.some(x => x.id === d.id))); setPickOpen(true);
  };
  const attach = async (d: CabinetDoc) => { await addLink(d.id, target); setPickOpen(false); toast.success("File linked"); void load(); };
  const upload = async (f: File) => {
    try { const d = await uploadDoc(f, { title: f.name, drawerId: null, mime: f.type }); await addLink(d.id, target); toast.success("Uploaded to Files"); void load(); }
    catch { toast.error("Couldn't upload that file"); }
  };
  return (
    <section className="planner-card p-4">
      <div className="mb-2 flex items-baseline justify-between"><h3 className="font-display text-lg">Files</h3><span className="text-xs text-muted-foreground">{docs.length} from CareFlow Files</span></div>
      <ul className="divide-y divide-border/60">
        {docs.length === 0 && <li className="py-2 text-sm text-muted-foreground">No files linked yet.</li>}
        {docs.map(d => { const b = badge(d.mime_type, d.title); return (
          <li key={d.id}><Link to={`/notes/cabinet?open=${d.id}`} className="flex min-h-[52px] items-center gap-3 py-2">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-[10px] font-bold" style={{ background: tint(b.p), color: deep(b.p) }}>{b.l}</span>
            <span className="min-w-0 flex-1"><span className="block break-words text-sm font-semibold">{d.title}</span>
              <span className="block text-xs text-muted-foreground">{[fmtSize(d.size_bytes), format(new Date(d.created_at), "MMM d")].filter(Boolean).join(" · ")}</span></span>
          </Link></li>
        ); })}
      </ul>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={openPicker} className="inline-flex min-h-[44px] items-center gap-2 rounded-full px-4 text-sm font-semibold ring-1 ring-border"><Paperclip className="h-4 w-4" />Attach from Files</button>
        <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex min-h-[44px] items-center gap-2 rounded-full px-4 text-sm font-semibold ring-1 ring-border"><Upload className="h-4 w-4" />Upload</button>
        <input ref={fileRef} type="file" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ""; }} />
      </div>
      <Dialog open={pickOpen} onOpenChange={setPickOpen}>
        <DialogContent className="max-h-[80dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>Attach from Files</DialogTitle><DialogDescription>Pick a file to link to {project.name}.</DialogDescription></DialogHeader>
          <ul className="space-y-1">
            {all.length === 0 && <li className="text-sm text-muted-foreground">No other files yet.</li>}
            {all.map(d => <li key={d.id}><button type="button" onClick={() => attach(d)} className="flex min-h-[44px] w-full items-center gap-2 rounded-xl px-2 text-left text-sm hover:bg-muted">
              <FileText className="h-4 w-4 shrink-0" aria-hidden /><span className="min-w-0 flex-1 break-words">{d.title}</span></button></li>)}
          </ul>
        </DialogContent>
      </Dialog>
    </section>
  );
}

export function ProjectPage({ project, onClassic }: { project: Project; onClassic: () => void }) {
  const { state, updateTask } = useStore();
  const navigate = useNavigate();
  const ph = projectPhase(project);
  const pr = projectProgress(project.id, state.tasks);
  const due = projectDue(project);
  const sections = (state.projectSections ?? []).filter(s => s.projectId === project.id);
  const tasks = useMemo(() => state.tasks.filter(t => t.projectId === project.id && !t.parentTaskId), [state.tasks, project.id]);
  const grouped = useMemo(() => {
    const g: Record<RhythmPhase, Task[]> = { plan: [], grow: [], care: [], letgo: [] };
    for (const t of tasks) g[G2R[phaseOfTask(t, sections)]].push(t);
    return g;
  }, [tasks, sections]);
  const moveTask = useMoveTask(project, sections);
  const setFocus = useSetWeeklyFocus();
  const next = pr.next; const nextPhase = next ? G2R[phaseOfTask(next, sections)] : ph;
  const why = project.details?.whyItMatters || project.notes?.split("\n")[0];
  const ms = project.milestones ?? [];
  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 p-4 pb-16 md:p-8">
      <div className="flex items-center justify-between">
        <Link to="/projects" className="inline-flex min-h-[44px] items-center gap-1 text-sm font-semibold text-primary"><ChevronLeft className="h-4 w-4" />Projects</Link>
        <DropdownMenu>
          <DropdownMenuTrigger aria-label="More project tools" className="grid h-11 w-11 place-items-center rounded-full hover:bg-muted"><MoreHorizontal className="h-5 w-5" /></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => void setFocus(project.id)}>Set as this week's focus</DropdownMenuItem>
            <DropdownMenuItem onSelect={onClassic}>Edit project &amp; sections</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate("/notes/cabinet")}>Open Files</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <header className="planner-card p-4 sm:p-5" style={{ background: `linear-gradient(135deg, ${tint(ph)}, hsl(var(--card)) 70%)` }}>
        <div className="flex items-start gap-4">
          <ProgressRing pct={pr.pct} phase={ph} size={72} />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: deep(ph) }}>{project.areaName ? `${project.areaName} · ` : ""}{RHYTHM_LABEL[ph]} phase</p>
            <h1 className="break-words font-display text-3xl leading-tight">{project.name}</h1>
            {why && <p className="mt-1 break-words text-sm text-muted-foreground">{why}</p>}
          </div>
        </div>
        <ol className="mt-4 grid grid-cols-4 gap-2" aria-label="Phase tracker">
          {PHASE_ORDER.map((p, i) => {
            const cur = p === ph; const past = i < PHASE_ORDER.indexOf(ph);
            return <li key={p} aria-current={cur ? "step" : undefined} className="grid min-h-[40px] place-items-center rounded-full px-1 text-center text-sm font-semibold ring-1"
              style={{ background: cur ? main(p) : past ? tint(p) : "hsl(var(--card))", color: cur ? "hsl(var(--card))" : deep(p), borderColor: main(p), ["--tw-ring-color" as any]: tint(p) }}>{RHYTHM_LABEL[p]}</li>;
          })}
        </ol>
        <p className="mt-3 flex flex-wrap gap-x-4 text-sm text-muted-foreground">
          <span><b className="text-foreground">{pr.done}/{pr.total}</b> done</span>
          {due && <span>Due <b className="text-foreground">{md(due)}</b></span>}
          <span>{ms.length} {ms.length === 1 ? "milestone" : "milestones"}</span>
        </p>
      </header>

      <section className="planner-card border-l-4 p-4" style={{ borderLeftColor: main(nextPhase), background: `linear-gradient(135deg, ${tint(nextPhase)}, hsl(var(--card)) 70%)` }}>
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em]" style={{ color: deep(nextPhase) }}>Next step · {RHYTHM_LABEL[nextPhase]}</p>
        {next ? <ul><TaskLine t={next} phase={nextPhase} /></ul> : <p className="text-sm text-muted-foreground">No open tasks — add one below.</p>}
        {next && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={async () => { await updateTask(next.id, { isTopThree: true }); toast.success("Added to today"); }} className="inline-flex min-h-[44px] items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground">Add to today</button>
            <Link to="/focus" className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-card px-5 text-sm font-semibold ring-1 ring-border"><Play className="h-4 w-4" />Focus</Link>
          </div>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">{PHASE_ORDER.map(p => <PhaseTaskGroup key={p} phase={p} tasks={grouped[p]} project={project} here={p === ph} move={moveTask} />)}</div>
        <aside className="space-y-4">
          <Milestones project={project} phase={ph} />
          <Notepad project={project} />
          <Files project={project} />
        </aside>
      </div>
    </div>
  );
}
