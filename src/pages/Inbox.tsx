import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { TaskRow } from "@/components/cards/TaskRow";
import { Inbox as InboxIcon, Sparkles, Check, X, RefreshCw, PanelRightOpen, PanelRightClose, Eye, EyeOff } from "lucide-react";
import { InlineTaskComposer } from "@/components/tasks/InlineTaskComposer";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Area, Priority, TaskStatus } from "@/lib/types";
import { UnscheduledTasksRail } from "@/components/calendar/UnscheduledTasksRail";
import { TaskListControls, useTaskListPrefs } from "@/components/tasks/TaskListControls";
import { applyFilters, sortTasks, groupTasks } from "@/lib/task-grouping";
import { TaskSelectionProvider, useTaskSelection } from "@/lib/task-selection";
import { BulkActionBar } from "@/components/tasks/BulkActionBar";
import { TaskDetailPane } from "@/components/tasks/TaskDetailPane";
import { useTags } from "@/hooks/use-tags";
import { TagChip } from "@/components/tags/TagChip";
import { Link } from "react-router-dom";
import { Tags as TagsIcon } from "lucide-react";

interface Suggestion {
  task_id: string;
  area?: string;
  project_id?: string | null;
  status?: TaskStatus;
  priority?: Priority;
  suggested_due_date?: string | null;
}

export default function Inbox() {
  return (
    <TaskSelectionProvider storageKey="inbox">
      <InboxInner />
      <BulkActionBar />
    </TaskSelectionProvider>
  );
}

function InboxInner() {
  const { state, updateTask } = useStore();
  const { paneOpen, togglePane, setOrderedIds, clear } = useTaskSelection();
  const [prefs, setPrefs] = useTaskListPrefs("inbox");
  const [triaging, setTriaging] = useState(false);
  const [suggestions, setSuggestions] = useState<Record<string, Suggestion>>({});
  const groups = useMemo(() => {
    const base = state.tasks.filter(t => t.inbox && !t.done && !t.parentTaskId && t.status !== "parked");
    const filtered = applyFilters(base, prefs.filter);
    const sorted = sortTasks(filtered, prefs.sort, prefs.sortDir);
    return groupTasks(sorted, prefs.group, state.projects ?? []);
  }, [state.tasks, state.projects, prefs]);
  const items = useMemo(() => groups.flatMap(g => g.tasks), [groups]);

  useEffect(() => { setOrderedIds(items.map(t => t.id)); }, [items, setOrderedIds]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") clear(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [clear]);

  const triage = async () => {
    if (items.length === 0) return;
    setTriaging(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-inbox-triage", { body: {} });
      if (error) throw error;
      const map: Record<string, Suggestion> = {};
      for (const s of (data as any)?.suggestions ?? []) {
        if (s?.task_id) map[s.task_id] = s as Suggestion;
      }
      setSuggestions(map);
      toast.success(`Triaged ${Object.keys(map).length} task${Object.keys(map).length === 1 ? "" : "s"}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Triage failed");
    } finally {
      setTriaging(false);
    }
  };

  const accept = async (taskId: string) => {
    const s = suggestions[taskId];
    if (!s) return;
    await updateTask(taskId, {
      area: (s.area as Area) ?? undefined,
      projectId: s.project_id ?? undefined,
      status: s.status ?? "active",
      priority: s.priority ?? "medium",
      dueDate: s.suggested_due_date ?? undefined,
      inbox: false,
    });
    setSuggestions(p => { const n = { ...p }; delete n[taskId]; return n; });
  };

  const dismiss = (taskId: string) =>
    setSuggestions(p => { const n = { ...p }; delete n[taskId]; return n; });

  const { tags } = useTags();
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [tagLibraryVisible, setTagLibraryVisible] = useState<boolean>(() => {
    try { return localStorage.getItem("inbox:tagLibrary") !== "0"; } catch { return true; }
  });
  const toggleTagLibrary = () => {
    setTagLibraryVisible(v => {
      const next = !v;
      try { localStorage.setItem("inbox:tagLibrary", next ? "1" : "0"); } catch {}
      return next;
    });
  };
  const filteredGroups = useMemo(() => {
    if (!tagFilter) return groups;
    return groups
      .map(g => ({ ...g, tasks: g.tasks.filter(t => (t.tags ?? []).some(n => n.toLowerCase() === tagFilter.toLowerCase())) }))
      .filter(g => g.tasks.length > 0);
  }, [groups, tagFilter]);

  return (
    <div className="flex gap-6">
      <div className="min-w-0 flex-1 mx-auto w-full max-w-3xl space-y-4 p-4 md:p-6">
      <header className="flex flex-wrap items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
          <InboxIcon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">Inbox</h1>
          <p className="truncate text-xs text-muted-foreground sm:text-sm">
            Capture now, organize later. {items.length} waiting.
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={triage}
            disabled={triaging || items.length === 0}
            className="gap-1.5"
          >
            {triaging ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Smart triage
          </Button>
          <TaskListControls prefs={prefs} onChange={setPrefs} />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={toggleTagLibrary}
            title={tagLibraryVisible ? "Hide tag library" : "Show tag library"}
            aria-label="Toggle tag library"
          >
            {tagLibraryVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="hidden h-8 w-8 lg:inline-flex"
            onClick={togglePane}
            title={paneOpen ? "Hide details pane" : "Show details pane"}
            aria-label="Toggle details pane"
          >
            {paneOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
          </Button>
        </div>
      </header>

      <InlineTaskComposer
        defaults={{ inbox: true }}
        defaultTags={tagFilter ? [tagFilter] : undefined}
        nlp
        placeholder="Capture anything — try “Call vet tomorrow at 3pm p2 #pet”"
      />

      {tags.length > 0 && tagLibraryVisible && (
        <div className="rounded-2xl border border-border/60 bg-card/40 p-2.5">
          <div className="mb-1.5 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
              <TagsIcon className="h-3 w-3" /> Tag library
            </div>
            <div className="flex items-center gap-2">
              {tagFilter && (
                <button
                  onClick={() => setTagFilter(null)}
                  className="text-[11px] text-muted-foreground hover:text-foreground"
                >Clear</button>
              )}
              <Link to="/tags" className="text-[11px] text-muted-foreground hover:text-foreground">Manage →</Link>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {tags.map(t => {
              const active = tagFilter?.toLowerCase() === t.name.toLowerCase();
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTagFilter(active ? null : t.name)}
                  className="transition-transform hover:-translate-y-px"
                  aria-pressed={active}
                >
                  <TagChip name={t.name} subtle={!active} size="sm" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border/60 bg-card/60 p-2">
        {filteredGroups.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Your inbox is clear ✨</div>
        ) : (
          <div className="space-y-3">
            {filteredGroups.map(g => (
              <div key={g.key} className="space-y-1">
                {prefs.group !== "none" && (
                  <div className="px-2 pt-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    {g.label} <span className="opacity-60">· {g.tasks.length}</span>
                  </div>
                )}
                {g.tasks.map(t => {
              const s = suggestions[t.id];
              const project = s?.project_id ? state.projects?.find(p => p.id === s.project_id) : undefined;
              return (
                <div key={t.id}>
                  <TaskRow task={t} />
                  {s && (
                    <div className="mx-2 mb-2 -mt-1 flex flex-wrap items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-1.5 text-[11px] animate-fade-in">
                      <Sparkles className="h-3 w-3 text-primary" />
                      <span className="text-muted-foreground">Suggest:</span>
                      {s.area && <span className="rounded-full bg-card px-1.5 py-0.5">{s.area}</span>}
                      {project && <span className="rounded-full bg-card px-1.5 py-0.5" style={project.color ? { color: project.color } : undefined}>{project.name}</span>}
                      {s.status && <span className="rounded-full bg-card px-1.5 py-0.5 capitalize">{s.status.replace("_"," ")}</span>}
                      {s.priority && <span className="rounded-full bg-card px-1.5 py-0.5 capitalize">{s.priority}</span>}
                      {s.suggested_due_date && <span className="rounded-full bg-card px-1.5 py-0.5">{s.suggested_due_date.slice(5)}</span>}
                      <div className="ml-auto flex items-center gap-1">
                        <button onClick={() => accept(t.id)} className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-primary-foreground hover:opacity-90">
                          <Check className="h-3 w-3" /> Apply
                        </button>
                        <button onClick={() => dismiss(t.id)} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-muted-foreground hover:text-foreground">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
      </div>
      {paneOpen && <TaskDetailPane />}
      <UnscheduledTasksRail />
    </div>
  );
}