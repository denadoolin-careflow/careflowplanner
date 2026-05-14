import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { TaskRow } from "@/components/cards/TaskRow";
import { Inbox as InboxIcon, Sparkles, Check, X, RefreshCw } from "lucide-react";
import { InlineTaskComposer } from "@/components/tasks/InlineTaskComposer";
import { TaskSortMenu, sortTasks, type SortMode } from "@/components/tasks/TaskSortMenu";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Area, Priority, TaskStatus } from "@/lib/types";

interface Suggestion {
  task_id: string;
  area?: string;
  project_id?: string | null;
  status?: TaskStatus;
  priority?: Priority;
  suggested_due_date?: string | null;
}

export default function Inbox() {
  const { state, updateTask } = useStore();
  const [sort, setSort] = useState<SortMode>("created");
  const [triaging, setTriaging] = useState(false);
  const [suggestions, setSuggestions] = useState<Record<string, Suggestion>>({});
  const items = useMemo(
    () => sortTasks(state.tasks.filter(t => t.inbox && !t.done && !t.parentTaskId), sort),
    [state.tasks, sort],
  );

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

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 p-4 md:p-6">
      <header className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">
          <InboxIcon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">Inbox</h1>
          <p className="text-sm text-muted-foreground">Capture now, organize later. {items.length} waiting.</p>
        </div>
        <Button variant="outline" size="sm" onClick={triage} disabled={triaging || items.length === 0} className="gap-1.5">
          {triaging ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          Smart triage
        </Button>
        <TaskSortMenu value={sort} onChange={setSort} />
      </header>

      <InlineTaskComposer
        defaults={{ inbox: true }}
        nlp
        placeholder="Capture anything — try “Call vet tomorrow at 3pm p2 #pet”"
      />

      <div className="rounded-2xl border border-border/60 bg-card/60 p-2">
        {items.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Your inbox is clear ✨</div>
        ) : (
          <div className="space-y-1">
            {items.map(t => {
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
        )}
      </div>
    </div>
  );
}