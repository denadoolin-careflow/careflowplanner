import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useStore } from "@/lib/store";
import { TaskRow } from "@/components/cards/TaskRow";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, FolderOpen, Plus, Trash2, GripVertical, ChevronRight, LayoutList, Columns, CalendarDays, Star, Sparkles, RefreshCw, Target, Repeat, X, FileText } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { LinkedNotesPanel } from "@/components/notes/LinkedNotesPanel";
import { ProjectJournalPanel } from "@/components/journal/ProjectJournalPanel";
import { ProjectProgressTimeline } from "@/components/projects/ProjectProgressTimeline";
import { listWhiteboardsForProject, createWhiteboard, type Whiteboard } from "@/lib/whiteboards";
import { PenLine } from "lucide-react";
import { TaskListControls, useTaskListPrefs } from "@/components/tasks/TaskListControls";
import { applyFilters, groupTasks, sortTasks } from "@/lib/task-grouping";
import { ProjectKanbanBoard, ProjectKanbanGroupSelect, type ProjectKanbanGroup } from "@/components/tasks/ProjectKanbanBoard";
import { ViewOptionsMenu } from "@/components/tasks/ViewOptionsMenu";
import type { TaskViewType } from "@/hooks/useViewPrefs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/types";
import {
  DndContext, PointerSensor, useSensor, useSensors, closestCenter,
  type DragEndEvent, type DragStartEvent, type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { format, parseISO } from "date-fns";
import { useEntityNotes, linkNote } from "@/lib/note-links";
import { createNote } from "@/lib/notes";
import { NotePicker } from "@/components/notes/NotePicker";
import { NoteMarkdown } from "@/components/notes/NoteMarkdown";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { haptics } from "@/lib/haptics";

type ViewMode = "list" | "kanban" | "schedule";
const NO_SECTION = "__no_section__";

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const {
    state, addTask, updateTask, updateProject, deleteProject,
    addSection, updateSection, deleteSection, reorderSections,
  } = useStore();
  const project = (state.projects ?? []).find(p => p.id === id);
  const [view, setView] = useState<ViewMode>("list");
  const [prefs, setPrefs] = useTaskListPrefs(`project:${id}`);
  const [taskFilter, setTaskFilter] = useState<"all" | "active" | "completed">("active");
  const [kanbanGroup, setKanbanGroup] = useState<ProjectKanbanGroup>(() => {
    try { return (localStorage.getItem(`project:${id}:kanbanGroup`) as ProjectKanbanGroup) || "section"; }
    catch { return "section"; }
  });
  const setKanbanGroupPersist = (g: ProjectKanbanGroup) => {
    setKanbanGroup(g);
    try { localStorage.setItem(`project:${id}:kanbanGroup`, g); } catch {}
  };

  const allTasks = useMemo(
    () => state.tasks.filter(t => t.projectId === id && !t.parentTaskId),
    [state.tasks, id],
  );
  const total = allTasks.length;
  const done = allTasks.filter(t => t.done).length;
  const activeCount = total - done;
  const pct = total ? Math.round((done / total) * 100) : 0;

  const visibleTasks = useMemo(() => {
    if (taskFilter === "active") return allTasks.filter(t => !t.done);
    if (taskFilter === "completed") return allTasks.filter(t => t.done);
    return allTasks;
  }, [allTasks, taskFilter]);

  const sections = useMemo(
    () => (state.projectSections ?? [])
      .filter(s => s.projectId === id)
      .sort((a, b) => a.sortOrder - b.sortOrder),
    [state.projectSections, id],
  );

  const [newTitle, setNewTitle] = useState("");

  if (!project) {
    return (
      <div className="mx-auto max-w-3xl p-8 text-center text-sm text-muted-foreground">
        Project not found. <Link to="/projects" className="text-primary underline">Back to Projects</Link>
      </div>
    );
  }

  const handleAddSection = async () => {
    const sec = await addSection({ projectId: project.id, name: "New section" });
    if (sec) toast.success("Section added");
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 md:p-6">
      <Link to="/projects" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> All projects
      </Link>

      <header className="rounded-2xl border border-border/60 bg-gradient-to-br from-card to-card/40 p-5 space-y-3">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/15 text-primary">
            <FolderOpen className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <Input
              value={project.name}
              onChange={(e) => updateProject(project.id, { name: e.target.value })}
              className="border-0 bg-transparent px-0 text-2xl font-semibold focus-visible:ring-0"
            />
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{project.areaName ?? "No area"}</span>
              <span>·</span>
              <span>{done}/{total} done</span>
              <span>·</span>
              <span>{sections.length} section{sections.length === 1 ? "" : "s"}</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label={project.isFavorite ? "Unfavorite" : "Favorite"}
            onClick={() => { updateProject(project.id, { isFavorite: !project.isFavorite }); haptics.tap(); }}
            className={cn(project.isFavorite ? "text-amber-400" : "text-muted-foreground")}
          >
            <Star className={cn("h-4 w-4", project.isFavorite && "fill-current")} />
          </Button>
          <Select value={project.status} onValueChange={(v) => updateProject(project.id, { status: v as any })}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["active","paused","someday","done"].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" onClick={async () => { await deleteProject(project.id); toast.success("Project removed"); history.back(); }}>
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
        <Progress value={pct} className="h-1.5" />
        <Textarea
          value={project.notes ?? ""}
          placeholder="Notes about this project…"
          onChange={(e) => updateProject(project.id, { notes: e.target.value })}
          className="resize-none border-0 bg-transparent text-sm focus-visible:ring-0"
          rows={2}
        />
      </header>

      <GoalsHabitsStrip project={project} />
      <AIOverviewCard project={project} />
      <NotesGallery project={project} />

      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <ToggleGroup
          type="single"
          value={view}
          onValueChange={(v) => v && setView(v as ViewMode)}
          className="rounded-lg border border-border/60 bg-card/40 p-0.5"
        >
          <ToggleGroupItem value="list" className="h-8 gap-1.5 px-3 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
            <LayoutList className="h-3.5 w-3.5" /> List
          </ToggleGroupItem>
          <ToggleGroupItem value="kanban" className="h-8 gap-1.5 px-3 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
            <Columns className="h-3.5 w-3.5" /> Kanban
          </ToggleGroupItem>
          <ToggleGroupItem value="schedule" className="h-8 gap-1.5 px-3 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
            <CalendarDays className="h-3.5 w-3.5" /> Schedule
          </ToggleGroupItem>
        </ToggleGroup>
        <div className="flex flex-wrap items-center gap-2">
          <ToggleGroup
            type="single"
            value={taskFilter}
            onValueChange={(v) => v && setTaskFilter(v as "all" | "active" | "completed")}
            className="rounded-lg border border-border/60 bg-card/40 p-0.5"
          >
            <ToggleGroupItem value="active" className="h-8 px-3 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
              Active <span className="ml-1 opacity-70">{activeCount}</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="completed" className="h-8 px-3 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
              Done <span className="ml-1 opacity-70">{done}</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="all" className="h-8 px-3 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
              All <span className="ml-1 opacity-70">{total}</span>
            </ToggleGroupItem>
          </ToggleGroup>
          {view === "list" && <TaskListControls prefs={prefs} onChange={setPrefs} />}
          {view === "kanban" && <ProjectKanbanGroupSelect value={kanbanGroup} onChange={setKanbanGroupPersist} />}
          <ViewOptionsMenu view={(view === "kanban" ? "board" : view) as TaskViewType} />
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card/60 p-3 space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="Add a task to this project…"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={async (e) => {
              if (e.key === "Enter" && newTitle.trim()) {
                await addTask({ title: newTitle.trim(), area: (project.areaName as any) ?? "Personal", projectId: project.id });
                setNewTitle("");
              }
            }}
          />
          <Button
            onClick={async () => {
              if (!newTitle.trim()) return;
              await addTask({ title: newTitle.trim(), area: (project.areaName as any) ?? "Personal", projectId: project.id });
              setNewTitle("");
            }}
          >
            <Plus className="h-4 w-4" />
          </Button>
          {view === "list" && (
            <Button variant="outline" onClick={handleAddSection} className="gap-1.5">
              <Plus className="h-4 w-4" /> Section
            </Button>
          )}
        </div>

        {view === "kanban" && (
          <ProjectKanbanBoard tasks={visibleTasks} projectId={project.id} group={kanbanGroup} />
        )}
        {view === "schedule" && <ScheduleView tasks={visibleTasks} />}
        {view === "list" && (
          <ProjectListView
            projectId={project.id}
            tasks={visibleTasks}
            sections={sections}
            prefs={prefs}
            updateTask={updateTask}
            updateSection={updateSection}
            deleteSection={deleteSection}
            reorderSections={(ids) => reorderSections(project.id, ids)}
            addTaskToSection={async (sectionId, title) => {
              await addTask({
                title,
                area: (project.areaName as any) ?? "Personal",
                projectId: project.id,
                sectionId: sectionId === NO_SECTION ? undefined : sectionId,
              });
            }}
          />
        )}
      </div>

      {/* notes-as-gallery is rendered above; keep this for compact linked-notes management */}
      <LinkedNotesPanel entityType="project" entityId={project.id} contextTitle={project.name} compact />
      <ProjectProgressTimeline projectId={project.id} />
      <ProjectJournalPanel projectId={project.id} projectName={project.name} />
      <WhiteboardsPanel projectId={project.id} projectName={project.name} />
    </div>
  );
}

/* ---------------- Linked whiteboards ---------------- */
function WhiteboardsPanel({ projectId, projectName }: { projectId: string; projectName: string }) {
  const navigate = useNavigate();
  const [boards, setBoards] = useState<Whiteboard[] | null>(null);
  const refresh = () => listWhiteboardsForProject(projectId).then(setBoards).catch(() => setBoards([]));
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [projectId]);
  const create = async () => {
    const b = await createWhiteboard({ title: `${projectName} board`, projectId });
    navigate(`/whiteboards/${b.id}`);
  };
  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <PenLine className="h-3.5 w-3.5 text-primary" /> Whiteboards
        </div>
        <Button size="sm" variant="ghost" onClick={create} className="h-7 gap-1 text-xs">
          <Plus className="h-3 w-3" /> New board
        </Button>
      </div>
      {boards == null ? (
        <div className="text-xs text-muted-foreground">Loading…</div>
      ) : boards.length === 0 ? (
        <div className="text-xs text-muted-foreground">No boards linked to this project yet.</div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {boards.map(b => (
            <Link key={b.id} to={`/whiteboards/${b.id}`} className="rounded-xl border border-border/60 bg-background/60 p-3 transition hover:border-primary/40">
              <div className="truncate text-sm font-medium">{b.title}</div>
              <div className="text-[11px] text-muted-foreground">
                {b.data.nodes.length} note{b.data.nodes.length === 1 ? "" : "s"} · {b.data.edges.length} link{b.data.edges.length === 1 ? "" : "s"}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- Goals & Habits chip strip ---------------- */

function GoalsHabitsStrip({ project }: { project: any }) {
  const { state, updateProject } = useStore();
  const navigate = useNavigate();
  const goalIds: string[] = project.linkedGoalIds ?? [];
  const habitIds: string[] = project.linkedHabitIds ?? [];
  const goals = (state.goals ?? []).filter(g => goalIds.includes(g.id));
  const habits = (state.habits ?? []).filter(h => habitIds.includes(h.id));

  const toggleGoal = (gid: string) => {
    const next = goalIds.includes(gid) ? goalIds.filter(x => x !== gid) : [...goalIds, gid];
    updateProject(project.id, { linkedGoalIds: next });
    haptics.tap();
  };
  const toggleHabit = (hid: string) => {
    const next = habitIds.includes(hid) ? habitIds.filter(x => x !== hid) : [...habitIds, hid];
    updateProject(project.id, { linkedHabitIds: next });
    haptics.tap();
  };

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <ChipRow
        icon={<Target className="h-3.5 w-3.5" />}
        label="Goals"
        chips={goals.map(g => ({ id: g.id, label: g.title, onClick: () => navigate("/goals"), onRemove: () => toggleGoal(g.id) }))}
        picker={
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 gap-1 rounded-full text-xs"><Plus className="h-3 w-3" /> Link goal</Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-2">
              <div className="max-h-64 space-y-1 overflow-y-auto">
                {(state.goals ?? []).length === 0 && <div className="p-2 text-xs text-muted-foreground">No goals yet.</div>}
                {(state.goals ?? []).map(g => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => toggleGoal(g.id)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-muted",
                      goalIds.includes(g.id) && "bg-primary/10",
                    )}
                  >
                    <span className="truncate">{g.title}</span>
                    {goalIds.includes(g.id) && <span className="text-[10px] text-primary">linked</span>}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        }
      />
      <ChipRow
        icon={<Repeat className="h-3.5 w-3.5" />}
        label="Habits"
        chips={habits.map(h => ({ id: h.id, label: h.title, onClick: () => navigate("/habits"), onRemove: () => toggleHabit(h.id) }))}
        picker={
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 gap-1 rounded-full text-xs"><Plus className="h-3 w-3" /> Link habit</Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-2">
              <div className="max-h-64 space-y-1 overflow-y-auto">
                {(state.habits ?? []).length === 0 && <div className="p-2 text-xs text-muted-foreground">No habits yet.</div>}
                {(state.habits ?? []).map(h => (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => toggleHabit(h.id)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-muted",
                      habitIds.includes(h.id) && "bg-primary/10",
                    )}
                  >
                    <span className="truncate">{h.title}</span>
                    {habitIds.includes(h.id) && <span className="text-[10px] text-primary">linked</span>}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        }
      />
    </div>
  );
}

function ChipRow({
  icon, label, chips, picker,
}: {
  icon: React.ReactNode;
  label: string;
  chips: { id: string; label: string; onClick: () => void; onRemove: () => void }[];
  picker: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 p-3">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {icon} {label}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {chips.length === 0 && <span className="text-xs text-muted-foreground/70">Nothing linked yet</span>}
        {chips.map(c => (
          <span key={c.id} className="group inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/60 px-2 py-0.5 text-xs">
            <button type="button" onClick={c.onClick} className="truncate max-w-[12rem]">{c.label}</button>
            <button type="button" onClick={c.onRemove} className="opacity-50 hover:opacity-100" aria-label="Unlink">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        {picker}
      </div>
    </div>
  );
}

/* ---------------- AI overview card ---------------- */

function AIOverviewCard({ project }: { project: any }) {
  const { updateProject } = useStore();
  const [busy, setBusy] = useState<"overview" | "update" | null>(null);

  const run = async (mode: "overview" | "update") => {
    setBusy(mode);
    try {
      const { data, error } = await supabase.functions.invoke("ai-project-overview", {
        body: { project_id: project.id, mode },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.overview) {
        updateProject(project.id, { aiOverview: data.overview, aiOverviewUpdatedAt: data.updated_at });
        haptics.success();
        toast.success(mode === "update" ? "Status update added" : "Overview generated");
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Could not generate. Try again.");
    } finally {
      setBusy(null);
    }
  };

  const hasOverview = !!project.aiOverview;

  return (
    <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-primary/5 to-accent/5 p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" /> AI Overview
          {project.aiOverviewUpdatedAt && (
            <span className="ml-1 text-[10px] normal-case tracking-normal text-muted-foreground/70">
              · {format(parseISO(project.aiOverviewUpdatedAt), "MMM d, h:mm a")}
            </span>
          )}
        </div>
        <div className="flex gap-1.5">
          <Button
            variant="outline" size="sm" className="h-7 gap-1 rounded-full text-xs"
            disabled={busy !== null}
            onClick={() => run("overview")}
          >
            <Sparkles className="h-3 w-3" /> {busy === "overview" ? "Generating…" : hasOverview ? "Regenerate" : "Generate overview"}
          </Button>
          {hasOverview && (
            <Button
              variant="outline" size="sm" className="h-7 gap-1 rounded-full text-xs"
              disabled={busy !== null}
              onClick={() => run("update")}
            >
              <RefreshCw className={cn("h-3 w-3", busy === "update" && "animate-spin")} /> {busy === "update" ? "Updating…" : "Add update"}
            </Button>
          )}
        </div>
      </div>
      {hasOverview ? (
        <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
          <NoteMarkdown body={project.aiOverview} />
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Generate a gentle, AI-written overview of this project — what it's about, what's progressing, and what's next.
        </p>
      )}
    </div>
  );
}

/* ---------------- Notes gallery (markdown cards) ---------------- */

function NotesGallery({ project }: { project: any }) {
  const navigate = useNavigate();
  const { notes, reload } = useEntityNotes("project", project.id);

  const createAndOpen = async () => {
    try {
      const n = await createNote({ title: project.name });
      await linkNote(n.id, "project", project.id);
      await reload();
      navigate(`/notes/${n.id}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not create note");
    }
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 p-3">
      <div className="mb-2 flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <FileText className="h-3.5 w-3.5" /> Notes
          {notes.length > 0 && <span className="rounded-full bg-muted px-1.5 py-0 text-[10px] normal-case tracking-normal">{notes.length}</span>}
        </div>
        <NotePicker
          excludeIds={notes.map(n => n.id)}
          onPick={async (n) => { await linkNote(n.id, "project", project.id); await reload(); }}
          onCreateNew={createAndOpen}
        />
      </div>

      {notes.length === 0 ? (
        <button
          type="button"
          onClick={createAndOpen}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border/60 px-4 py-8 text-sm text-muted-foreground hover:bg-muted/30"
        >
          <Plus className="h-4 w-4" /> Add the first note
        </button>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {notes.map(n => (
            <button
              key={n.id}
              type="button"
              onClick={() => navigate(`/notes/${n.id}`)}
              className="group flex h-44 flex-col gap-1 overflow-hidden rounded-xl border border-border/60 bg-background/60 p-3 text-left transition-all hover:border-primary/40 hover:shadow-md"
            >
              <div className="truncate text-sm font-semibold">{n.title || "Untitled"}</div>
              <div className="prose prose-xs dark:prose-invert flex-1 overflow-hidden text-[11px] leading-snug text-muted-foreground">
                <NoteMarkdown body={(n.body ?? "").slice(0, 400)} />
              </div>
            </button>
          ))}
          <button
            type="button"
            onClick={createAndOpen}
            className="flex h-44 items-center justify-center gap-2 rounded-xl border border-dashed border-border/60 text-sm text-muted-foreground hover:bg-muted/30"
          >
            <Plus className="h-4 w-4" /> New note
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------------- List view with sections + DnD ---------------- */

type Section = { id: string; name: string; color?: string; sortOrder: number; projectId: string; createdAt: string };

function ProjectListView({
  projectId, tasks, sections, prefs, updateTask, updateSection, deleteSection, reorderSections, addTaskToSection,
}: {
  projectId: string;
  tasks: Task[];
  sections: Section[];
  prefs: ReturnType<typeof useTaskListPrefs>[0];
  updateTask: (id: string, p: Partial<Task>) => Promise<void>;
  updateSection: (id: string, p: Partial<Section>) => Promise<void>;
  deleteSection: (id: string) => Promise<void>;
  reorderSections: (ids: string[]) => Promise<void>;
  addTaskToSection: (sectionId: string, title: string) => Promise<void>;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  // Filter + sort tasks once.
  const filtered = useMemo(() => sortTasks(applyFilters(tasks, prefs.filter), prefs.sort, prefs.sortDir), [tasks, prefs]);

  // If grouping isn't "none" or "project", show grouped buckets instead of sections.
  const useSectionLayout = prefs.group === "none" || prefs.group === "project";

  if (!useSectionLayout) {
    const groups = groupTasks(filtered, prefs.group, []);
    return (
      <div className="space-y-4">
        {groups.map(g => (
          <section key={g.key}>
            {g.label && (
              <div className="mb-1.5 flex items-center gap-2 px-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{g.label}</span>
                <span className="text-[10px] text-muted-foreground/70">{g.tasks.length}</span>
              </div>
            )}
            <div className="space-y-1">
              {g.tasks.map(t => <TaskRow key={t.id} task={t} showArea={false} />)}
            </div>
          </section>
        ))}
        {filtered.length === 0 && <EmptyState />}
      </div>
    );
  }

  // Section layout: include a "No section" bucket at top.
  const sectionList: Section[] = [
    { id: NO_SECTION, name: "No section", color: undefined, sortOrder: -1, projectId, createdAt: "" },
    ...sections,
  ];

  const tasksBySection = new Map<string, Task[]>();
  for (const s of sectionList) tasksBySection.set(s.id, []);
  for (const t of filtered) {
    const key = t.sectionId && tasksBySection.has(t.sectionId) ? t.sectionId : NO_SECTION;
    tasksBySection.get(key)!.push(t);
  }

  const handleDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over) return;
    const aid = String(active.id);
    const oid = String(over.id);

    // Section reorder
    if (aid.startsWith("section:") && oid.startsWith("section:")) {
      const ids = sections.map(s => s.id);
      const from = ids.indexOf(aid.slice(8));
      const to = ids.indexOf(oid.slice(8));
      if (from < 0 || to < 0 || from === to) return;
      const next = arrayMove(ids, from, to);
      await reorderSections(next);
      return;
    }

    // Task move: target can be another task or a section drop-zone.
    if (aid.startsWith("task:")) {
      const taskId = aid.slice(5);
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;
      let targetSection: string = task.sectionId ?? NO_SECTION;
      if (oid.startsWith("section-drop:")) targetSection = oid.slice(13);
      else if (oid.startsWith("task:")) {
        const overTask = tasks.find(t => t.id === oid.slice(5));
        if (overTask) targetSection = overTask.sectionId ?? NO_SECTION;
      }
      const nextSectionId = targetSection === NO_SECTION ? undefined : targetSection;
      if (nextSectionId !== task.sectionId) {
        await updateTask(task.id, { sectionId: nextSectionId });
      }
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext
        items={sections.map(s => `section:${s.id}`)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-4">
          {sectionList.map(s => {
            const items = tasksBySection.get(s.id) ?? [];
            const isCollapsed = collapsed.has(s.id);
            return (
              <SectionBlock
                key={s.id}
                section={s}
                items={items}
                collapsed={isCollapsed}
                onToggle={() => setCollapsed(prev => {
                  const n = new Set(prev);
                  n.has(s.id) ? n.delete(s.id) : n.add(s.id);
                  return n;
                })}
                onRename={(name) => updateSection(s.id, { name })}
                onDelete={s.id === NO_SECTION ? undefined : async () => {
                  if (!confirm(`Delete section "${s.name}"? Tasks inside will move to No section.`)) return;
                  await deleteSection(s.id);
                  toast.success("Section deleted");
                }}
                onAdd={(title) => addTaskToSection(s.id, title)}
              />
            );
          })}
          {filtered.length === 0 && sections.length === 0 && <EmptyState />}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SectionBlock({
  section, items, collapsed, onToggle, onRename, onDelete, onAdd,
}: {
  section: Section;
  items: Task[];
  collapsed: boolean;
  onToggle: () => void;
  onRename: (name: string) => void;
  onDelete?: () => void;
  onAdd: (title: string) => Promise<void>;
}) {
  const isPlaceholder = section.id === NO_SECTION;
  const sortable = useSortable({ id: `section:${section.id}`, disabled: isPlaceholder });
  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
  };
  const [draft, setDraft] = useState("");
  const [name, setName] = useState(section.name);
  // Section drop zone id used so dropping into an empty section moves the task here.
  const dropId = `section-drop:${section.id}`;

  return (
    <section
      ref={sortable.setNodeRef}
      style={style}
      className={cn(
        "rounded-xl border border-border/40 bg-background/40 p-2",
        sortable.isDragging && "opacity-60 ring-2 ring-primary/40",
      )}
    >
      <div className="flex items-center gap-1.5 px-1 py-1">
        {!isPlaceholder && (
          <button
            {...sortable.attributes}
            {...sortable.listeners}
            className="cursor-grab touch-none rounded p-0.5 text-muted-foreground/60 hover:text-foreground active:cursor-grabbing"
            aria-label="Drag section"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={onToggle}
          className="grid h-5 w-5 place-items-center rounded text-muted-foreground hover:text-foreground"
          aria-label={collapsed ? "Expand" : "Collapse"}
        >
          <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", !collapsed && "rotate-90")} />
        </button>
        {isPlaceholder ? (
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{section.name}</span>
        ) : (
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => name.trim() && name !== section.name && onRename(name.trim())}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") { setName(section.name); e.currentTarget.blur(); }
            }}
            className="flex-1 rounded bg-transparent px-1 text-sm font-medium outline-none focus:bg-muted/40"
          />
        )}
        <span className="text-[10px] text-muted-foreground/70">{items.length}</span>
        {onDelete && (
          <Button variant="ghost" size="icon" className="h-6 w-6 opacity-50 hover:opacity-100" onClick={onDelete} aria-label="Delete section">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {!collapsed && (
        <SortableContext items={items.map(t => `task:${t.id}`)} strategy={verticalListSortingStrategy}>
          <SectionDropZone id={dropId} empty={items.length === 0}>
            <div className="space-y-1">
              {items.map(t => <DraggableTask key={t.id} task={t} />)}
            </div>
          </SectionDropZone>
        </SortableContext>
      )}

      {!collapsed && (
        <div className="mt-1.5 flex gap-1 px-1">
          <Input
            placeholder={`Add to ${isPlaceholder ? "no section" : section.name}…`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={async (e) => {
              if (e.key === "Enter" && draft.trim()) {
                await onAdd(draft.trim());
                setDraft("");
              }
            }}
            className="h-8 text-xs"
          />
        </div>
      )}
    </section>
  );
}

function DraggableTask({ task }: { task: Task }) {
  const sortable = useSortable({ id: `task:${task.id}` });
  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
  };
  return (
    <div
      ref={sortable.setNodeRef}
      style={style}
      className={cn("flex items-start gap-1", sortable.isDragging && "opacity-50")}
    >
      <button
        {...sortable.attributes}
        {...sortable.listeners}
        className="mt-3 cursor-grab touch-none rounded p-0.5 text-muted-foreground/40 hover:text-muted-foreground active:cursor-grabbing"
        aria-label="Drag task"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <div className="min-w-0 flex-1">
        <TaskRow task={task} showArea={false} />
      </div>
    </div>
  );
}

function SectionDropZone({ id, empty, children }: { id: string; empty: boolean; children: React.ReactNode }) {
  // Use useSortable as a passive droppable target for the whole section, even
  // when empty, by registering an invisible sortable id.
  const sortable = useSortable({ id });
  return (
    <div
      ref={sortable.setNodeRef}
      className={cn(
        empty && "rounded-lg border border-dashed border-border/40 px-2 py-3 text-center text-[11px] text-muted-foreground",
        sortable.isOver && "ring-2 ring-primary/40 ring-inset",
      )}
    >
      {empty ? "Drop tasks here" : children}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="p-6 text-center text-sm text-muted-foreground">No tasks yet. Add one above.</div>
  );
}

/* ---------------- Schedule (grouped by due date) ---------------- */

function ScheduleView({ tasks }: { tasks: Task[] }) {
  const groups = useMemo(() => {
    const m = new Map<string, Task[]>();
    for (const t of tasks) {
      const key = t.dueDate ?? "_unscheduled";
      const arr = m.get(key) ?? [];
      arr.push(t);
      m.set(key, arr);
    }
    return Array.from(m.entries()).sort((a, b) => {
      if (a[0] === "_unscheduled") return 1;
      if (b[0] === "_unscheduled") return -1;
      return a[0].localeCompare(b[0]);
    });
  }, [tasks]);

  if (tasks.length === 0) return <EmptyState />;

  return (
    <div className="space-y-3">
      {groups.map(([key, items]) => (
        <section key={key}>
          <div className="mb-1.5 flex items-center gap-2 px-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {key === "_unscheduled" ? "Unscheduled" : format(parseISO(key), "EEE, MMM d")}
            </span>
            <span className="text-[10px] text-muted-foreground/70">{items.length}</span>
          </div>
          <div className="space-y-1">
            {items.map(t => <TaskRow key={t.id} task={t} showArea={false} />)}
          </div>
        </section>
      ))}
    </div>
  );
}