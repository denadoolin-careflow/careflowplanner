import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Home, ChevronRight, MoreHorizontal, Plus, Calendar, Zap, Users, Clock, Sun, Sprout, Flower2, Heart, Wind, Leaf, Moon,
  LayoutGrid, List as ListIcon, BookOpen, CheckCircle2, ChevronDown, FileText, Link2, Sparkles, Star, Share2,
  Archive, Pencil, Check, Undo2, Trash2, ArrowRightLeft, Flag,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub,
  DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProjectIconGlyph, projectIconTileStyle } from "@/lib/project-icon";
import { ConnectionsPanel } from "@/components/connections/ConnectionsPanel";
import { useConnections } from "@/lib/connections";
import { LinkedNotesPanel } from "@/components/notes/LinkedNotesPanel";
import { ProjectJournalPanel } from "@/components/journal/ProjectJournalPanel";
import { MilestonesCard } from "@/components/projects/MilestonesCard";
import { CareyButton } from "@/components/carey/CareyButton";
import { ProjectGoalPicker, LinkedGoalLabels } from "@/components/goals/LifeAreaGoalPicker";
import { openTaskQuickEdit } from "@/lib/open-task-quick-edit";
import { useHousehold } from "@/lib/household";
import {
  GARDEN_PHASES, type GardenPhase, type LetGoKind, type ProjectDetailsData,
  groupTasksByPhase, moveGarden, validNextStep,
} from "@/lib/projects/garden-phases";
import type { Project, Task } from "@/lib/types";
import { format, parseISO } from "date-fns";
import { useAtmosphere } from "@/lib/atmospheres";
import { LUNAR_RHYTHM, lunarRhythmAt, monthRhythmMoments } from "@/lib/cosmic/lunar-rhythm";
import type { RhythmPhase } from "@/lib/planner/rhythm-phase";

const PHASE: Record<GardenPhase, {
  icon: typeof Sprout; key: string; subtitle: string; add: string; empty: string;
}> = {
  Plan: { icon: Leaf, key: "plan", subtitle: "Decide what matters", add: "Add a decision", empty: "What would help this feel clearer?" },
  Grow: { icon: Sprout, key: "grow", subtitle: "Take the next small step", add: "Add a step", empty: "What is one manageable action?" },
  Care: { icon: Heart, key: "care", subtitle: "Support what is in motion", add: "Add a check-in", empty: "What needs a little ongoing attention?" },
  "Let go": { icon: Moon, key: "letgo", subtitle: "Make room for what matters", add: "Set something down", empty: "Is there something you can simplify or set down?" },
};
const v = (k: string, name: string) => `hsl(var(--pg-${k}${name}))`;
const card = "rounded-2xl border border-border bg-card shadow-[0_1px_2px_hsl(var(--foreground)/0.04)]";
const focus = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

type LetGoAsk = { taskId?: string; title?: string } | null;

export function ProjectGardenPage({ project }: { project: Project }) {
  const { state, updateProject, updateTask, addTask, toggleTask, deleteTask } = useStore();
  const sections = useMemo(() => (state.projectSections ?? []).filter((s: any) => s.projectId === project.id), [state.projectSections, project.id]);
  const all = useMemo(() => state.tasks.filter(t => t.projectId === project.id && !t.parentTaskId), [state.tasks, project.id]);
  const open = useMemo(() => all.filter(t => !t.done), [all]);
  const completed = useMemo(() => all.filter(t => t.done), [all]);
  const groups = useMemo(() => groupTasksByPhase(open, sections), [open, sections]);
  const details: ProjectDetailsData = project.details ?? {};
  const nextId = validNextStep(details.nextStepTaskId, all, sections);
  const nextTask = nextId ? all.find(t => t.id === nextId) : undefined;

  const setDetails = (p: Partial<ProjectDetailsData>) => void updateProject(project.id, { details: { ...details, ...p } });

  // Clear a stale next step (task finished, let go, or deleted) once tasks have loaded.
  useEffect(() => {
    if (details.nextStepTaskId && !nextId && state.tasks.length > 0) setDetails({ nextStepTaskId: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [details.nextStepTaskId, nextId, state.tasks.length]);

  const [view, setView] = useState<"garden" | "list" | "journal">("garden");
  const [showDone, setShowDone] = useState(false);
  const [letGoAsk, setLetGoAsk] = useState<LetGoAsk>(null);
  const [addOpen, setAddOpen] = useState<GardenPhase | null>(null);

  const openAdd = (p: GardenPhase) => (p === "Let go" ? setLetGoAsk({}) : setAddOpen(p));
  const move = (t: Task, to: GardenPhase) => {
    if (to === "Let go") { setLetGoAsk({ taskId: t.id }); return; }
    void updateTask(t.id, { garden: moveGarden(t.garden, to) });
  };
  const addToToday = (t: Task) => {
    if (t.isTopThree) { toast("Already on Today"); return; }
    void updateTask(t.id, { isTopThree: true });
    toast.success("Added to Today");
  };
  const actions: CardActions = {
    move, addToToday,
    toggleNext: (t) => setDetails({ nextStepTaskId: nextId === t.id ? null : t.id }),
    toggle: (t) => void toggleTask(t.id),
    remove: (t) => { if (confirm(`Delete "${t.title}"?`)) void deleteTask(t.id); },
    nextId,
  };
  const createIn = async (phase: GardenPhase, title: string, letGo?: LetGoPick) => {
    await addTask({ title, projectId: project.id, garden: moveGarden(undefined, phase, letGo) } as any);
  };

  // Match the page background and fonts to the selected atmosphere.
  const { atmosphere } = useAtmosphere();
  const atmosphereStyle = {
    "--pg-display-font": `'${atmosphere.fontDisplay}', ui-serif, Georgia, serif`,
    "--pg-body-font": `'${atmosphere.fontBody}', 'Nunito Sans', ui-sans-serif, system-ui, sans-serif`,
    background: `
      radial-gradient(60rem 30rem at 0% -10%, ${atmosphere.palette[0]}2e, transparent 60%),
      radial-gradient(55rem 30rem at 100% 0%, ${atmosphere.palette[3] ?? atmosphere.palette[1]}2e, transparent 60%),
      radial-gradient(45rem 26rem at 50% 100%, ${atmosphere.palette[4] ?? atmosphere.palette[2]}24, transparent 60%),
      hsl(var(--background))`,
  } as React.CSSProperties;

  // Monthly Planning gardens connect their columns to the month's moon phases.
  const monthDate = details.monthKey ? new Date(`${details.monthKey}-15T12:00:00`) : null;
  const moonWindows = useMemo(() => {
    if (!monthDate) return null;
    const windows = {} as Record<RhythmPhase, { glyph: string; moon: string; date: Date }>;
    for (const m of monthRhythmMoments(monthDate)) {
      if (!windows[m.phase]) windows[m.phase] = { glyph: m.info.glyph, moon: m.info.moon, date: m.date };
    }
    return windows;
  }, [monthDate?.getTime()]); // eslint-disable-line react-hooks/exhaustive-deps
  const currentPhase: RhythmPhase | null = monthDate && details.monthKey === format(new Date(), "yyyy-MM") ? lunarRhythmAt(new Date()) : null;

  return (
    <div className="project-garden min-h-screen" style={atmosphereStyle}>
      <div className="mx-auto w-full max-w-6xl space-y-5 px-4 pb-28 pt-4 md:px-6 md:pt-6">
        <GardenHeader project={project} onAdd={() => setAddOpen("Plan")} />
        <Overview project={project} details={details} setDetails={setDetails} />
        <NextStepStrip task={nextTask} candidates={open.filter(t => !t.garden?.letGo)} onPick={(id) => setDetails({ nextStepTaskId: id })} onToday={addToToday} />

        <div className="flex flex-wrap items-center gap-2">
          <div role="tablist" aria-label="Project view" className="flex gap-2">
            {([["garden", "Garden", LayoutGrid], ["list", "List", ListIcon], ["journal", "Journal", BookOpen]] as const).map(([k, label, I]) => (
              <button key={k} role="tab" aria-selected={view === k} onClick={() => setView(k)}
                className={cn("inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm font-medium transition-colors", focus,
                  view === k ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted")}>
                <I className="h-4 w-4" aria-hidden />{label}
              </button>
            ))}
          </div>
          <button onClick={() => setShowDone(s => !s)} aria-expanded={showDone}
            className={cn("ml-auto inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm hover:bg-muted", focus)}>
            <CheckCircle2 className="h-4 w-4" aria-hidden />Completed · {completed.length}
            <ChevronDown className={cn("h-4 w-4 transition-transform", showDone && "rotate-180")} aria-hidden />
          </button>
        </div>

        {showDone && <CompletedList tasks={completed} onRestore={(t) => void toggleTask(t.id)} />}

        {view === "garden" && <Board groups={groups} actions={actions} onCreate={createIn} onLetGo={() => setLetGoAsk({})} onDropTask={(id, to) => { const t = all.find(x => x.id === id); if (t) move(t, to); }} moonWindows={moonWindows} currentPhase={currentPhase} projectId={project.id} />}
        {view === "list" && <ListView groups={groups} actions={actions} onCreate={createIn} onLetGo={() => setLetGoAsk({})} projectId={project.id} />}
        {view === "journal" && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className={cn(card, "p-4")}><ProjectJournalPanel projectId={project.id} projectName={project.name} /></div>
            <div className={cn(card, "p-4")}><MilestonesCard project={project} /></div>
          </div>
        )}

        <Supporting project={project} />
      </div>

      <AddTaskDialog phase={addOpen} onClose={() => setAddOpen(null)} onCreate={createIn} />
      <LetGoDialog
        open={!!letGoAsk}
        title={letGoAsk?.taskId ? all.find(t => t.id === letGoAsk.taskId)?.title : undefined}
        onClose={() => setLetGoAsk(null)}
        onConfirm={async (pick, newTitle) => {
          if (letGoAsk?.taskId) {
            const t = all.find(x => x.id === letGoAsk.taskId);
            if (t) await updateTask(t.id, { garden: moveGarden(t.garden, "Let go", pick) });
          } else if (newTitle) await createIn("Let go", newTitle, pick);
          setLetGoAsk(null);
        }}
      />
    </div>
  );
}

/* ---------------------------- Header ---------------------------- */

function GardenHeader({ project, onAdd }: { project: Project; onAdd: () => void }) {
  const { updateProject } = useStore();
  const nav = useNavigate();
  const [name, setName] = useState(project.name);
  const [desc, setDesc] = useState(project.notes ?? "");
  const [editOpen, setEditOpen] = useState(false);
  const [careyOpen, setCareyOpen] = useState(false);
  useEffect(() => setName(project.name), [project.name]);
  useEffect(() => setDesc(project.notes ?? ""), [project.notes]);
  const save = (p: Partial<Project>) => void updateProject(project.id, p);

  return (
    <header className="space-y-3">
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
        <Link to="/" aria-label="Home" className={cn("rounded p-1 hover:text-foreground", focus)}><Home className="h-4 w-4" /></Link>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        <Link to="/projects" className={cn("rounded hover:text-foreground", focus)}>Projects</Link>
        <span aria-hidden>/</span>
        <span className="truncate text-foreground" aria-current="page">{project.name}</span>
      </nav>
      <div className="flex flex-wrap items-start gap-3 sm:flex-nowrap">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-2xl sm:h-16 sm:w-16" style={projectIconTileStyle(project)}>
          <ProjectIconGlyph project={project} className="h-7 w-7" />
        </span>
        <div className="min-w-0 flex-1 basis-56">
          <label className="sr-only" htmlFor="pg-title">Project name</label>
          <input id="pg-title" value={name} onChange={e => setName(e.target.value)}
            onBlur={() => name.trim() && name !== project.name ? save({ name: name.trim() }) : setName(project.name)}
            onKeyDown={e => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            className={cn("pg-display w-full rounded-lg bg-transparent text-3xl leading-tight sm:text-4xl md:text-5xl", focus)} />
          <label className="sr-only" htmlFor="pg-desc">Short description</label>
          <input id="pg-desc" value={desc} placeholder="Add a short description" onChange={e => setDesc(e.target.value)}
            onBlur={() => desc !== (project.notes ?? "") && save({ notes: desc })}
            onKeyDown={e => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            className={cn("mt-1 w-full rounded-lg bg-transparent text-base text-muted-foreground placeholder:text-muted-foreground/70 sm:text-lg", focus)} />
          <LinkedGoalLabels ids={project.linkedGoalIds} className="mt-2" />
        </div>
        <div className="flex shrink-0 items-center gap-2 max-sm:w-full max-sm:justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl bg-card" aria-label="Project actions"><MoreHorizontal className="h-5 w-5" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onSelect={() => setEditOpen(true)}><Pencil className="mr-2 h-4 w-4" />Edit project</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setCareyOpen(true)}><Sparkles className="mr-2 h-4 w-4" />Ask Carey</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => save({ isFavorite: !project.isFavorite })}><Star className="mr-2 h-4 w-4" />{project.isFavorite ? "Remove favorite" : "Favorite"}</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => { navigator.clipboard?.writeText(window.location.href); toast.success("Project link copied"); }}><Share2 className="mr-2 h-4 w-4" />Share link</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => { save({ archivedAt: new Date().toISOString() }); toast.success("Project archived"); nav("/projects"); }}><Archive className="mr-2 h-4 w-4" />Archive</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={onAdd} className="h-11 gap-2 rounded-xl px-5"><Plus className="h-4 w-4" />Add task</Button>
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="project-garden max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="pg-display text-2xl">Edit project</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><label className="text-sm font-medium" htmlFor="pg-ed-name">Name</label>
              <Input id="pg-ed-name" defaultValue={project.name} onBlur={e => e.target.value.trim() && save({ name: e.target.value.trim() })} /></div>
            <div><p className="mb-1 text-sm font-medium">Life-area goals</p>
              <ProjectGoalPicker ids={project.linkedGoalIds} onChange={ids => save({ linkedGoalIds: ids })} /></div>
          </div>
          <DialogFooter><Button onClick={() => setEditOpen(false)}>Done</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      {careyOpen && (
        <div className="flex justify-end">
          <CareyButton label="Carey" contextType="project" contextId={project.id}
            context={{ name: project.name, status: project.status, description: project.notes }}
            actions={[
              { label: "Suggest one small step", prompt: `Suggest one small, manageable next step for this project.\n\nProject: ${project.name}` },
              { label: "Summarize status", prompt: `Summarize this project's status in 3 short bullets.\n\nProject: ${project.name}` },
            ]} />
        </div>
      )}
    </header>
  );
}

/* ---------------------------- Overview ---------------------------- */

function FieldRow({ label, value, placeholder, onSave }: { label: string; value?: string; placeholder: string; onSave: (v: string) => void }) {
  const [d, setD] = useState(value ?? "");
  useEffect(() => setD(value ?? ""), [value]);
  const id = `pg-${label.replace(/\s/g, "-").toLowerCase()}`;
  return (
    <div className="grid gap-1 border-t border-border py-3 sm:grid-cols-[10rem_1fr] sm:items-start sm:gap-4">
      <label htmlFor={id} className="pt-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
      <Textarea id={id} rows={1} value={d} placeholder={placeholder} onChange={e => setD(e.target.value)}
        onBlur={() => d !== (value ?? "") && onSave(d)}
        className="min-h-10 resize-none border-transparent bg-transparent px-1 py-1 text-[15px] shadow-none hover:border-border focus-visible:border-input [field-sizing:content]" />
    </div>
  );
}

function Overview({ project, details, setDetails }: { project: Project; details: ProjectDetailsData; setDetails: (p: Partial<ProjectDetailsData>) => void }) {
  const { updateProject, user } = useStore() as any;
  const { members } = useHousehold(user?.id);
  const target = project.targetDate ?? project.endDate ?? project.deadline;
  const others = (members ?? []).filter((m: any) => m.user_id !== user?.id);
  return (
    <section className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
      <div className={cn(card, "p-5")}>
        <h2 className="pg-display text-2xl sm:text-3xl">Our intention</h2>
        <p className="mb-3 text-sm text-muted-foreground">Decide what matters and choose one small step.</p>
        <FieldRow label="Why it matters" value={details.whyItMatters} placeholder="The purpose of this project" onSave={v => setDetails({ whyItMatters: v })} />
        <FieldRow label="Enough for now" value={details.enoughForNow} placeholder="The smallest useful outcome that fits your capacity" onSave={v => setDetails({ enoughForNow: v })} />
      </div>
      <div className={cn(card, "p-5")}>
        <h2 className="pg-display mb-2 text-2xl sm:text-3xl">Project details</h2>
        <dl className="divide-y divide-border text-[15px]">
          <div className="flex min-h-12 items-center gap-3">
            <dt className="flex w-32 shrink-0 items-center gap-3 text-muted-foreground"><Calendar className="h-4 w-4" aria-hidden />Target date</dt>
            <dd className="min-w-0 flex-1">
              <label className="sr-only" htmlFor="pg-target">Target date</label>
              <div className="relative">
                {!target && <span className="pointer-events-none absolute inset-y-0 left-1 flex items-center text-primary">Add a date</span>}
                <input id="pg-target" type="date" value={target ?? ""} onChange={e => void updateProject(project.id, { targetDate: e.target.value || undefined } as any)}
                  className={cn("h-10 w-full rounded-lg bg-transparent px-1", !target && "text-transparent", focus)} />
              </div>
            </dd>
          </div>
          <div className="flex min-h-12 items-center gap-3">
            <dt className="flex w-32 shrink-0 items-center gap-3 text-muted-foreground"><Zap className="h-4 w-4" aria-hidden />Energy</dt>
            <dd className="min-w-0 flex-1">
              <Select value={details.energy ?? ""} onValueChange={(e: any) => setDetails({ energy: e })}>
                <SelectTrigger aria-label="Energy needed" className="h-10 border-transparent bg-transparent px-1 shadow-none hover:border-border"><SelectValue placeholder="Choose energy" /></SelectTrigger>
                <SelectContent>{["Gentle", "Moderate", "Focused"].map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
              </Select>
            </dd>
          </div>
          <div className="flex min-h-12 items-center gap-3">
            <dt className="flex w-32 shrink-0 items-center gap-3 text-muted-foreground"><Users className="h-4 w-4" aria-hidden />People</dt>
            <dd className="min-w-0 flex-1 truncate px-1">
              {others.length ? others.map((m: any) => m.display_name || "Member").join(", ")
                : <span>Just me <Link to="/settings/family" className="ml-1 text-sm text-primary hover:underline">Invite</Link></span>}
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}

/* ---------------------------- Next small step ---------------------------- */

function NextStepStrip({ task, candidates, onPick, onToday }: { task?: Task; candidates: Task[]; onPick: (id: string | null) => void; onToday: (t: Task) => void }) {
  const [open, setOpen] = useState(false);
  const picker = (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant={task ? "ghost" : "outline"} className="h-11 rounded-xl bg-card/60">{task ? "Change" : "Choose a step"}</Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="project-garden w-[min(22rem,calc(100vw-2rem))] p-1">
        {candidates.length === 0 && <p className="p-3 text-sm text-muted-foreground">Add a task first, then choose it here.</p>}
        <ul className="max-h-72 overflow-y-auto">
          {candidates.map(t => <li key={t.id}><button onClick={() => { onPick(t.id); setOpen(false); }} className="flex min-h-11 w-full items-center rounded-lg px-3 text-left text-sm hover:bg-muted">{t.title}</button></li>)}
        </ul>
        {task && <button onClick={() => { onPick(null); setOpen(false); }} className="min-h-11 w-full rounded-lg px-3 text-left text-sm text-muted-foreground hover:bg-muted">Remove next step</button>}
      </PopoverContent>
    </Popover>
  );
  return (
    <section aria-label="Next small step" className="flex flex-wrap items-center gap-3 rounded-2xl px-5 py-4" style={{ background: "hsl(var(--pg-sage))" }}>
      <div className="min-w-0 flex-1 basis-60">
        <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: v("plan", "-deep") }}>Next small step</p>
        {task
          ? <button onClick={() => openTaskQuickEdit(task.id)} className={cn("pg-display text-left text-2xl leading-tight hover:underline sm:text-3xl", focus)}>{task.title}</button>
          : <p className="pg-display text-2xl text-muted-foreground sm:text-3xl">Choose one small step</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {task?.estMinutes ? <span className="inline-flex h-10 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-sm"><Clock className="h-4 w-4" aria-hidden />{task.estMinutes} min</span> : null}
        {picker}
        {task && <Button variant="outline" onClick={() => onToday(task)} className="h-11 gap-2 rounded-xl border-primary/70 bg-card">
          <Sun className="h-4 w-4" />{task.isTopThree ? "On Today" : "Add to Today"}
        </Button>}
      </div>
    </section>
  );
}

/* ---------------------------- Board ---------------------------- */

type CardActions = {
  move: (t: Task, to: GardenPhase) => void; addToToday: (t: Task) => void; toggleNext: (t: Task) => void;
  toggle: (t: Task) => void; remove: (t: Task) => void; nextId: string | null;
};

type MoonWindows = Record<RhythmPhase, { glyph: string; moon: string; date: Date }> | null;

function Board({ groups, actions, onCreate, onLetGo, onDropTask, moonWindows, currentPhase, projectId }: {
  groups: Record<GardenPhase, Task[]>; actions: CardActions;
  onCreate: (p: GardenPhase, title: string) => Promise<void>; onLetGo: () => void;
  onDropTask: (id: string, to: GardenPhase) => void;
  moonWindows?: MoonWindows; currentPhase?: RhythmPhase | null; projectId: string;
}) {
  const [tab, setTab] = useState<GardenPhase>("Plan");
  return (
    <>
      <div role="tablist" aria-label="Phase" className="grid grid-cols-4 gap-1 rounded-xl border border-border bg-card p-1 md:hidden">
        {GARDEN_PHASES.map(p => { const I = PHASE[p].icon; const k = PHASE[p].key; return (
          <button key={p} role="tab" aria-selected={tab === p} onClick={() => setTab(p)}
            className={cn("flex min-h-11 flex-col items-center justify-center rounded-lg text-xs font-medium", focus, tab !== p && "text-muted-foreground")}
            style={tab === p ? { background: v(k, "-tint"), color: v(k, "-deep") } : undefined}>
            <span className="flex items-center gap-1"><I className="h-3.5 w-3.5" aria-hidden />{p}</span>
            <span className="text-[11px] opacity-80">{groups[p].length}</span>
          </button>); })}
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {GARDEN_PHASES.map(p => (
          <div key={p} className={cn(tab !== p && "max-md:hidden")}>
            <PhaseColumn phase={p} tasks={groups[p]} actions={actions} onCreate={onCreate} onLetGo={onLetGo} onDropTask={id => onDropTask(id, p)} projectId={projectId}
              moon={moonWindows?.[PHASE[p].key as RhythmPhase]} isCurrent={currentPhase === PHASE[p].key} />
          </div>
        ))}
      </div>
    </>
  );
}

/** Inline composer: autofocused, wrapping textbox. As you type it searches existing
 *  tasks to pull into this phase, and offers to create a new task or note. */
function InlineAdd({ phase, placeholder, projectId, onCreate }: {
  phase: GardenPhase; placeholder: string; projectId: string;
  onCreate: (title: string) => Promise<void>;
}) {
  const { state, updateTask } = useStore();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const m = PHASE[phase]; const k = m.key;

  const matches = useMemo(() => {
    const q = text.trim().toLowerCase();
    if (q.length < 2) return [];
    return state.tasks
      .filter(t => !t.done && !t.parentTaskId && t.projectId !== projectId && t.title.toLowerCase().includes(q))
      .slice(0, 5);
  }, [state.tasks, text, projectId]);

  const close = () => { setText(""); setOpen(false); };
  const submit = async () => {
    const title = text.trim();
    if (!title || busy) return;
    setBusy(true);
    try { await onCreate(title); close(); } finally { setBusy(false); }
  };
  const pullIn = async (t: Task) => {
    if (busy) return;
    setBusy(true);
    try {
      await updateTask(t.id, { projectId, garden: moveGarden(t.garden, phase) } as any);
      toast.success(`Moved "${t.title}" to ${phase}`);
      close();
    } finally { setBusy(false); }
  };
  const createLinkedNote = async () => {
    const title = text.trim();
    if (!title || busy) return;
    setBusy(true);
    try {
      const { createNote } = await import("@/lib/notes");
      await createNote({ title, projectId });
      toast.success("Note added to this project");
      close();
    } finally { setBusy(false); }
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className={cn("flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border bg-card/70 text-sm font-medium hover:bg-card", focus)}
        style={{ color: v(k, "-deep"), borderColor: `hsl(var(--pg-${k}) / 0.6)` }}>
        {phase === "Let go" ? <Wind className="h-4 w-4" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />}{m.add}
      </button>
    );
  }
  return (
    <div className="rounded-xl border bg-card p-2" style={{ borderColor: `hsl(var(--pg-${k}) / 0.6)` }}>
      <Textarea autoFocus value={text} disabled={busy} placeholder={placeholder} aria-label={m.add} rows={2}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void submit(); } if (e.key === "Escape") close(); }}
        className="min-h-11 resize-none whitespace-pre-wrap break-words border-transparent bg-transparent text-sm shadow-none focus-visible:border-input [field-sizing:content]" />
      {matches.length > 0 && (
        <ul className="mb-1 divide-y divide-border/60 overflow-hidden rounded-lg border border-border/70" aria-label="Existing tasks matching your text">
          {matches.map(t => (
            <li key={t.id}>
              <button type="button" disabled={busy} onClick={() => void pullIn(t)}
                className={cn("flex min-h-11 w-full items-center gap-2 px-2.5 py-1.5 text-left text-sm hover:bg-muted/60", focus)}>
                <ArrowRightLeft className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                <span className="min-w-0 flex-1 truncate">{t.title}</span>
                <span className="shrink-0 text-xs text-muted-foreground">Pull in</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap justify-end gap-1">
        <Button type="button" variant="ghost" size="sm" className="h-9" onClick={close}>Cancel</Button>
        <Button type="button" variant="outline" size="sm" className="h-9" disabled={!text.trim() || busy} onClick={() => void createLinkedNote()}>
          <FileText className="mr-1 h-3.5 w-3.5" aria-hidden />New note
        </Button>
        <Button type="button" size="sm" className="h-9" disabled={!text.trim() || busy} onClick={() => void submit()}>Add</Button>
      </div>
    </div>
  );
}

function PhaseColumn({ phase, tasks, actions, onCreate, onLetGo, onDropTask, moon, isCurrent, projectId }: {
  phase: GardenPhase; tasks: Task[]; actions: CardActions;
  onCreate: (p: GardenPhase, title: string) => Promise<void>; onLetGo: () => void;
  onDropTask: (id: string) => void; projectId: string;
  moon?: { glyph: string; moon: string; date: Date }; isCurrent?: boolean;
}) {
  const m = PHASE[phase]; const I = m.icon; const k = m.key;
  const [over, setOver] = useState(false);
  return (
    <section aria-label={`${phase} column`}
      onDragOver={e => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); setOver(false); const id = e.dataTransfer.getData("text/x-pg-task"); if (id) onDropTask(id); }}
      className={cn("flex h-full flex-col overflow-hidden rounded-2xl border border-border", over && "ring-2 ring-ring", isCurrent && "ring-2 ring-primary/50")}
      style={{ background: v(k, "-tint") }}>
      <div className="h-1.5" style={{ background: `hsl(var(--pg-${k}))` }} aria-hidden />
      <header className="flex items-start gap-3 px-4 pb-2 pt-3">
        <I className="mt-1 h-7 w-7 shrink-0" style={{ color: v(k, "-deep") }} aria-hidden />
        <div className="min-w-0">
          <h3 className="pg-display text-2xl leading-none">{phase} <span className="font-sans text-base font-normal text-muted-foreground">· {tasks.length}</span></h3>
          <p className="mt-1 text-sm text-muted-foreground">{m.subtitle}</p>
          {moon && (
            <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-card/70 px-2 py-0.5 text-xs text-muted-foreground" title={`${moon.moon} begins this phase`}>
              <span aria-hidden>{moon.glyph}</span>{moon.moon} · {format(moon.date, "MMM d")}
              {isCurrent && <span className="ml-1 rounded-full px-1.5 font-semibold" style={{ background: v(k, "-tint"), color: v(k, "-deep") }}>now</span>}
            </p>
          )}
        </div>
      </header>
      <ul className="flex flex-1 flex-col gap-2 px-3 pb-2">
        {tasks.map(t => <li key={t.id}><TaskCard task={t} phase={phase} actions={actions} /></li>)}
        {tasks.length === 0 && <li className="rounded-xl border border-dashed border-border/80 px-3 py-4 text-sm text-muted-foreground">{m.empty}</li>}
      </ul>
      <div className="p-3 pt-1">
        {phase === "Let go"
          ? <button onClick={onLetGo} className={cn("flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border bg-card/70 text-sm font-medium hover:bg-card", focus)}
              style={{ color: v(k, "-deep"), borderColor: `hsl(var(--pg-${k}) / 0.6)` }}>
              <Wind className="h-4 w-4" aria-hidden />{m.add}
            </button>
          : <InlineAdd phase={phase} placeholder={m.empty} projectId={projectId} onCreate={title => onCreate(phase, title)} />}
      </div>
    </section>
  );
}

function TaskCard({ task, phase, actions, compact }: { task: Task; phase: GardenPhase; actions: CardActions; compact?: boolean }) {
  const letGo = phase === "Let go";
  const isNext = actions.nextId === task.id;
  const k = PHASE[phase].key;
  const date = task.garden?.reviewDate ?? task.dueDate;
  return (
    <div draggable onDragStart={e => { e.dataTransfer.setData("text/x-pg-task", task.id); e.dataTransfer.effectAllowed = "move"; }}
      className={cn(card, "flex items-start gap-3 rounded-xl p-3", compact && "py-2")}>
      {letGo
        ? <Wind className="mt-0.5 h-5 w-5 shrink-0" style={{ color: v(k, "-deep") }} aria-hidden />
        : <button onClick={() => actions.toggle(task)} aria-label={`Complete ${task.title}`}
            className={cn("mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 border-muted-foreground/50 hover:border-primary", focus)} />}
      <div className="min-w-0 flex-1">
        <button onClick={() => openTaskQuickEdit(task.id)} className={cn("text-left text-[15px] leading-snug break-words hover:underline", focus)}>{task.title}</button>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {isNext && <span className="rounded-full px-2 py-0.5 font-medium" style={{ background: v("plan", "-tint"), color: v("plan", "-deep") }}>Next step</span>}
          {letGo && <span className="rounded-full px-2 py-0.5 font-medium" style={{ background: `hsl(var(--pg-letgo) / 0.25)`, color: v("letgo", "-deep") }}>{task.garden?.letGo === "later" ? "Maybe later" : "Released"}</span>}
          {task.estMinutes ? <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" aria-hidden />{task.estMinutes} min</span> : null}
          {date && <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" aria-hidden />{letGo && task.garden?.reviewDate ? "Review " : ""}{format(parseISO(date), "MMM d")}</span>}
        </div>
        {letGo && task.garden?.letGoReason && <p className="mt-1 text-xs text-muted-foreground">{task.garden.letGoReason}</p>}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button aria-label={`Actions for ${task.title}`} className={cn("-mr-1 -mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-muted", focus)}><MoreHorizontal className="h-4 w-4" /></button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onSelect={() => openTaskQuickEdit(task.id)}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger><ArrowRightLeft className="mr-2 h-4 w-4" />{letGo ? "Restore to…" : "Move to…"}</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {GARDEN_PHASES.filter(p => p !== phase && !(letGo && p === "Let go")).map(p => <DropdownMenuItem key={p} onSelect={() => actions.move(task, p)}>{p}</DropdownMenuItem>)}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          {!letGo && <>
            <DropdownMenuItem onSelect={() => actions.toggleNext(task)}><Flag className="mr-2 h-4 w-4" />{isNext ? "Remove next step" : "Set as next step"}</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => actions.addToToday(task)}><Sun className="mr-2 h-4 w-4" />Add to Today</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => actions.toggle(task)}><Check className="mr-2 h-4 w-4" />Mark complete</DropdownMenuItem>
          </>}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => actions.remove(task)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function ListView({ groups, actions, onCreate, onLetGo, projectId }: { groups: Record<GardenPhase, Task[]>; actions: CardActions; onCreate: (p: GardenPhase, title: string) => Promise<void>; onLetGo: () => void; projectId: string }) {
  return (
    <div className="space-y-4">
      {GARDEN_PHASES.map(p => { const I = PHASE[p].icon; const k = PHASE[p].key; return (
        <section key={p} aria-label={p} className={cn(card, "p-4")}>
          <header className="mb-2 flex items-center gap-2">
            <I className="h-5 w-5" style={{ color: v(k, "-deep") }} aria-hidden />
            <h3 className="pg-display text-xl">{p} <span className="font-sans text-sm text-muted-foreground">· {groups[p].length}</span></h3>
            {p === "Let go"
              ? <Button variant="ghost" size="sm" className="ml-auto h-10" onClick={onLetGo}><Wind className="mr-1 h-4 w-4" />{PHASE[p].add}</Button>
              : <div className="ml-auto w-56 max-w-full"><InlineAdd phase={p} placeholder={PHASE[p].empty} projectId={projectId} onCreate={title => onCreate(p, title)} /></div>}
          </header>
          {groups[p].length === 0 ? <p className="text-sm text-muted-foreground">{PHASE[p].empty}</p>
            : <ul className="space-y-2">{groups[p].map(t => <li key={t.id}><TaskCard task={t} phase={p} actions={actions} compact /></li>)}</ul>}
        </section>); })}
    </div>
  );
}

function CompletedList({ tasks, onRestore }: { tasks: Task[]; onRestore: (t: Task) => void }) {
  return (
    <section aria-label="Completed tasks" className={cn(card, "p-4")}>
      {tasks.length === 0 ? <p className="text-sm text-muted-foreground">Nothing completed yet.</p> : (
        <ul className="divide-y divide-border">
          {tasks.map(t => (
            <li key={t.id} className="flex min-h-11 items-center gap-3 py-1">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" aria-hidden />
              <span className="min-w-0 flex-1 text-sm text-muted-foreground line-through [overflow-wrap:anywhere]">{t.title}</span>
              <Button variant="ghost" size="sm" className="h-10" onClick={() => onRestore(t)}><Undo2 className="mr-1 h-4 w-4" />Restore</Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ---------------------------- Dialogs ---------------------------- */

type LetGoPick = { kind: LetGoKind; reason?: string; reviewDate?: string };

function AddTaskDialog({ phase, onClose, onCreate }: { phase: GardenPhase | null; onClose: () => void; onCreate: (p: GardenPhase, title: string) => Promise<void> }) {
  const [title, setTitle] = useState("");
  const [p, setP] = useState<GardenPhase>("Plan");
  useEffect(() => { if (phase) { setP(phase === "Let go" ? "Plan" : phase); setTitle(""); } }, [phase]);
  const open = !!phase && phase !== "Let go";
  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="project-garden">
        <DialogHeader><DialogTitle className="pg-display text-2xl">{PHASE[p].add}</DialogTitle></DialogHeader>
        <form onSubmit={async e => { e.preventDefault(); if (!title.trim()) return; await onCreate(p, title.trim()); setTitle(""); onClose(); }} className="space-y-3">
          <Textarea autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder={PHASE[p].empty} aria-label="Task title" rows={2} className="min-h-11 resize-none whitespace-pre-wrap break-words [field-sizing:content]" />
          <div role="radiogroup" aria-label="Phase" className="flex flex-wrap gap-2">
            {(["Plan", "Grow", "Care"] as GardenPhase[]).map(x => (
              <button type="button" key={x} role="radio" aria-checked={p === x} onClick={() => setP(x)}
                className={cn("min-h-10 rounded-full border px-4 text-sm", focus, p === x ? "border-primary bg-primary text-primary-foreground" : "border-border")}>{x}</button>
            ))}
          </div>
          <DialogFooter><Button type="submit" className="h-11">Add</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function LetGoDialog({ open, title, onClose, onConfirm }: { open: boolean; title?: string; onClose: () => void; onConfirm: (p: LetGoPick, newTitle?: string) => Promise<void>}) {
  const [kind, setKind] = useState<LetGoKind>("released");
  const [reason, setReason] = useState("");
  const [review, setReview] = useState("");
  const [newTitle, setNewTitle] = useState("");
  useEffect(() => { if (open) { setKind("released"); setReason(""); setReview(""); setNewTitle(""); } }, [open]);
  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="project-garden">
        <DialogHeader><DialogTitle className="pg-display text-2xl">Set something down</DialogTitle></DialogHeader>
        <form className="space-y-3" onSubmit={async e => { e.preventDefault(); if (!title && !newTitle.trim()) return; await onConfirm({ kind, reason, reviewDate: review }, newTitle.trim() || undefined); }}>
          {title ? <p className="text-[15px]">{title}</p>
            : <Textarea autoFocus value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="What can you set down?" aria-label="What to set down" rows={2} className="min-h-11 resize-none whitespace-pre-wrap break-words [field-sizing:content]" />}
          <div role="radiogroup" aria-label="Released or maybe later" className="grid grid-cols-2 gap-2">
            {([["released", "Released"], ["later", "Maybe later"]] as const).map(([k, l]) => (
              <button type="button" key={k} role="radio" aria-checked={kind === k} onClick={() => setKind(k)}
                className={cn("min-h-11 rounded-xl border text-sm font-medium", focus, kind === k ? "border-primary bg-primary text-primary-foreground" : "border-border")}>{l}</button>
            ))}
          </div>
          <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason (optional)" aria-label="Reason" className="h-11" />
          {kind === "later" && <div><label htmlFor="pg-review" className="text-sm text-muted-foreground">Review date (optional)</label>
            <Input id="pg-review" type="date" value={review} onChange={e => setReview(e.target.value)} className="h-11" /></div>}
          <DialogFooter><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" className="h-11">Set it down</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------------------- Supporting ---------------------------- */

function Supporting({ project }: { project: Project }) {
  const { linksFor } = useConnections();
  const count = linksFor("project", project.id).length;
  const row = cn(card, "flex min-h-14 w-full items-center gap-3 px-5 text-left", focus);
  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-3">
        <Collapsible>
          <CollapsibleTrigger className={cn(row, "group")}><FileText className="h-5 w-5" aria-hidden /><span className="pg-display flex-1 text-xl">Notes & ideas</span><ChevronDown className="h-5 w-5 transition-transform group-data-[state=open]:rotate-180" aria-hidden /></CollapsibleTrigger>
          <CollapsibleContent className={cn(card, "mt-2 p-4")}><LinkedNotesPanel entityType="project" entityId={project.id} contextTitle={project.name} /></CollapsibleContent>
        </Collapsible>
        <Collapsible>
          <CollapsibleTrigger className={cn(row, "group")}><Link2 className="h-5 w-5" aria-hidden /><span className="pg-display flex-1 text-xl">Connections · {count}</span><ChevronDown className="h-5 w-5 transition-transform group-data-[state=open]:rotate-180" aria-hidden /></CollapsibleTrigger>
          <CollapsibleContent className="mt-2"><ConnectionsPanel type="project" id={project.id} className="bg-card" /></CollapsibleContent>
        </Collapsible>
      </div>
      <div className="flex flex-wrap items-center gap-3 rounded-2xl p-5" style={{ background: "hsl(var(--pg-sage))" }}>
        <div className="min-w-0 flex-1 basis-56">
          <h3 className="pg-display flex items-center gap-2 text-xl"><Sparkles className="h-5 w-5" aria-hidden />Carey's gentle nudge</h3>
          <p className="mt-1 text-sm text-muted-foreground">Start with what matters most. One small step and a simpler version can be enough.</p>
        </div>
        <CareyButton label="Help me plan" contextType="project" contextId={project.id}
          className="h-11 rounded-xl bg-card"
          context={{ name: project.name, description: project.notes, why: project.details?.whyItMatters, enough: project.details?.enoughForNow }}
          actions={[
            { label: "Help me plan gently", prompt: `Help me plan this project gently. Suggest up to 3 small tasks sorted into Plan, Grow, Care, and one thing I could let go. I'll review before adding anything.\n\nProject: ${project.name}\nWhy it matters: ${project.details?.whyItMatters ?? ""}\nEnough for now: ${project.details?.enoughForNow ?? ""}` },
            { label: "What can I let go?", prompt: `What is one expectation I could simplify or set down in this project?\n\nProject: ${project.name}` },
          ]} />
      </div>
    </section>
  );
}
