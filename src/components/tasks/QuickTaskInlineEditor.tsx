import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { CalendarIcon, Minus, Plus, ChefHat, FileText, BookOpen, Heart, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { BlockCheckbox } from "@/components/planner/BlockCheckbox";
import { resolveTaskIcon } from "@/lib/task-icons";
import { AREAS, type Area } from "@/lib/types";
import {
  ACTIVITIES, ACTIVITY_TAG, ZONES, ZONE_TAG, readActivityTag, resolveActivity, withTag,
} from "@/lib/task-tracking";
import { createNote } from "@/lib/notes";
import { createMemory } from "@/lib/memories";
import { toast } from "sonner";

const FRAMES = [
  { id: "morning", label: "Morning", start: "09:00", range: [5 * 60, 12 * 60] },
  { id: "afternoon", label: "Afternoon", start: "13:00", range: [12 * 60, 17 * 60] },
  { id: "evening", label: "Evening", start: "18:00", range: [17 * 60, 24 * 60] },
] as const;

const DURATIONS = [15, 30, 45, 60, 90, 120];

const RECIPE_MARK = "\n\n— Recipe —\n";

const splitRecipe = (notes?: string): { base: string; recipe: string | null } => {
  const raw = notes ?? "";
  const i = raw.indexOf(RECIPE_MARK.trim());
  if (i === -1) return { base: raw, recipe: null };
  return { base: raw.slice(0, i).trimEnd(), recipe: raw.slice(i + RECIPE_MARK.trim().length).replace(/^\n/, "") };
};

const toMin = (t?: string) => {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h)) return null;
  return h * 60 + (m || 0);
};
const toHHMM = (min: number) => {
  const v = ((min % 1440) + 1440) % 1440;
  return `${String(Math.floor(v / 60)).padStart(2, "0")}:${String(v % 60).padStart(2, "0")}`;
};
const label12 = (min: number) => {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  const period = h >= 12 ? "p" : "a";
  const h12 = ((h + 11) % 12) + 1;
  return m ? `${h12}:${String(m).padStart(2, "0")}${period}` : `${h12}${period}`;
};

/** Compact inline editor for title, due date, and notes — used in popovers/dialogs. */
export function QuickTaskInlineEditor({
  taskId,
  onClose,
}: {
  taskId: string;
  onClose?: () => void;
}) {
  const { state, updateTask, toggleTask, addJournal } = useStore();
  const task = state.tasks.find((t) => t.id === taskId);
  const [title, setTitle] = useState(task?.title ?? "");
  const [notes, setNotes] = useState(splitRecipe(task?.notes).base);
  const [recipe, setRecipe] = useState<string | null>(splitRecipe(task?.notes).recipe);
  const [area, setArea] = useState<Area>(task?.area ?? "Personal");
  const [projectId, setProjectId] = useState<string | undefined>(task?.projectId);
  const [recipientId, setRecipientId] = useState<string | undefined>(task?.recipientId);
  const [zone, setZone] = useState<string | undefined>(
    task?.tags?.find(t => t.startsWith(ZONE_TAG))?.slice(ZONE_TAG.length),
  );
  const [activity, setActivity] = useState<string | undefined>(readActivityTag(task?.tags));
  const [dueDate, setDueDate] = useState<string | undefined>(task?.dueDate);
  const [startTime, setStartTime] = useState<string | undefined>(task?.startTime);
  const [durMin, setDurMin] = useState<number>(task?.estMinutes ?? 30);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    const s = splitRecipe(task.notes);
    setNotes(s.base);
    setRecipe(s.recipe);
    setArea(task.area);
    setProjectId(task.projectId);
    setRecipientId(task.recipientId);
    setZone(task.tags?.find(t => t.startsWith(ZONE_TAG))?.slice(ZONE_TAG.length));
    setActivity(readActivityTag(task.tags));
    setDueDate(task.dueDate);
    setStartTime(task.startTime);
    setDurMin(task.estMinutes ?? 30);
  }, [taskId]); // eslint-disable-line react-hooks/exhaustive-deps

  const icon = useMemo(() => (task ? resolveTaskIcon(task) : null), [task?.icon, task?.title, task?.notes]); // eslint-disable-line react-hooks/exhaustive-deps
  // Suggest an activity from wording/area when nothing is tagged yet.
  const inferred = useMemo(
    () => resolveActivity({ title, notes, area, recipientId, tags: zone ? [`${ZONE_TAG}${zone}`] : [] }),
    [title, notes, area, recipientId, zone],
  );

  if (!task) return null;

  const startMin = toMin(startTime);
  const endMin = startMin === null ? null : startMin + durMin;
  const activeFrame = startMin === null ? null : FRAMES.find(f => startMin >= f.range[0] && startMin < f.range[1])?.id ?? null;

  const save = async () => {
    setSaving(true);
    try {
      const composedNotes = [notes.trim(), recipe?.trim() ? `${RECIPE_MARK.trim()}\n${recipe.trim()}` : ""]
        .filter(Boolean).join("\n\n");
      const tags = withTag(withTag(task.tags, ZONE_TAG, zone), ACTIVITY_TAG, activity);
      await updateTask(taskId, {
        title: title.trim() || task.title,
        notes: composedNotes || undefined,
        area,
        projectId,
        recipientId,
        tags,
        dueDate,
        startTime: startTime || undefined,
        endTime: startMin === null ? undefined : toHHMM(startMin + durMin),
        estMinutes: durMin,
      });
      onClose?.();
    } finally {
      setSaving(false);
    }
  };

  const bodyText = () => [title.trim(), notes.trim(), recipe?.trim() ? `Recipe\n${recipe.trim()}` : ""]
    .filter(Boolean).join("\n\n");

  const convert = async (kind: "note" | "journal" | "memory") => {
    try {
      if (kind === "memory") {
        await createMemory({
          title: title.trim() || task.title,
          description: notes.trim() || undefined,
          date: dueDate ?? format(new Date(), "yyyy-MM-dd"),
          memoryType: "highlight",
          tags: task.tags ?? [],
          recipientIds: recipientId ? [recipientId] : [],
        });
        toast.success("Saved as a memory");
      } else if (kind === "journal") {
        await addJournal({
          title: title.trim() || task.title,
          body: bodyText(),
          date: dueDate ?? format(new Date(), "yyyy-MM-dd"),
        });
        toast.success("Saved to your journal");
      } else {
        const n = await createNote({
          title: title.trim() || task.title,
          body: bodyText(),
          projectId,
        });
        toast.success("Saved as a note", {
          action: { label: "Open", onClick: () => { window.location.href = `/notes/${n.id}`; } },
        });
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Could not convert this task");
    }
  };

  return (
    <div className="flex max-h-[70vh] flex-col rounded-md border border-border/60 bg-card/60" onClick={(e) => e.stopPropagation()}>
      <div className="flex shrink-0 items-center gap-2 border-b border-border/40 p-2">
        <BlockCheckbox done={task.done} title={task.title} onToggle={() => void toggleTask(taskId)} className="h-4 w-4" />
        {icon && (icon.kind === "lucide"
          ? <icon.Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          : <span className="shrink-0 text-sm" aria-hidden>{icon.char}</span>)}
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Task title"
          className={cn("h-8 flex-1 text-sm", task.done && "line-through opacity-60")}
        />
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain p-2">
      <div className="flex flex-wrap gap-1">
        {FRAMES.map(f => (
          <button
            key={f.id}
            type="button"
            aria-pressed={activeFrame === f.id}
            onClick={() => setStartTime(activeFrame === f.id ? undefined : f.start)}
            className={cn(
              "rounded-full border px-2 py-0.5 text-[11px] transition-colors",
              activeFrame === f.id ? "border-primary bg-primary/15 text-primary" : "border-border/60 text-muted-foreground hover:bg-muted",
            )}
          >
            {f.label}
          </button>
        ))}
        <span className="ml-auto self-center text-[11px] text-muted-foreground">
          {startMin === null ? "Unscheduled" : `${label12(startMin)}–${label12(endMin!)}`}
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <Input
          type="time"
          value={startTime ?? ""}
          aria-label="Start time"
          onChange={(e) => setStartTime(e.target.value || undefined)}
          className="h-8 flex-1 text-xs"
        />
        <Input
          type="time"
          value={endMin === null ? "" : toHHMM(endMin)}
          aria-label="End time"
          disabled={startMin === null}
          onChange={(e) => {
            const em = toMin(e.target.value);
            if (em === null || startMin === null) return;
            const diff = em - startMin;
            setDurMin(Math.max(5, diff > 0 ? diff : diff + 1440));
          }}
          className="h-8 flex-1 text-xs"
        />
      </div>

      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" aria-label="Decrease duration by 15 minutes"
          onClick={() => setDurMin(d => Math.max(5, d - 15))}>
          <Minus className="h-3.5 w-3.5" />
        </Button>
        <div className="flex min-w-0 flex-1 flex-wrap justify-center gap-1">
          {DURATIONS.map(d => (
            <button
              key={d}
              type="button"
              onClick={() => setDurMin(d)}
              aria-pressed={durMin === d}
              className={cn(
                "rounded-full border px-2 py-0.5 text-[11px] transition-colors",
                durMin === d ? "border-primary bg-primary/15 text-primary" : "border-border/60 text-muted-foreground hover:bg-muted",
              )}
            >
              {d < 60 ? `${d}m` : d % 60 === 0 ? `${d / 60}h` : `${Math.floor(d / 60)}h${d % 60}`}
            </button>
          ))}
        </div>
        <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" aria-label="Increase duration by 15 minutes"
          onClick={() => setDurMin(d => Math.min(720, d + 15))}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn("h-8 flex-1 justify-start text-xs font-normal", !dueDate && "text-muted-foreground")}
            >
              <CalendarIcon className="mr-1.5 h-3 w-3" />
              {dueDate ? format(parseISO(dueDate), "EEE, MMM d") : "No due date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dueDate ? parseISO(dueDate) : undefined}
              onSelect={(d) => setDueDate(d ? format(d, "yyyy-MM-dd") : undefined)}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
        {dueDate && (
          <Button variant="ghost" size="sm" className="h-8 px-2 text-[11px]" onClick={() => setDueDate(undefined)}>
            Clear
          </Button>
        )}
      </div>
      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes"
        rows={2}
        className="min-h-[48px] resize-none text-xs"
      />

      {/* Tracking: what kind of work this is, and who/where it's for */}
      <Section label="Tracking" defaultOpen>
        <div className="grid grid-cols-2 gap-1.5">
          <div className="space-y-1">
            <FieldLabel>Activity</FieldLabel>
            <Select value={activity ?? "none"} onValueChange={(v) => setActivity(v === "none" ? undefined : v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Not set" /></SelectTrigger>
              <SelectContent className="z-[60] max-h-64">
                <SelectItem value="none" className="text-xs">Not set</SelectItem>
                {ACTIVITIES.map(a => (
                  <SelectItem key={a.id} value={a.id} className="text-xs">
                    <span className="flex items-center gap-1.5">
                      <a.icon className="h-3 w-3" style={{ color: a.color }} aria-hidden />
                      {a.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <FieldLabel>Area</FieldLabel>
            <Select value={area} onValueChange={(v) => setArea(v as Area)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent className="z-[60] max-h-64">
                {AREAS.map(a => <SelectItem key={a} value={a} className="text-xs">{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {(state.projects?.length ?? 0) > 0 && (
            <div className="space-y-1">
              <FieldLabel>Project</FieldLabel>
              <Select value={projectId ?? "none"} onValueChange={(v) => setProjectId(v === "none" ? undefined : v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent className="z-[60] max-h-64">
                  <SelectItem value="none" className="text-xs">None</SelectItem>
                  {(state.projects ?? []).map(p => <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {(state.recipients?.length ?? 0) > 0 && (
            <div className="space-y-1">
              <FieldLabel>Caregiving for</FieldLabel>
              <Select value={recipientId ?? "none"} onValueChange={(v) => setRecipientId(v === "none" ? undefined : v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent className="z-[60] max-h-64">
                  <SelectItem value="none" className="text-xs">None</SelectItem>
                  {(state.recipients ?? []).map(r => <SelectItem key={r.id} value={r.id} className="text-xs">{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {(area === "Home" || activity === "cleaning") && (
            <div className="space-y-1">
              <FieldLabel>Zone</FieldLabel>
              <Select value={zone ?? "none"} onValueChange={(v) => setZone(v === "none" ? undefined : v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent className="z-[60] max-h-64">
                  <SelectItem value="none" className="text-xs">None</SelectItem>
                  {ZONES.map(z => <SelectItem key={z} value={z} className="text-xs">{z}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {!activity && inferred && (
          <button
            type="button"
            onClick={() => setActivity(inferred.id)}
            className="mt-1 inline-flex items-center gap-1 rounded-full border border-dashed border-border/70 px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <inferred.icon className="h-3 w-3" style={{ color: inferred.color }} aria-hidden />
            Track as {inferred.label}?
          </button>
        )}

        {area === "Meals" && (
          <div className="space-y-1.5 pt-1.5">
            <div className="flex items-center justify-between">
              <FieldLabel>Recipe</FieldLabel>
              <button
                type="button"
                aria-pressed={recipe !== null}
                onClick={() => setRecipe(r => (r === null ? "" : null))}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition-colors",
                  recipe !== null ? "border-primary bg-primary/15 text-primary" : "border-border/60 text-muted-foreground hover:bg-muted",
                )}
              >
                <ChefHat className="h-3 w-3" /> {recipe !== null ? "On" : "Off"}
              </button>
            </div>
            {recipe !== null && (
              <Textarea
                value={recipe}
                onChange={(e) => setRecipe(e.target.value)}
                placeholder="Ingredients, steps, notes…"
                rows={3}
                className="min-h-[60px] resize-none text-xs"
              />
            )}
          </div>
        )}
      </Section>

      {/* Convert */}
      <Section label="Turn into">
        <div className="flex flex-wrap items-center gap-1">
          <Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-[11px]" onClick={() => void convert("note")}>
            <FileText className="h-3 w-3" /> Note
          </Button>
          <Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-[11px]" onClick={() => void convert("journal")}>
            <BookOpen className="h-3 w-3" /> Journal
          </Button>
          <Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-[11px]" onClick={() => void convert("memory")}>
            <Heart className="h-3 w-3" /> Memory
          </Button>
        </div>
      </Section>
      </div>

      <div className="flex shrink-0 items-center justify-end gap-1 border-t border-border/40 p-2">
        {onClose && (
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
        )}
        <Button size="sm" className="h-7 text-xs" onClick={save} disabled={saving}>
          Save
        </Button>
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{children}</div>;
}

function Section({ label, defaultOpen, children }: { label: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border-t border-border/40 pt-1.5">
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded px-1 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground hover:bg-muted/50">
        {label}
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-1.5 pt-1.5">{children}</CollapsibleContent>
    </Collapsible>
  );
}
