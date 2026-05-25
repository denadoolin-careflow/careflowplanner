import { useMemo, useRef, useState } from "react";
import { Plus, CalendarDays, FolderOpen, Layers, Sparkles, X, Zap } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useStore } from "@/lib/store";
import { parseTaskInput } from "@/lib/nlp-task";
import { AREAS, type Area, type Energy, type Task } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { TagAutocomplete } from "@/components/tags/TagAutocomplete";

type Defaults = Partial<Pick<Task, "inbox" | "dueDate" | "status" | "area" | "projectId" | "energy">>;

interface Props {
  /** Defaults applied to created tasks (e.g. { inbox: true } for the inbox page). */
  defaults?: Defaults;
  /** Show NLP chip preview as you type. Default true on inbox. */
  nlp?: boolean;
  placeholder?: string;
  /** Initial date to populate the date pill. */
  initialDate?: string;
}

export function InlineTaskComposer({ defaults = {}, nlp = true, placeholder = "Add a task…", initialDate }: Props) {
  const { state, addTask } = useStore();
  const [text, setText] = useState("");
  const [date, setDate] = useState<string | undefined>(initialDate ?? defaults.dueDate);
  const [projectId, setProjectId] = useState<string | undefined>(defaults.projectId);
  const [area, setArea] = useState<Area | undefined>(defaults.area);
  const [energy, setEnergy] = useState<Energy | undefined>(defaults.energy);
  const inputRef = useRef<HTMLInputElement>(null);

  const parsed = useMemo(() => (nlp && text.trim() ? parseTaskInput(text) : null), [text, nlp]);

  const project = projectId ? state.projects?.find(p => p.id === projectId) : undefined;

  const submit = async () => {
    const raw = text.trim();
    if (!raw) return;
    const p = nlp ? parseTaskInput(raw) : { title: raw } as ReturnType<typeof parseTaskInput>;
    const finalProjectId = projectId
      ?? (p.projectName ? state.projects?.find(pr => pr.name.toLowerCase() === p.projectName!.toLowerCase())?.id : undefined);
    const finalArea = area ?? p.area;
    const finalDate = date ?? p.dueDate ?? defaults.dueDate;
    const finalEnergy = energy ?? p.energy ?? defaults.energy;
    await addTask({
      title: p.title || raw,
      notes: undefined,
      dueDate: finalDate,
      priority: p.priority ?? "medium",
      area: (finalArea ?? "Personal") as Area,
      tags: p.tags,
      energy: finalEnergy,
      estMinutes: p.estMinutes,
      recurrenceType: p.recurrenceType,
      recurrenceInterval: p.recurrenceInterval,
      recurrenceDays: p.recurrenceDays,
      projectId: finalProjectId,
      status: defaults.status ?? (p.someday ? "someday" : "active"),
      inbox: defaults.inbox ?? false,
      done: false,
    });
    setText("");
    setDate(initialDate ?? defaults.dueDate);
    setProjectId(defaults.projectId);
    setArea(defaults.area);
    setEnergy(defaults.energy);
    inputRef.current?.focus();
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void submit(); }
    if (e.key === "Escape") { setText(""); }
  };

  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-2">
      <div className="flex items-start gap-2">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <Plus className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <Input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKey}
            placeholder={placeholder}
            className="h-8 border-0 bg-transparent px-1 text-sm shadow-none focus-visible:ring-0"
          />
          <TagAutocomplete inputRef={inputRef} value={text} onChange={setText} />

          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {/* Date pill */}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border border-border/60 px-2 py-0.5 text-[11px] transition-colors hover:bg-muted",
                    date ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  <CalendarDays className="h-3 w-3" />
                  {date ? format(parseISO(date), "MMM d") : "Date"}
                  {date && (
                    <X
                      className="h-3 w-3 opacity-60 hover:opacity-100"
                      onClick={(e) => { e.stopPropagation(); setDate(undefined); }}
                    />
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date ? parseISO(date) : undefined}
                  onSelect={(d) => setDate(d ? format(d, "yyyy-MM-dd") : undefined)}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            {/* Project pill */}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border border-border/60 px-2 py-0.5 text-[11px] transition-colors hover:bg-muted",
                    project ? "text-foreground" : "text-muted-foreground",
                  )}
                  style={project?.color ? { color: project.color } : undefined}
                >
                  <FolderOpen className="h-3 w-3" />
                  {project?.name ?? "Project"}
                  {project && (
                    <X
                      className="h-3 w-3 opacity-60 hover:opacity-100"
                      onClick={(e) => { e.stopPropagation(); setProjectId(undefined); }}
                    />
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-0" align="start">
                <Command>
                  <CommandInput placeholder="Find project…" />
                  <CommandList>
                    <CommandEmpty>No projects.</CommandEmpty>
                    <CommandGroup>
                      {(state.projects ?? []).filter(p => p.status !== "done").map(p => (
                        <CommandItem key={p.id} value={p.name} onSelect={() => setProjectId(p.id)}>
                          <span className="h-2 w-2 rounded-full mr-2" style={{ background: p.color ?? "hsl(var(--muted-foreground))" }} />
                          {p.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {/* Area pill */}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border border-border/60 px-2 py-0.5 text-[11px] transition-colors hover:bg-muted",
                    area ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  <Layers className="h-3 w-3" />
                  {area ?? "Area"}
                  {area && (
                    <X
                      className="h-3 w-3 opacity-60 hover:opacity-100"
                      onClick={(e) => { e.stopPropagation(); setArea(undefined); }}
                    />
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-0" align="start">
                <Command>
                  <CommandInput placeholder="Find area…" />
                  <CommandList>
                    <CommandEmpty>No areas.</CommandEmpty>
                    <CommandGroup>
                      {AREAS.map(a => (
                        <CommandItem key={a} value={a} onSelect={() => setArea(a)}>{a}</CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {/* Energy dropper — quick tap or type @low / @med / @high */}
            {(["low","medium","high"] as Energy[]).map(e => {
              const active = energy === e;
              const label = e === "medium" ? "med" : e;
              return (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEnergy(active ? undefined : e)}
                  title={`Energy: ${e}  (or type @${label})`}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition-colors",
                    active
                      ? e === "low"  ? "border-transparent bg-secondary-soft text-secondary-foreground"
                      : e === "high" ? "border-transparent bg-warm-soft text-warm-foreground"
                      :                "border-transparent bg-primary-soft text-primary-foreground"
                      : "border-border/60 text-muted-foreground hover:bg-muted",
                  )}
                >
                  <Zap className="h-3 w-3" />
                  {label}
                </button>
              );
            })}

            {/* NLP chips */}
            {parsed && parsed.chips.length > 0 && (
              <div className="flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground">
                <Sparkles className="h-3 w-3" />
                {parsed.chips.map((c, i) => (
                  <span key={i} className="rounded-full bg-primary/10 px-1.5 py-0.5 text-primary">{c.label}</span>
                ))}
              </div>
            )}

            <div className="ml-auto">
              <Button size="sm" className="h-7 px-3 text-xs" onClick={submit} disabled={!text.trim()}>
                Add
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}