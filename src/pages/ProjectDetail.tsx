import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useStore } from "@/lib/store";
import { TaskRow } from "@/components/cards/TaskRow";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, FolderOpen, Plus, Trash2, GripVertical, ChevronRight, LayoutList, Columns, CalendarDays } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { LinkedNotesPanel } from "@/components/notes/LinkedNotesPanel";
import { TaskListControls, useTaskListPrefs } from "@/components/tasks/TaskListControls";
import { applyFilters, groupTasks, sortTasks } from "@/lib/task-grouping";
import { KanbanBoard } from "@/components/tasks/KanbanBoard";
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

  const allTasks = useMemo(
    () => state.tasks.filter(t => t.projectId === id && !t.parentTaskId),
    [state.tasks, id],
  );
  const total = allTasks.length;
  const done = allTasks.filter(t => t.done).length;
  const pct = total ? Math.round((done / total) * 100) : 0;

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
        {view === "list" && <TaskListControls prefs={prefs} onChange={setPrefs} />}
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

        {view === "kanban" && <KanbanBoard tasks={allTasks} scope="project" />}
        {view === "schedule" && <ScheduleView tasks={allTasks} />}
        {view === "list" && (
          <ProjectListView
            projectId={project.id}
            tasks={allTasks}
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

      <LinkedNotesPanel entityType="project" entityId={project.id} contextTitle={project.name} />
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
  const filtered = useMemo(() => sortTasks(applyFilters(tasks, prefs.filter), prefs.sort), [tasks, prefs]);

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