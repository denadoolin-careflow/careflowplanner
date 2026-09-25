/**
 * Project workspace: Board & Lanes as the primary view, with quick toggles for
 * a milestone timeline, the compact list and project notes. Also hosts the
 * "Plan into day" drawer and Carey's "next steps" breakdown.
 */
import { useEffect, useMemo, useState } from "react";
import { addDays, format, parseISO, isBefore, startOfDay } from "date-fns";
import { Columns3, Flag, List, FileText, Plus, CalendarPlus, Sparkles, Loader2, Sun, Sunset, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ViewPills } from "@/components/layout/ViewPills";
import { ProjectKanbanBoard, ProjectKanbanGroupSelect, type ProjectKanbanGroup } from "@/components/tasks/ProjectKanbanBoard";
import ClassicProjectView from "@/components/projects/detail/ClassicProjectView";
import { MilestonesCard } from "@/components/projects/MilestonesCard";
import { LinkedNotesPanel } from "@/components/notes/LinkedNotesPanel";
import { ProjectJournalPanel } from "@/components/journal/ProjectJournalPanel";
import { BacklinksSection } from "@/components/common/BacklinksSection";
import { useStore } from "@/lib/store";
import { PROJECT_TEMPLATES, applyProjectTemplate, type ProjectTemplateKey } from "@/lib/project-templates";
import { aiInvoke } from "@/lib/ai-invoke";
import { haptics } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { DayPart, Project, Task } from "@/lib/types";

type View = "board" | "timeline" | "list" | "notes";

function usePersisted<T extends string>(key: string, initial: T): [T, (v: T) => void] {
  const [v, setV] = useState<T>(() => { try { return (localStorage.getItem(key) as T) || initial; } catch { return initial; } });
  useEffect(() => { try { localStorage.setItem(key, v); } catch { /* ignore */ } }, [key, v]);
  return [v, setV];
}

export function ProjectWorkspace({ project, card }: { project: Project; card: (children: React.ReactNode) => React.ReactNode }) {
  const { state } = useStore();
  const [view, setView] = usePersisted<View>(`careflow:project-view:${project.id}`, "board");
  const [group, setGroup] = usePersisted<ProjectKanbanGroup>(`careflow:project-group:${project.id}`, "section");
  const [planOpen, setPlanOpen] = useState(false);
  const [stepsOpen, setStepsOpen] = useState(false);

  const tasks = useMemo(
    () => state.tasks.filter(t => t.projectId === project.id && !t.parentTaskId),
    [state.tasks, project.id],
  );
  const sections = (state.projectSections ?? []).filter(s => s.projectId === project.id);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <ViewPills<View>
          ariaLabel="Project view"
          value={view}
          onChange={setView}
          items={[
            { value: "board", label: "Board", icon: Columns3 },
            { value: "timeline", label: "Timeline", icon: Flag },
            { value: "list", label: "List", icon: List },
            { value: "notes", label: "Notes", icon: FileText },
          ]}
        />
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" className="h-8 gap-1.5 rounded-full text-xs" onClick={() => setStepsOpen(true)}>
            <Sparkles className="h-3.5 w-3.5" /> Next steps
          </Button>
          <Button size="sm" className="h-8 gap-1.5 rounded-full text-xs" onClick={() => setPlanOpen(true)}>
            <CalendarPlus className="h-3.5 w-3.5" /> Plan into day
          </Button>
        </div>
      </div>

      {view === "board" && card(
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <ProjectKanbanGroupSelect value={group} onChange={setGroup} />
            {group === "section" && <AddLane projectId={project.id} count={sections.length} />}
            <span className="ml-auto text-[11px] text-muted-foreground">Drag cards between lanes</span>
          </div>
          {group === "section" && sections.length === 0
            ? <TemplatePicker project={project} />
            : <ProjectKanbanBoard tasks={tasks} projectId={project.id} group={group} />}
        </div>,
      )}

      {view === "timeline" && (
        <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          {card(<MilestoneTimeline project={project} tasks={tasks} />)}
          {card(<MilestonesCard project={project} />)}
        </div>
      )}

      {view === "list" && card(<ClassicProjectView embedded projectId={project.id} />)}

      {view === "notes" && (
        <div className="space-y-4">
          {card(<LinkedNotesPanel entityType="project" entityId={project.id} contextTitle={project.name} />)}
          <BacklinksSection entityType="project" entityId={project.id} />
          {card(<ProjectJournalPanel projectId={project.id} projectName={project.name} />)}
        </div>
      )}

      <DayPartDrawer open={planOpen} onOpenChange={setPlanOpen} project={project} tasks={tasks} />
      <NextStepsSheet open={stepsOpen} onOpenChange={setStepsOpen} project={project} />
    </div>
  );
}

/* ------------------------------ Lanes ------------------------------ */

function AddLane({ projectId, count }: { projectId: string; count: number }) {
  const { addSection } = useStore();
  const [name, setName] = useState("");
  const add = async () => {
    const n = name.trim();
    if (!n) return;
    await addSection({ projectId, name: n, sortOrder: count });
    setName("");
    haptics.tap?.();
  };
  return (
    <div className="flex items-center gap-1">
      <Input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") add(); }}
        placeholder="New lane…" className="h-8 w-36 text-xs" aria-label="New lane name" />
      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={add} aria-label="Add lane"><Plus className="h-4 w-4" /></Button>
    </div>
  );
}

export function TemplatePicker({ project }: { project: Project }) {
  const { addSection, addTask, updateProject } = useStore();
  const [busy, setBusy] = useState<ProjectTemplateKey | null>(null);
  const pick = async (key: ProjectTemplateKey) => {
    setBusy(key);
    try {
      await applyProjectTemplate(project, key, { addSection, addTask, updateProject });
      toast.success("Board ready");
    } catch (e: any) {
      toast.error("Couldn't apply template", { description: e?.message });
    } finally { setBusy(null); }
  };
  return (
    <div className="rounded-2xl border border-dashed border-border/60 bg-background/40 p-4">
      <p className="mb-3 text-sm font-medium">Start with a board shape</p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {PROJECT_TEMPLATES.map(t => (
          <button key={t.key} type="button" disabled={!!busy} onClick={() => pick(t.key)}
            className="flex min-h-24 flex-col items-start gap-1 rounded-xl border border-border/60 bg-card p-3 text-left transition hover:border-primary/50 hover:bg-primary/5 disabled:opacity-60">
            <span className="text-lg" aria-hidden>{busy === t.key ? "⏳" : t.emoji}</span>
            <span className="text-sm font-medium">{t.label}</span>
            <span className="text-[11px] leading-snug text-muted-foreground">{t.lanes.map(l => l.name).join(" → ")}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------ Timeline ------------------------------ */

function MilestoneTimeline({ project, tasks }: { project: Project; tasks: Task[] }) {
  const today = startOfDay(new Date());
  const entries = useMemo(() => {
    const ms = (project.milestones ?? []).filter(m => m.date).map(m => ({ kind: "milestone" as const, id: m.id, title: m.title, date: m.date!, done: m.done }));
    const ts = tasks.filter(t => t.dueDate).map(t => ({ kind: "task" as const, id: t.id, title: t.title, date: t.dueDate!, done: t.done }));
    if (project.targetDate) ms.push({ kind: "milestone", id: "target", title: "Target date", date: project.targetDate, done: false });
    return [...ms, ...ts].sort((a, b) => a.date.localeCompare(b.date));
  }, [project, tasks]);

  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">Add dates to milestones or tasks to see them on the timeline.</p>;
  }
  let nowPlaced = false;
  return (
    <ol className="relative ml-2 space-y-3 border-l border-border/70 pl-5">
      {entries.map(e => {
        const d = parseISO(e.date);
        const showNow = !nowPlaced && !isBefore(d, today);
        if (showNow) nowPlaced = true;
        return (
          <li key={`${e.kind}-${e.id}`} className="relative">
            {showNow && <div className="mb-2 -ml-5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-primary"><span className="h-px w-4 bg-primary" />Today</div>}
            <span className={cn(
              "absolute -left-[27px] top-1 grid h-3.5 w-3.5 place-items-center rounded-full border-2 bg-background",
              e.kind === "milestone" ? "border-primary" : "border-muted-foreground/50",
              e.done && "bg-primary",
            )} />
            <div className={cn("flex items-baseline gap-2", e.done && "opacity-60")}>
              <span className="w-16 shrink-0 text-[11px] tabular-nums text-muted-foreground">{format(d, "MMM d")}</span>
              <span className={cn("text-sm", e.kind === "milestone" && "font-semibold", e.done && "line-through")}>
                {e.kind === "milestone" && "🚩 "}{e.title}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/* ------------------------------ Day-part drawer ------------------------------ */

const PARTS: { part: DayPart; icon: typeof Sun }[] = [
  { part: "Morning", icon: Sun }, { part: "Afternoon", icon: Sunset }, { part: "Evening", icon: Moon },
];

function DayPartDrawer({ open, onOpenChange, project, tasks }: { open: boolean; onOpenChange: (v: boolean) => void; project: Project; tasks: Task[] }) {
  const { updateTask } = useStore();
  const [dayOffset, setDayOffset] = useState(0);
  const base = startOfDay(new Date());
  const day = addDays(base, dayOffset);
  const dayISO = format(day, "yyyy-MM-dd");
  const open_ = tasks.filter(t => !t.done);
  const unplanned = open_.filter(t => !(t.dueDate === dayISO && t.dayPart));

  const assign = async (t: Task, part: DayPart) => {
    const prev = { dueDate: t.dueDate, dayPart: t.dayPart };
    await updateTask(t.id, { dueDate: dayISO, dayPart: part });
    haptics.snap?.();
    toast.success(`${t.title} → ${part}, ${format(day, "EEE MMM d")}`, {
      action: { label: "Undo", onClick: () => void updateTask(t.id, prev) },
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border/60 p-5">
          <SheetTitle className="flex items-center gap-2 text-base"><CalendarPlus className="h-4 w-4 text-primary" /> Plan into day</SheetTitle>
          <SheetDescription className="text-xs">Place {project.name} cards into a part of the day. They'll appear on your planner.</SheetDescription>
          <div className="flex gap-1 overflow-x-auto pt-2">
            {Array.from({ length: 7 }, (_, i) => addDays(base, i)).map((d, i) => (
              <button key={i} type="button" onClick={() => setDayOffset(i)}
                className={cn("min-h-[40px] shrink-0 rounded-xl border px-3 text-xs", i === dayOffset ? "border-primary bg-primary/10 text-primary" : "border-border/60 text-muted-foreground")}>
                <div className="font-medium">{i === 0 ? "Today" : i === 1 ? "Tmrw" : format(d, "EEE")}</div>
                <div className="text-[10px]">{format(d, "MMM d")}</div>
              </button>
            ))}
          </div>
        </SheetHeader>
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {PARTS.map(({ part, icon: Icon }) => {
            const inPart = open_.filter(t => t.dueDate === dayISO && t.dayPart === part);
            return (
              <section key={part}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { const id = e.dataTransfer.getData("application/x-careflow-task"); const t = open_.find(x => x.id === id); if (t) void assign(t, part); }}
                className="rounded-2xl border border-border/60 bg-muted/30 p-3">
                <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <Icon className="h-3.5 w-3.5" /> {part} <span className="rounded-full bg-background px-1.5 text-[10px] tabular-nums">{inPart.length}</span>
                </div>
                {inPart.length === 0 ? <p className="text-xs text-muted-foreground/80">Drop or tap a card below.</p> : (
                  <ul className="space-y-1">
                    {inPart.map(t => (
                      <li key={t.id} className="flex items-center justify-between rounded-lg bg-background px-2.5 py-1.5 text-sm">
                        <span className="truncate">{t.title}</span>
                        <button type="button" className="text-[11px] text-muted-foreground hover:text-foreground" onClick={() => updateTask(t.id, { dayPart: undefined })}>Remove</button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
          <section>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Cards to place · {unplanned.length}</div>
            {unplanned.length === 0 ? <p className="text-xs text-muted-foreground">Everything open is placed for this day. ✨</p> : (
              <ul className="space-y-2">
                {unplanned.map(t => (
                  <li key={t.id} draggable onDragStart={e => { e.dataTransfer.setData("application/x-careflow-task", t.id); e.dataTransfer.effectAllowed = "move"; }}
                    className="rounded-xl border border-border/60 bg-background p-2.5">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <span className="min-w-0 flex-1 truncate">{t.title}</span>
                      {t.estMinutes ? <span className="text-[10px] text-muted-foreground">{t.estMinutes}m</span> : null}
                      {t.energy && <span className="rounded-full bg-muted px-1.5 text-[10px] capitalize text-muted-foreground">{t.energy}</span>}
                    </div>
                    {t.dueDate && <div className="text-[11px] text-muted-foreground">Currently {format(parseISO(t.dueDate), "EEE MMM d")}{t.dayPart ? ` · ${t.dayPart}` : ""}</div>}
                    <div className="mt-2 flex gap-1">
                      {PARTS.map(({ part, icon: Icon }) => (
                        <Button key={part} size="sm" variant="outline" className="h-8 flex-1 gap-1 text-[11px]" onClick={() => assign(t, part)}>
                          <Icon className="h-3 w-3" /> {part}
                        </Button>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ------------------------------ Carey next steps ------------------------------ */

function NextStepsSheet({ open, onOpenChange, project }: { open: boolean; onOpenChange: (v: boolean) => void; project: Project }) {
  const { state, addTask } = useStore();
  const [loading, setLoading] = useState(false);
  const [steps, setSteps] = useState<{ title: string; on: boolean }[]>([]);
  const [lane, setLane] = useState<string>("");
  const sections = (state.projectSections ?? []).filter(s => s.projectId === project.id).sort((a, b) => a.sortOrder - b.sortOrder);

  const generate = async () => {
    setLoading(true);
    try {
      const existing = state.tasks.filter(t => t.projectId === project.id && !t.done).map(t => t.title).slice(0, 15);
      const { data, error } = await aiInvoke("ai-subtasks", {
        body: {
          title: `Next steps for project: ${project.name}`,
          notes: [project.notes, project.focusThisWeek && `Focus this week: ${project.focusThisWeek}`, existing.length && `Already planned: ${existing.join("; ")}`].filter(Boolean).join("\n"),
          area: project.areaName, count: 5,
        },
      });
      if (error) throw error;
      const list: string[] = Array.isArray((data as any)?.subtasks) ? (data as any).subtasks : [];
      if (!list.length) toast.error("Carey couldn't find steps this time");
      setSteps(list.map(title => ({ title, on: true })));
    } catch (e: any) {
      toast.error("Carey couldn't break this down", { description: e?.error ?? e?.message ?? "Please try again in a minute." });
    } finally { setLoading(false); }
  };

  useEffect(() => { if (open && steps.length === 0 && !loading) void generate(); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const addChosen = async () => {
    const chosen = steps.filter(s => s.on);
    for (const s of chosen) await addTask({ title: s.title, projectId: project.id, sectionId: lane || sections[0]?.id, area: project.areaName as any });
    toast.success(`Added ${chosen.length} next steps`);
    setSteps([]);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-4 sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4 text-primary" /> Carey's next steps</SheetTitle>
          <SheetDescription className="text-xs">Small, doable steps for {project.name}. Keep the ones that feel right.</SheetDescription>
        </SheetHeader>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Thinking gently…</div>
        ) : (
          <ul className="space-y-2">
            {steps.map((s, i) => (
              <li key={i} className="flex items-center gap-2 rounded-xl border border-border/60 bg-background p-2">
                <Checkbox checked={s.on} onCheckedChange={v => setSteps(p => p.map((x, j) => j === i ? { ...x, on: !!v } : x))} />
                <Input value={s.title} onChange={e => setSteps(p => p.map((x, j) => j === i ? { ...x, title: e.target.value } : x))} className="h-8 border-0 bg-transparent text-sm focus-visible:ring-0" />
              </li>
            ))}
          </ul>
        )}
        {sections.length > 0 && (
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Add to lane
            <select value={lane} onChange={e => setLane(e.target.value)} className="h-8 flex-1 rounded-md border border-border/60 bg-background px-2 text-xs text-foreground">
              {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
        )}
        <div className="mt-auto flex gap-2">
          <Button variant="outline" className="flex-1" onClick={generate} disabled={loading}>Try again</Button>
          <Button className="flex-1" onClick={addChosen} disabled={loading || !steps.some(s => s.on)}>Add to board</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
