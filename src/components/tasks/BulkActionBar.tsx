import { useMemo, useState } from "react";
import { format, addDays } from "date-fns";
import { CalendarDays, Check, FolderKanban, Tag, Trash2, X, Coffee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useStore } from "@/lib/store";
import { useTaskSelection } from "@/lib/task-selection";
import { AREAS } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function BulkActionBar() {
  const { selected, count, clear } = useTaskSelection();
  const { state, updateTask, deleteTask, toggleTask } = useStore();
  const ids = useMemo(() => Array.from(selected), [selected]);
  const [datePopOpen, setDatePopOpen] = useState(false);

  if (count === 0) return null;

  const run = async (fn: (id: string) => Promise<void> | void) => {
    await Promise.all(ids.map(async (id) => { await fn(id); }));
  };

  const complete = async () => {
    const incomplete = ids.filter(id => !state.tasks.find(t => t.id === id)?.done);
    await run(async (id) => { if (!state.tasks.find(t => t.id === id)?.done) await toggleTask(id); });
    toast.success(`${incomplete.length || ids.length} marked done`);
    clear();
  };

  const remove = async () => {
    if (!confirm(`Delete ${count} task${count === 1 ? "" : "s"}?`)) return;
    await run((id) => deleteTask(id));
    toast.success(`Deleted ${count}`);
    clear();
  };

  const setDate = async (d: Date | undefined) => {
    if (!d) return;
    const iso = format(d, "yyyy-MM-dd");
    await run((id) => updateTask(id, { dueDate: iso }));
    toast.success(`Scheduled ${count} for ${format(d, "MMM d")}`);
    setDatePopOpen(false);
    clear();
  };

  const quickDate = async (offset: number) => {
    const iso = format(addDays(new Date(), offset), "yyyy-MM-dd");
    await run((id) => updateTask(id, { dueDate: iso }));
    toast.success(`Scheduled ${count}`);
    setDatePopOpen(false);
    clear();
  };

  const moveToProject = async (projectId: string | null) => {
    await run((id) => updateTask(id, { projectId: projectId ?? undefined }));
    toast.success(projectId ? "Moved to project" : "Removed from project");
    clear();
  };

  const setArea = async (area: string) => {
    await run((id) => updateTask(id, { area: area as any }));
    toast.success(`Area set to ${area}`);
    clear();
  };

  const parkUntil = async (offset: number | null) => {
    const iso = offset === null ? undefined : format(addDays(new Date(), offset), "yyyy-MM-dd");
    await run((id) => updateTask(id, {
      status: "parked",
      snoozedUntil: iso,
      dueDate: undefined,
      isTopThree: false,
    }));
    toast.success(
      iso ? `Parked — will return ${format(addDays(new Date(), offset!), "EEE MMM d")}` : "Parked in Not Today",
    );
    clear();
  };

  return (
    <div className={cn(
      "fixed inset-x-0 bottom-20 z-40 flex justify-center px-4 sm:bottom-6 pointer-events-none",
    )}>
      <div className="pointer-events-auto flex flex-wrap items-center gap-1 rounded-full border border-border/60 bg-card/95 px-2 py-1.5 shadow-[var(--shadow-cozy)] backdrop-blur-md">
        <span className="px-2 text-xs font-medium tabular-nums text-muted-foreground">
          {count} selected
        </span>
        <div className="h-5 w-px bg-border/60" />
        <Button size="sm" variant="ghost" className="h-8 gap-1.5 rounded-full" onClick={complete}>
          <Check className="h-3.5 w-3.5" /> Complete
        </Button>
        <Popover open={datePopOpen} onOpenChange={setDatePopOpen}>
          <PopoverTrigger asChild>
            <Button size="sm" variant="ghost" className="h-8 gap-1.5 rounded-full">
              <CalendarDays className="h-3.5 w-3.5" /> Schedule
            </Button>
          </PopoverTrigger>
          <PopoverContent align="center" className="w-auto p-2">
            <div className="flex flex-col gap-1 pb-2">
              <Button size="sm" variant="ghost" className="justify-start" onClick={() => quickDate(0)}>Today</Button>
              <Button size="sm" variant="ghost" className="justify-start" onClick={() => quickDate(1)}>Tomorrow</Button>
              <Button size="sm" variant="ghost" className="justify-start" onClick={() => quickDate(7)}>Next week</Button>
            </div>
            <Calendar mode="single" onSelect={setDate} initialFocus className="p-0" />
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" variant="ghost" className="h-8 gap-1.5 rounded-full">
              <FolderKanban className="h-3.5 w-3.5" /> Project
            </Button>
          </PopoverTrigger>
          <PopoverContent align="center" className="w-56 p-1">
            <button
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
              onClick={() => moveToProject(null)}
            >
              <X className="h-3.5 w-3.5" /> No project
            </button>
            <div className="my-1 h-px bg-border/50" />
            <div className="max-h-64 overflow-auto">
              {(state.projects ?? []).map(p => (
                <button
                  key={p.id}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                  onClick={() => moveToProject(p.id)}
                >
                  <FolderKanban className="h-3.5 w-3.5 opacity-60" /> {p.name}
                </button>
              ))}
              {(state.projects ?? []).length === 0 && (
                <div className="px-2 py-1.5 text-xs text-muted-foreground">No projects yet.</div>
              )}
            </div>
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" variant="ghost" className="h-8 gap-1.5 rounded-full">
              <Tag className="h-3.5 w-3.5" /> Area
            </Button>
          </PopoverTrigger>
          <PopoverContent align="center" className="w-44 p-1">
            {AREAS.map(a => (
              <button
                key={a}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                onClick={() => setArea(a)}
              >
                {a}
              </button>
            ))}
          </PopoverContent>
        </Popover>
        <Button size="sm" variant="ghost" className="h-8 gap-1.5 rounded-full text-destructive hover:text-destructive" onClick={remove}>
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" variant="ghost" className="h-8 gap-1.5 rounded-full">
              <Coffee className="h-3.5 w-3.5" /> Not today
            </Button>
          </PopoverTrigger>
          <PopoverContent align="center" className="w-48 p-1">
            <button className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted" onClick={() => parkUntil(1)}>Bring back tomorrow</button>
            <button className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted" onClick={() => parkUntil(3)}>In 3 days</button>
            <button className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted" onClick={() => parkUntil(7)}>Next week</button>
            <button className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted" onClick={() => parkUntil(14)}>In 2 weeks</button>
            <div className="my-1 h-px bg-border/50" />
            <button className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted" onClick={() => parkUntil(null)}>Indefinitely</button>
          </PopoverContent>
        </Popover>
        <div className="h-5 w-px bg-border/60" />
        <Button size="sm" variant="ghost" className="h-8 w-8 rounded-full p-0" onClick={clear} aria-label="Clear selection">
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}