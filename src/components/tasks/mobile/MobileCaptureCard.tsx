import { useState } from "react";
import { Plus, Calendar as CalIcon, FolderKanban, Layers, Flag, Sun, Tag as TagIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { parseTaskInput } from "@/lib/nlp-task";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { format, parseISO, addDays, addMonths, nextMonday, nextSaturday } from "date-fns";
import { cn } from "@/lib/utils";
import { AREAS, type Area, type DayPart, type Priority } from "@/lib/types";
import { TagPicker } from "@/components/tags/TagPicker";
import { TagChip } from "@/components/tags/TagChip";
import { useAtmosphere } from "@/lib/atmospheres";

function atmoColor(palette: string[], index: number, alpha?: number): string {
  const hex = palette[index % palette.length];
  if (alpha == null || alpha === 1) return hex;
  return `color-mix(in srgb, ${hex} ${Math.round(alpha * 100)}%, transparent)`;
}

/** Mobile-first quick capture card matching the redesign spec. */
export function MobileCaptureCard({ defaultArea }: { defaultArea?: Area }) {
  const { addTask, state } = useStore();
  const { atmosphere } = useAtmosphere();
  const [title, setTitle] = useState("");
  const [focused, setFocused] = useState(false);
  const [date, setDate] = useState<string | undefined>(undefined);
  const [projectId, setProjectId] = useState<string | undefined>(undefined);
  const [area, setArea] = useState<Area | undefined>(defaultArea);
  const [priority, setPriority] = useState<Priority | undefined>(undefined);
  const [dayPart, setDayPart] = useState<DayPart | undefined>(undefined);
  const [tags, setTags] = useState<string[]>([]);
  const [projOpen, setProjOpen] = useState(false);
  const [areaOpen, setAreaOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [prioOpen, setPrioOpen] = useState(false);
  const [dpOpen, setDpOpen] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(false);

  const submit = async () => {
    const t = title.trim();
    if (!t) return;
    try {
      const parsed = (() => { try { return parseTaskInput(t); } catch { return null; } })();
      await addTask({
        title: parsed?.title ?? t,
        inbox: true,
        dueDate: date ?? parsed?.dueDate,
        priority: priority ?? parsed?.priority ?? "medium",
        dayPart,
        area: area ?? parsed?.area ?? "Personal",
        projectId,
        tags: tags.length ? tags : parsed?.tags,
      } as any);
      setTitle(""); setDate(undefined); setProjectId(undefined);
      setPriority(undefined); setDayPart(undefined); setTags([]);
      if (!defaultArea) setArea(undefined);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not capture");
    }
  };

  const proj = projectId ? state.projects?.find(p => p.id === projectId) : undefined;

  return (
    <div
      className="cf-card p-4 transition-shadow duration-500"
      style={{
        boxShadow: `0 0 0 1px ${atmoColor(atmosphere.palette, 0, 0.22)}, 0 6px 32px -6px ${atmoColor(atmosphere.palette, 0, 0.38)}`,
      }}
    >
      <div className="flex items-center gap-3">
        <div className="cf-icon-tile shrink-0"><Plus className="h-4 w-4" /></div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          placeholder="Capture anything…"
          className="min-w-0 flex-1 bg-transparent text-[15.5px] outline-none placeholder:text-muted-foreground/70"
        />
      </div>
      <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <Popover open={dateOpen} onOpenChange={setDateOpen}>
          <PopoverTrigger asChild>
            <button type="button" className={cn("cf-chip shrink-0", date && "cf-chip-active")}>
              <CalIcon className="h-3.5 w-3.5" />
              {date ? format(parseISO(date), "MMM d") : "Date"}
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-0">
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
                      onSelect={() => { setDate(format(opt.get(), "yyyy-MM-dd")); setDateOpen(false); }}
                    >
                      <span className="flex-1">{opt.label}</span>
                      <span className="text-[10px] text-muted-foreground">{format(opt.get(), "EEE MMM d")}</span>
                    </CommandItem>
                  ))}
                  {date && (
                    <CommandItem value="Clear date" onSelect={() => { setDate(undefined); setDateOpen(false); }}>
                      <span className="text-muted-foreground">Clear date</span>
                    </CommandItem>
                  )}
                </CommandGroup>
              </CommandList>
            </Command>
            <Calendar
              mode="single"
              selected={date ? parseISO(date) : undefined}
              onSelect={(d) => { setDate(d ? format(d, "yyyy-MM-dd") : undefined); setDateOpen(false); }}
              initialFocus
              className="p-3 pointer-events-auto border-t border-border/60"
            />
          </PopoverContent>
        </Popover>

        <Popover open={projOpen} onOpenChange={setProjOpen}>
          <PopoverTrigger asChild>
            <button type="button" className={cn("cf-chip shrink-0", proj && "cf-chip-active")}>
              <FolderKanban className="h-3.5 w-3.5" />
              {proj?.name ?? "Project"}
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-56 p-0">
            <Command>
              <CommandInput placeholder="Find project…" />
              <CommandList>
                <CommandEmpty>No projects.</CommandEmpty>
                <CommandGroup>
                  <CommandItem value="No project" onSelect={() => { setProjectId(undefined); setProjOpen(false); }}>
                    <span className="mr-2 h-2 w-2 rounded-full bg-muted-foreground/40" />
                    No project
                  </CommandItem>
                  {(state.projects ?? []).filter(p => p.status !== "done").map(p => (
                    <CommandItem key={p.id} value={p.name} onSelect={() => { setProjectId(p.id); setProjOpen(false); }}>
                      <span className="mr-2 h-2 w-2 rounded-full" style={{ background: p.color ?? "hsl(var(--muted-foreground))" }} />
                      {p.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <Popover open={areaOpen} onOpenChange={setAreaOpen}>
          <PopoverTrigger asChild>
            <button type="button" className={cn("cf-chip shrink-0", area && "cf-chip-active")}>
              <Layers className="h-3.5 w-3.5" />
              {area ?? "Area"}
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-48 p-0">
            <Command>
              <CommandInput placeholder="Find area…" />
              <CommandList>
                <CommandEmpty>No areas.</CommandEmpty>
                <CommandGroup>
                  <CommandItem value="No area" onSelect={() => { setArea(undefined); setAreaOpen(false); }}>No area</CommandItem>
                  {AREAS.map(a => (
                    <CommandItem key={a} value={a} onSelect={() => { setArea(a); setAreaOpen(false); }}>{a}</CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <Popover open={prioOpen} onOpenChange={setPrioOpen}>
          <PopoverTrigger asChild>
            <button type="button" className={cn("cf-chip shrink-0", priority && "cf-chip-active")}>
              <Flag className="h-3.5 w-3.5" />
              {priority ? priority[0].toUpperCase() + priority.slice(1) : "Priority"}
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-48 p-0">
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
                    <CommandItem key={opt.v} value={opt.label} onSelect={() => { setPriority(opt.v); setPrioOpen(false); }}>
                      <span className={cn("mr-2 h-2 w-2 rounded-full", opt.dot)} />
                      {opt.label}
                    </CommandItem>
                  ))}
                  {priority && (
                    <CommandItem value="Clear priority" onSelect={() => { setPriority(undefined); setPrioOpen(false); }}>
                      <span className="text-muted-foreground">Clear</span>
                    </CommandItem>
                  )}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <Popover open={dpOpen} onOpenChange={setDpOpen}>
          <PopoverTrigger asChild>
            <button type="button" className={cn("cf-chip shrink-0", dayPart && "cf-chip-active")}>
              <Sun className="h-3.5 w-3.5" />
              {dayPart ?? "Time of day"}
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-48 p-0">
            <Command>
              <CommandInput placeholder="Find time of day…" />
              <CommandList>
                <CommandEmpty>No match.</CommandEmpty>
                <CommandGroup>
                  {(["Morning", "Afternoon", "Evening", "Late Night"] as DayPart[]).map(dp => (
                    <CommandItem key={dp} value={dp} onSelect={() => { setDayPart(dp); setDpOpen(false); }}>{dp}</CommandItem>
                  ))}
                  {dayPart && (
                    <CommandItem value="Clear time of day" onSelect={() => { setDayPart(undefined); setDpOpen(false); }}>
                      <span className="text-muted-foreground">Clear</span>
                    </CommandItem>
                  )}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <Popover open={tagsOpen} onOpenChange={setTagsOpen}>
          <PopoverTrigger asChild>
            <button type="button" className={cn("cf-chip shrink-0", tags.length && "cf-chip-active")}>
              <TagIcon className="h-3.5 w-3.5" />
              {tags.length === 0 ? "Tag" : tags.length === 1 ? `#${tags[0]}` : `${tags.length} tags`}
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-2">
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

        <div className="ml-auto" />
        <Button onClick={submit} disabled={!title.trim()} className="rounded-full shrink-0 px-5 h-9">
          Add
        </Button>
      </div>
    </div>
  );
}