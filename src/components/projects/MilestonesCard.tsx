import { useMemo, useState } from "react";
import { Flag, Plus, Trash2, CalendarIcon, Check } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import type { Project, ProjectMilestone } from "@/lib/types";

function newId() {
  return (globalThis.crypto?.randomUUID?.() ?? `m-${Date.now()}-${Math.random().toString(16).slice(2)}`);
}

export function MilestonesCard({ project }: { project: Project }) {
  const { updateProject } = useStore();
  const [draft, setDraft] = useState("");
  const milestones = project.milestones ?? [];

  const sorted = useMemo(() => {
    return [...milestones].sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      if (a.date && b.date) return a.date.localeCompare(b.date);
      if (a.date) return -1;
      if (b.date) return 1;
      return 0;
    });
  }, [milestones]);

  const doneCount = milestones.filter(m => m.done).length;
  const pct = milestones.length ? Math.round((doneCount / milestones.length) * 100) : 0;

  const save = (next: ProjectMilestone[]) => updateProject(project.id, { milestones: next });

  const add = () => {
    const title = draft.trim();
    if (!title) return;
    save([...milestones, { id: newId(), title, done: false }]);
    setDraft("");
  };

  const patch = (id: string, p: Partial<ProjectMilestone>) =>
    save(milestones.map(m => m.id === id ? { ...m, ...p } : m));

  const remove = (id: string) => save(milestones.filter(m => m.id !== id));

  return (
    <section className="rounded-2xl border border-border/60 bg-card/60 p-4 animate-fade-in">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Flag className="h-3.5 w-3.5 text-primary" /> Milestones
          {milestones.length > 0 && (
            <span className="rounded-full bg-muted px-1.5 py-0 text-[10px] normal-case tracking-normal tabular-nums">
              {doneCount}/{milestones.length}
            </span>
          )}
        </div>
      </div>

      {milestones.length > 0 && <Progress value={pct} className="mb-3 h-1.5" />}

      <div className="flex gap-2">
        <Input
          placeholder="Add a milestone…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") add(); }}
          className="h-9 text-sm"
        />
        <Button onClick={add} size="sm" className="h-9 gap-1"><Plus className="h-4 w-4" /></Button>
      </div>

      <ul className="mt-3 space-y-1.5">
        {sorted.length === 0 && (
          <li className="text-xs text-muted-foreground/80">No milestones yet. Add the first big checkpoint above.</li>
        )}
        {sorted.map(m => {
          const date = m.date ? parseISO(m.date) : undefined;
          return (
            <li
              key={m.id}
              className={cn(
                "group flex items-center gap-2 rounded-xl border border-border/40 bg-background/50 px-2.5 py-1.5",
                m.done && "opacity-60",
              )}
            >
              <Checkbox checked={m.done} onCheckedChange={(v) => patch(m.id, { done: !!v })} />
              <Input
                value={m.title}
                onChange={(e) => patch(m.id, { title: e.target.value })}
                className={cn("h-7 flex-1 border-0 bg-transparent px-1 text-sm focus-visible:ring-0", m.done && "line-through")}
              />
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className={cn("h-7 gap-1 px-2 text-[11px]", !date && "text-muted-foreground")}>
                    <CalendarIcon className="h-3 w-3" />
                    {date ? format(date, "MMM d") : "Date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => patch(m.id, { date: d ? format(d, "yyyy-MM-dd") : undefined })}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                  {m.date && (
                    <div className="border-t p-2">
                      <Button variant="ghost" size="sm" className="h-7 w-full text-xs" onClick={() => patch(m.id, { date: undefined })}>
                        Clear
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => remove(m.id)}
                className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
                aria-label="Remove milestone"
              >
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}