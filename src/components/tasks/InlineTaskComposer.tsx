import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, CalendarDays, FolderOpen, Layers, Sparkles, X, Zap, Tag as TagIcon, Timer, AlignLeft, Flag, Sun } from "lucide-react";
import { format, parseISO, addDays, addMonths, nextMonday, nextSaturday } from "date-fns";
import { useStore } from "@/lib/store";
import { parseTaskInput } from "@/lib/nlp-task";
import { AREAS, type Area, type DayPart, type Energy, type Priority, type Task } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { TagAutocomplete } from "@/components/tags/TagAutocomplete";
import { TagPicker } from "@/components/tags/TagPicker";
import { TagChip } from "@/components/tags/TagChip";
import { TemplatePickerDialog } from "@/components/tasks/TemplatePickerDialog";
import { BookTemplate } from "lucide-react";
import { useAtmosphere } from "@/lib/atmospheres";

type Defaults = Partial<Pick<Task, "inbox" | "dueDate" | "status" | "area" | "projectId" | "energy" | "estMinutes" | "tags">>;

interface Props {
  /** Defaults applied to created tasks (e.g. { inbox: true } for the inbox page). */
  defaults?: Defaults;
  /** Show NLP chip preview as you type. Default true on inbox. */
  nlp?: boolean;
  placeholder?: string;
  /** Initial date to populate the date pill. */
  initialDate?: string;
  /** Tags to keep selected across submissions (sticky). */
  defaultTags?: string[];
}

export function InlineTaskComposer({ defaults = {}, nlp = true, placeholder = "Add a task…", initialDate, defaultTags }: Props) {
  const { state, addTask } = useStore();
  const [text, setText] = useState("");
  const [notes, setNotes] = useState("");
  const [notesOpen, setNotesOpen] = useState(false);
  const [date, setDate] = useState<string | undefined>(initialDate ?? defaults.dueDate);
  const [projectId, setProjectId] = useState<string | undefined>(defaults.projectId);
  const [area, setArea] = useState<Area | undefined>(defaults.area);
  const [energy, setEnergy] = useState<Energy | undefined>(defaults.energy);
  const [priority, setPriority] = useState<Priority | undefined>(undefined);
  const [dayPart, setDayPart] = useState<DayPart | undefined>(undefined);
  const [tags, setTags] = useState<string[]>(() => defaultTags ?? defaults.tags ?? []);
  const [estMinutes, setEstMinutes] = useState<number | undefined>(defaults.estMinutes);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow helpers
  const autoGrow = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 320)}px`;
  };
  useEffect(() => { autoGrow(inputRef.current); }, [text]);
  useEffect(() => { if (notesOpen) autoGrow(notesRef.current); }, [notes, notesOpen]);

  // Keep sticky tag selection in sync when the parent's defaultTags changes.
  useEffect(() => { setTags(defaultTags ?? defaults.tags ?? []); }, [JSON.stringify(defaultTags)]);

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
    const mergedTags = Array.from(new Set([
      ...(tags ?? []),
      ...((p.tags as string[] | undefined) ?? []),
    ].map(t => t.trim()).filter(Boolean)));
    const finalEst = estMinutes ?? p.estMinutes ?? defaults.estMinutes;
    await addTask({
      title: p.title || raw,
      notes: notes.trim() || undefined,
      dueDate: finalDate,
      priority: priority ?? p.priority ?? "medium",
      dayPart: dayPart ?? undefined,
      area: (finalArea ?? "Personal") as Area,
      tags: mergedTags.length ? mergedTags : undefined,
      energy: finalEnergy,
      estMinutes: finalEst,
      recurrenceType: p.recurrenceType,
      recurrenceInterval: p.recurrenceInterval,
      recurrenceDays: p.recurrenceDays,
      projectId: finalProjectId,
      status: defaults.status ?? (p.someday ? "someday" : "active"),
      inbox: defaults.inbox ?? false,
      done: false,
    });
    setText("");
    setNotes("");
    setNotesOpen(false);
    setDate(initialDate ?? defaults.dueDate);
    setProjectId(defaults.projectId);
    setArea(defaults.area);
    setEnergy(defaults.energy);
    setPriority(undefined);
    setDayPart(undefined);
    // Sticky tags + time: keep them so subsequent captures share the same.
    setTags(defaultTags ?? defaults.tags ?? tags);
    inputRef.current?.focus();
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void submit(); return; }
    if (e.key === "Enter" && !e.shiftKey && !notesOpen) { e.preventDefault(); void submit(); }
    if (e.key === "Escape") { setText(""); }
  };

  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-2">
      <div className="flex items-start gap-2">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <Plus className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKey}
            placeholder={placeholder}
            rows={1}
            className="w-full resize-none border-0 bg-transparent px-1 py-1 text-sm leading-snug shadow-none outline-none focus-visible:ring-0 placeholder:text-muted-foreground"
          />
          <TagAutocomplete inputRef={inputRef as any} value={text} onChange={setText} />

          {notesOpen && (
            <textarea
              ref={notesRef}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add a description…"
              rows={2}
              className="mt-1 w-full resize-none rounded-md border border-border/50 bg-background/50 px-2 py-1.5 text-xs leading-relaxed shadow-none outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground"
            />
          )}

          {/* Wrapping pill row — pills flow to a new line instead of overflowing */}
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => { setNotesOpen(v => !v); setTimeout(() => notesRef.current?.focus(), 0); }}
              className={cn(
                "inline-flex shrink-0 items-center gap-1 rounded-full border border-border/60 px-2.5 py-1 text-[11px] leading-none transition-colors hover:bg-muted",
                notesOpen || notes ? "text-foreground" : "text-muted-foreground",
              )}
              title="Add description"
              aria-pressed={notesOpen}
            >
              <AlignLeft className="h-3 w-3" />
              {notes ? "Description" : "Describe"}
            </button>
            {/* Date pill */}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1 rounded-full border border-border/60 px-2.5 py-1 text-[11px] leading-none transition-colors hover:bg-muted",
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
                <Command>
                  <CommandInput placeholder="Find a date…" />
                  <CommandList>
                    <CommandEmpty>Use the calendar below.</CommandEmpty>
                    <CommandGroup heading="Quick">
                      {([
                        { label: "Today", get: () => new Date() },
                        { label: "Tomorrow", get: () => addDays(new Date(), 1) },
                        { label: "This weekend", get: () => nextSaturday(new Date()) },
                        { label: "Next week", get: () => nextMonday(new Date()) },
                        { label: "Next month", get: () => addMonths(new Date(), 1) },
                        { label: "In 2 weeks", get: () => addDays(new Date(), 14) },
                      ] as const).map(opt => (
                        <CommandItem
                          key={opt.label}
                          value={opt.label}
                          onSelect={() => setDate(format(opt.get(), "yyyy-MM-dd"))}
                        >
                          <span className="flex-1">{opt.label}</span>
                          <span className="text-[10px] text-muted-foreground">{format(opt.get(), "EEE MMM d")}</span>
                        </CommandItem>
                      ))}
                      {date && (
                        <CommandItem value="Clear date" onSelect={() => setDate(undefined)}>
                          <span className="text-muted-foreground">Clear date</span>
                        </CommandItem>
                      )}
                    </CommandGroup>
                  </CommandList>
                </Command>
                <Calendar
                  mode="single"
                  selected={date ? parseISO(date) : undefined}
                  onSelect={(d) => setDate(d ? format(d, "yyyy-MM-dd") : undefined)}
                  initialFocus
                  className="pointer-events-auto border-t border-border/60"
                />
              </PopoverContent>
            </Popover>

            {/* Project pill */}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1 rounded-full border border-border/60 px-2.5 py-1 text-[11px] leading-none transition-colors hover:bg-muted",
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
                      <CommandItem value="No project" onSelect={() => setProjectId(undefined)}>
                        <span className="mr-2 h-2 w-2 rounded-full bg-muted-foreground/40" />
                        No project
                      </CommandItem>
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
                    "inline-flex shrink-0 items-center gap-1 rounded-full border border-border/60 px-2.5 py-1 text-[11px] leading-none transition-colors hover:bg-muted",
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
                      <CommandItem value="No area" onSelect={() => setArea(undefined)}>No area</CommandItem>
                      {AREAS.map(a => (
                        <CommandItem key={a} value={a} onSelect={() => setArea(a)}>{a}</CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {/* Energy pill — single popover replaces the low/med/high triplet */}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  title="Energy (or type @low / @med / @high)"
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] leading-none transition-colors",
                    energy === "low"  ? "border-transparent bg-secondary-soft text-secondary-foreground" :
                    energy === "high" ? "border-transparent bg-warm-soft text-warm-foreground" :
                    energy === "medium" ? "border-transparent bg-primary-soft text-primary-foreground" :
                    "border-border/60 text-muted-foreground hover:bg-muted",
                  )}
                >
                  <Zap className="h-3 w-3" />
                  {energy ? (energy === "medium" ? "Med" : energy[0].toUpperCase() + energy.slice(1)) : "Energy"}
                  {energy && (
                    <X
                      className="h-3 w-3 opacity-70 hover:opacity-100"
                      onClick={(e) => { e.stopPropagation(); setEnergy(undefined); }}
                    />
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-40 p-1" align="start">
                {(["low","medium","high"] as Energy[]).map(e => {
                  const label = e === "medium" ? "Medium" : e[0].toUpperCase() + e.slice(1);
                  const dot = e === "low" ? "bg-secondary" : e === "high" ? "bg-warm" : "bg-primary";
                  const active = energy === e;
                  return (
                    <button
                      key={e}
                      type="button"
                      onClick={() => setEnergy(e)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[11px] transition-colors",
                        active ? "bg-muted text-foreground" : "hover:bg-muted",
                      )}
                    >
                      <span className={cn("h-2 w-2 rounded-full", dot)} />
                      <span className="flex-1 text-left">{label}</span>
                      <Zap className="h-3 w-3 opacity-60" />
                    </button>
                  );
                })}
                {energy && (
                  <button
                    type="button"
                    onClick={() => setEnergy(undefined)}
                    className="mt-1 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[11px] text-muted-foreground hover:bg-muted"
                  >
                    Clear
                  </button>
                )}
              </PopoverContent>
            </Popover>

            {/* Priority pill */}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1 rounded-full border border-border/60 px-2.5 py-1 text-[11px] leading-none transition-colors hover:bg-muted",
                    priority ? "text-foreground" : "text-muted-foreground",
                  )}
                  title="Priority"
                >
                  <Flag className="h-3 w-3" />
                  {priority ? priority[0].toUpperCase() + priority.slice(1) : "Priority"}
                  {priority && (
                    <X
                      className="h-3 w-3 opacity-60 hover:opacity-100"
                      onClick={(e) => { e.stopPropagation(); setPriority(undefined); }}
                    />
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-0" align="start">
                <Command>
                  <CommandInput placeholder="Find priority…" />
                  <CommandList>
                    <CommandEmpty>No match.</CommandEmpty>
                    <CommandGroup>
                      {([
                        { v: "high" as Priority, label: "High", dot: "bg-rose-500" },
                        { v: "medium" as Priority, label: "Medium", dot: "bg-amber-500" },
                        { v: "low" as Priority, label: "Low", dot: "bg-emerald-500" },
                      ]).map(opt => (
                        <CommandItem key={opt.v} value={opt.label} onSelect={() => setPriority(opt.v)}>
                          <span className={cn("mr-2 h-2 w-2 rounded-full", opt.dot)} />
                          {opt.label}
                        </CommandItem>
                      ))}
                      {priority && (
                        <CommandItem value="Clear priority" onSelect={() => setPriority(undefined)}>
                          <span className="text-muted-foreground">Clear</span>
                        </CommandItem>
                      )}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {/* Time of Day pill */}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1 rounded-full border border-border/60 px-2.5 py-1 text-[11px] leading-none transition-colors hover:bg-muted",
                    dayPart ? "text-foreground" : "text-muted-foreground",
                  )}
                  title="Time of day"
                >
                  <Sun className="h-3 w-3" />
                  {dayPart ?? "Time of day"}
                  {dayPart && (
                    <X
                      className="h-3 w-3 opacity-60 hover:opacity-100"
                      onClick={(e) => { e.stopPropagation(); setDayPart(undefined); }}
                    />
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-0" align="start">
                <Command>
                  <CommandInput placeholder="Find time of day…" />
                  <CommandList>
                    <CommandEmpty>No match.</CommandEmpty>
                    <CommandGroup>
                      {(["Morning", "Afternoon", "Evening", "Late Night"] as DayPart[]).map(dp => (
                        <CommandItem key={dp} value={dp} onSelect={() => setDayPart(dp)}>
                          {dp}
                        </CommandItem>
                      ))}
                      {dayPart && (
                        <CommandItem value="Clear time of day" onSelect={() => setDayPart(undefined)}>
                          <span className="text-muted-foreground">Clear</span>
                        </CommandItem>
                      )}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {/* Tag pill — sticky selection across submissions */}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1 rounded-full border border-border/60 px-2.5 py-1 text-[11px] leading-none transition-colors hover:bg-muted",
                    tags.length ? "text-foreground" : "text-muted-foreground",
                  )}
                  title="Tags"
                >
                  <TagIcon className="h-3 w-3" />
                  {tags.length === 0
                    ? "Tag"
                    : tags.length === 1
                    ? `#${tags[0]}`
                    : `${tags.length} tags`}
                  {tags.length > 0 && (
                    <X
                      className="h-3 w-3 opacity-60 hover:opacity-100"
                      onClick={(e) => { e.stopPropagation(); setTags([]); }}
                    />
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2" align="start">
                <TagPicker value={tags} onChange={setTags} inline={false} triggerLabel="Pick tag" />
                {tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {tags.map(name => (
                      <TagChip key={name} name={name} size="xs" onRemove={() => setTags(tags.filter(t => t !== name))} />
                    ))}
                  </div>
                )}
              </PopoverContent>
            </Popover>

            {/* Time estimate pill */}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1 rounded-full border border-border/60 px-2.5 py-1 text-[11px] leading-none transition-colors hover:bg-muted",
                    estMinutes ? "text-foreground" : "text-muted-foreground",
                  )}
                  title="Time estimate"
                >
                  <Timer className="h-3 w-3" />
                  {estMinutes ? `${estMinutes}m` : "Est"}
                  {estMinutes != null && (
                    <X
                      className="h-3 w-3 opacity-60 hover:opacity-100"
                      onClick={(e) => { e.stopPropagation(); setEstMinutes(undefined); }}
                    />
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-44 p-1.5" align="start">
                <div className="grid grid-cols-3 gap-1">
                  {[5, 10, 15, 25, 30, 45, 60, 90, 120].map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setEstMinutes(m)}
                      className={cn(
                        "rounded-md px-1.5 py-1 text-[11px] transition-colors",
                        estMinutes === m ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                      )}
                    >
                      {m < 60 ? `${m}m` : `${m / 60}h${m % 60 ? ` ${m % 60}m` : ""}`}
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-1.5 border-t border-border/50 pt-2">
                  <Input
                    type="number"
                    min={1}
                    placeholder="Custom"
                    className="h-7 text-[11px]"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const v = parseInt((e.target as HTMLInputElement).value, 10);
                        if (Number.isFinite(v) && v > 0) setEstMinutes(v);
                      }
                    }}
                  />
                  <span className="text-[10px] text-muted-foreground">min</span>
                </div>
              </PopoverContent>
            </Popover>

            {/* NLP chips */}
            {parsed && parsed.chips.length > 0 && (
              <div className="flex shrink-0 items-center gap-1 text-[10px] text-muted-foreground">
                <Sparkles className="h-3 w-3" />
                {parsed.chips.map((c, i) => (
                  <span key={i} className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-primary">{c.label}</span>
                ))}
              </div>
            )}
          </div>

          {/* Actions row — pinned (not scrolled) */}
          <div className="mt-1 flex items-center justify-end gap-1">
              <TemplatePickerDialog
                defaults={{
                  area: area ?? defaults.area,
                  projectId: projectId ?? defaults.projectId,
                  tags,
                  energy: energy ?? defaults.energy,
                  estMinutes: estMinutes ?? defaults.estMinutes,
                  inbox: defaults.inbox,
                  dueDate: date ?? defaults.dueDate,
                }}
                trigger={
                  <button
                    type="button"
                    className="mr-1 inline-flex items-center gap-1 rounded-full border border-border/60 px-2.5 py-1 text-[11px] leading-none text-muted-foreground transition-colors hover:bg-muted"
                    title="Insert from template"
                  >
                    <BookTemplate className="h-3 w-3" /> Template
                  </button>
                }
              />
              <Button size="sm" className="h-7 px-3 text-xs" onClick={submit} disabled={!text.trim()}>
                Add
              </Button>
          </div>
        </div>
      </div>
    </div>
  );
}