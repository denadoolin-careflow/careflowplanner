import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { TaskRow } from "@/components/cards/TaskRow";
import { Inbox as InboxIcon, Sparkles, Check, X, RefreshCw, PanelRightOpen, PanelRightClose, Eye, EyeOff, CheckSquare, SlidersHorizontal } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { aiInvoke } from "@/lib/ai-invoke";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileCaptureCard } from "@/components/tasks/mobile/MobileCaptureCard";
import { MobileFilterChips, type InboxFilter } from "@/components/tasks/mobile/MobileFilterChips";
import { MobileTaskCard } from "@/components/tasks/mobile/MobileTaskCard";
import { Menu, Search as SearchIcon, Moon, Sun, ChevronDown } from "lucide-react";
import { useTheme } from "next-themes";
import { isToday, isFuture, isPast, parseISO } from "date-fns";

interface Suggestion {
  task_id: string;
  area?: string;
  project_id?: string | null;
  status?: TaskStatus;
  priority?: Priority;
  suggested_due_date?: string | null;
}

export default function Inbox() {
  const isMobile = useIsMobile();
  if (isMobile) return <MobileInbox />;
  return (
    <TaskSelectionProvider storageKey="inbox">
      <InboxInner />
      <BulkActionBar />
    </TaskSelectionProvider>
  );
}

function InboxInner() {
  const { state, updateTask } = useStore();
  const { paneOpen, togglePane, setOrderedIds, clear, selectionMode, toggleSelectionMode, selectAll, count } = useTaskSelection();
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
      const { data, error } = await aiInvoke("ai-inbox-triage", { body: {} });
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
  const [controlsVisible, setControlsVisible] = useState<boolean>(() => {
    try { return localStorage.getItem("inbox:controls") !== "0"; } catch { return true; }
  });
  const toggleControls = () => {
    setControlsVisible(v => {
      const next = !v;
      try { localStorage.setItem("inbox:controls", next ? "1" : "0"); } catch {}
      return next;
    });
  };
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
      <header className="flex items-center gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary sm:h-10 sm:w-10">
          <InboxIcon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold tracking-tight sm:text-2xl">Inbox</h1>
          <p className="truncate text-[11px] text-muted-foreground sm:text-sm">
            {items.length} waiting · capture now, organize later
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          {/* Mobile: icon-only essentials. Full labels return at sm+. */}
          <Button
            variant={selectionMode ? "default" : "ghost"}
            size="icon"
            onClick={toggleSelectionMode}
            className="h-9 w-9 sm:hidden"
            title={selectionMode ? "Exit select mode" : "Select multiple tasks"}
            aria-label="Select tasks"
          >
            <CheckSquare className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={triage}
            disabled={triaging || items.length === 0}
            className="h-9 w-9 sm:hidden"
            title="Smart triage"
            aria-label="Smart triage"
          >
            {triaging ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          </Button>
          <Button
            variant={controlsVisible ? "default" : "ghost"}
            size="icon"
            onClick={toggleControls}
            className="h-9 w-9 sm:hidden"
            title="Options"
            aria-label="Options"
            aria-pressed={controlsVisible}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>

          {/* Desktop / tablet — original full controls */}
          <div className="hidden flex-wrap items-center justify-end gap-2 sm:flex">
            <Button
              variant={selectionMode ? "default" : "outline"}
              size="sm"
              onClick={toggleSelectionMode}
              className="gap-1.5"
              title={selectionMode ? "Exit select mode" : "Select multiple tasks"}
            >
              <CheckSquare className="h-3.5 w-3.5" />
              {selectionMode ? "Done" : "Select"}
            </Button>
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
            <Button
              variant={controlsVisible ? "default" : "outline"}
              size="sm"
              onClick={toggleControls}
              className="gap-1.5"
              title={controlsVisible ? "Hide group / filter / sort" : "Show group / filter / sort"}
              aria-pressed={controlsVisible}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Options</span>
            </Button>
            {controlsVisible && <TaskListControls prefs={prefs} onChange={setPrefs} />}
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
        </div>
      </header>

      {/* On mobile, when Options is on, surface the group/filter/sort controls below the header */}
      {controlsVisible && (
        <div className="flex flex-wrap items-center gap-2 sm:hidden">
          <TaskListControls prefs={prefs} onChange={setPrefs} />
        </div>
      )}

      {selectionMode && (
        <div className="flex items-center justify-between rounded-xl border border-primary/40 bg-primary/5 px-3 py-2 text-xs">
          <span className="font-medium text-primary">
            {count === 0 ? "Tap tasks to select" : `${count} selected`}
          </span>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={selectAll}>
              Select all
            </Button>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={clear}>
              Clear
            </Button>
          </div>
        </div>
      )}

      <InlineTaskComposer
        defaults={{ inbox: true }}
        defaultTags={tagFilter ? [tagFilter] : undefined}
        nlp
        placeholder="Capture anything — try “Call vet tomorrow at 3pm p2 #pet”"
      />

      {tags.length > 0 && (
        <div
          data-no-swipe
          className="sticky top-0 z-20 -mx-4 border-b border-border/60 bg-background/85 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/70 sm:hidden"
        >
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/60">
            <button
              type="button"
              onClick={() => setTagFilter(null)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-[11px] font-medium transition-colors",
                !tagFilter ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
              )}
              aria-pressed={!tagFilter}
            >
              All <span className="opacity-70">· {items.length}</span>
            </button>
            {tags.map(t => {
              const active = tagFilter?.toLowerCase() === t.name.toLowerCase();
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTagFilter(active ? null : t.name)}
                  className="shrink-0"
                  aria-pressed={active}
                >
                  <TagChip name={t.name} subtle={!active} size="sm" />
                </button>
              );
            })}
          </div>
        </div>
      )}

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

/* ---------- Mobile Inbox ---------- */
function MobileInbox() {
  const { state } = useStore();
  const [filter, setFilter] = useState<InboxFilter>("all");
  const [tagsOpen, setTagsOpen] = useState(false);
  const { tags } = useTags();
  const { theme, setTheme } = useTheme();

  const base = useMemo(
    () => state.tasks.filter(t => t.inbox && !t.done && !t.parentTaskId && t.status !== "parked"),
    [state.tasks],
  );
  const items = useMemo(() => {
    return base.filter(t => {
      if (filter === "all") return true;
      const d = t.dueDate ? parseISO(t.dueDate) : null;
      if (filter === "today") return d ? isToday(d) : false;
      if (filter === "upcoming") return d ? isFuture(d) && !isToday(d) : false;
      if (filter === "scheduled") return !!d;
      if (filter === "overdue") return d ? (isPast(d) && !isToday(d)) : false;
      return true;
    });
  }, [base, filter]);

  const counts = useMemo(() => ({
    all: base.length,
    today: base.filter(t => t.dueDate && isToday(parseISO(t.dueDate))).length,
    upcoming: base.filter(t => t.dueDate && isFuture(parseISO(t.dueDate)) && !isToday(parseISO(t.dueDate))).length,
    scheduled: base.filter(t => !!t.dueDate).length,
    overdue: base.filter(t => t.dueDate && isPast(parseISO(t.dueDate)) && !isToday(parseISO(t.dueDate))).length,
  }), [base]);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background/85 backdrop-blur px-4 pt-3 pb-3">
        <div className="flex items-center gap-3">
          <button onClick={() => window.dispatchEvent(new CustomEvent("careflow:open-sidebar"))} aria-label="Menu" className="grid h-10 w-10 place-items-center rounded-xl bg-card border border-border/60">
            <Menu className="h-4 w-4" />
          </button>
          <h1 className="text-[22px] font-display tracking-tight">Inbox</h1>
          <div className="ml-auto flex items-center gap-2">
            <Link to="/search" className="grid h-10 w-10 place-items-center rounded-xl bg-card border border-border/60" aria-label="Search">
              <SearchIcon className="h-4 w-4" />
            </Link>
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label="Toggle theme"
              className="grid h-10 w-10 place-items-center rounded-xl bg-card border border-border/60"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      <div className="px-4 space-y-4">
        {/* Capture */}
        <MobileCaptureCard />

        {/* Filter chips */}
        <MobileFilterChips value={filter} onChange={setFilter} counts={counts} />

        {/* Tag library — collapsed by default */}
        {tags.length > 0 && (
          <section className="cf-card overflow-hidden">
            <button type="button" onClick={() => setTagsOpen(o => !o)} className="flex w-full items-center gap-2 px-4 py-3 text-left">
              <span className="text-[14px] font-medium">Tags</span>
              <span className="text-[12.5px] text-muted-foreground">· {tags.length}</span>
              <ChevronDown className={cn("ml-auto h-4 w-4 transition-transform", tagsOpen && "rotate-180")} />
            </button>
            {tagsOpen && (
              <div className="flex flex-wrap gap-1.5 border-t border-border/60 p-3">
                {tags.map(t => (
                  <Link key={t.id} to={`/tags/${encodeURIComponent(t.name)}`}>
                    <TagChip name={t.name} subtle size="sm" />
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Task list */}
        <div className="space-y-2.5">
          {items.length === 0 ? (
            <div className="cf-card p-8 text-center text-sm text-muted-foreground">Your inbox is clear ✨</div>
          ) : items.map(t => <MobileTaskCard key={t.id} task={t} />)}
        </div>
      </div>
    </div>
  );
}