import { useMemo, useState } from "react";
import { BookOpenText, CalendarDays, Check, ChevronDown, Clock3, ListTodo, NotebookPen, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { NlpHighlightedInput } from "@/components/inbox/NlpHighlightedInput";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { createNote, getNote, updateNote, type Note } from "@/lib/notes";
import { parseTaskInput } from "@/lib/nlp-task";
import type { Task } from "@/lib/types";
import { AREAS, type Area, type Priority } from "@/lib/types";
import { cn } from "@/lib/utils";

type Destination = "new-note" | "task" | `note:${string}`;
type ReviewDraft = {
  destination: Destination;
  title: string;
  content: string;
  dueDate: string;
  time: string;
  priority: Priority;
  area: Area | "";
  tags: string;
  estMinutes: string;
  projectId: string;
};

export function NotesCaptureBox({
  notes,
  projects,
  addTask,
  onCreated,
}: {
  notes: Note[];
  projects: { id: string; name: string }[];
  addTask: (task: Partial<Task> & { title: string }) => Promise<string | undefined>;
  onCreated: (result?: { kind: "note" | "task" | "append"; id?: string }) => Promise<void> | void;
}) {
  const [text, setText] = useState("");
  const [destination, setDestination] = useState<Destination>("new-note");
  const [menuOpen, setMenuOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [review, setReview] = useState<ReviewDraft | null>(null);
  const targetNote = destination.startsWith("note:") ? notes.find(note => `note:${note.id}` === destination) : undefined;
  const destinationLabel = destination === "new-note" ? "New note" : destination === "task" ? "Task" : targetNote?.title || "Selected note";
  const recentNotes = useMemo(() => [...notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [notes]);

  const openReview = () => {
    const raw = text.trim();
    if (!raw || saving) return;
    const parsed = parseTaskInput(raw);
    const project = parsed.projectName
      ? projects.find(item => item.name.toLowerCase() === parsed.projectName?.toLowerCase())
      : undefined;
    setReview({
      destination,
      title: destination === "task" ? parsed.title || raw : raw.length > 80 ? `${raw.slice(0, 77).trimEnd()}…` : raw,
      content: raw,
      dueDate: parsed.dueDate ?? "",
      time: parsed.time ?? "",
      priority: parsed.priority ?? "medium",
      area: parsed.area ?? "",
      tags: (parsed.tags ?? []).join(", "),
      estMinutes: parsed.estMinutes ? String(parsed.estMinutes) : "",
      projectId: project?.id ?? "",
    });
  };

  const submit = async () => {
    if (!review || saving) return;
    const raw = review.content.trim();
    if (!raw || !review.title.trim()) return;
    setSaving(true);
    try {
      if (review.destination === "task") {
        const parsed = parseTaskInput(raw);
        const id = await addTask({
          title: review.title.trim(),
          notes: raw === review.title.trim() ? undefined : raw,
          dueDate: review.dueDate || undefined,
          startDate: review.time ? review.dueDate || undefined : undefined,
          startTime: review.time || undefined,
          priority: review.priority,
          area: review.area || undefined,
          tags: review.tags.split(",").map(tag => tag.trim().replace(/^#/, "")).filter(Boolean),
          energy: parsed.energy,
          estMinutes: review.estMinutes ? Number(review.estMinutes) : undefined,
          projectId: review.projectId || undefined,
          recurrenceType: parsed.recurrenceType,
          recurrenceInterval: parsed.recurrenceInterval,
          recurrenceDays: parsed.recurrenceDays,
          reminderMinutesBefore: parsed.reminderMinutes,
          status: parsed.someday ? "someday" : "active",
          inbox: !parsed.dueDate,
        });
        if (!id) throw new Error("Could not create the task");
        toast.success("Added to tasks");
        await onCreated({ kind: "task", id });
      } else if (review.destination.startsWith("note:")) {
        const targetId = review.destination.slice(5);
        const latest = await getNote(targetId);
        if (!latest) throw new Error("That note is no longer available");
        const separator = latest.body.trim() ? "\n\n" : "";
        await updateNote(latest.id, { body: `${latest.body}${separator}${raw}` });
        toast.success(`Added to ${latest.title || "note"}`);
        await onCreated({ kind: "append", id: latest.id });
      } else {
        const note = await createNote({ title: review.title.trim(), body: raw });
        toast.success("Note created");
        await onCreated({ kind: "note", id: note.id });
      }
      setText("");
      setReview(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save your capture");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="notes-quick-capture mb-3 rounded-2xl border p-2" aria-label="Quick capture">
      <div className="relative">
        <BookOpenText className="pointer-events-none absolute left-3 top-1/2 z-30 h-4 w-4 -translate-y-1/2 text-primary" aria-hidden />
        <NlpHighlightedInput
          value={text}
          onChange={setText}
          onKeyDown={event => {
            if (event.key === "Enter") { event.preventDefault(); openReview(); }
          }}
          placeholder="What’s on your mind?"
          disabled={saving}
          leftPad="pl-10"
          rightPad="pr-12"
          className="!h-12"
        />
        <Button
          type="button"
          size="icon"
          onClick={openReview}
          disabled={!text.trim() || saving}
          aria-label={`Add to ${destinationLabel}`}
          className="absolute right-1 top-1/2 z-30 h-10 w-10 -translate-y-1/2 rounded-full"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="mt-2 flex items-center gap-2 px-1">
        <span className="text-[11px] text-muted-foreground">Add to</span>
        <Popover open={menuOpen} onOpenChange={setMenuOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-9 min-w-0 max-w-[calc(100%-3rem)] gap-1.5 rounded-full px-3" aria-label="Choose capture destination">
              {destination === "task" ? <ListTodo className="h-3.5 w-3.5 shrink-0" /> : <NotebookPen className="h-3.5 w-3.5 shrink-0" />}
              <span className="truncate">{destinationLabel}</span><ChevronDown className="h-3.5 w-3.5 shrink-0" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-[min(22rem,calc(100vw-2rem))] p-0">
            <Command>
              <CommandInput placeholder="Search notes…" />
              <CommandList>
                <CommandEmpty>No matching notes.</CommandEmpty>
                <CommandGroup heading="Create">
                  <CaptureDestination value="new note" active={destination === "new-note"} icon={NotebookPen} label="New note" onSelect={() => { setDestination("new-note"); setMenuOpen(false); }} />
                  <CaptureDestination value="task" active={destination === "task"} icon={ListTodo} label="Task" onSelect={() => { setDestination("task"); setMenuOpen(false); }} />
                </CommandGroup>
                <CommandGroup heading="Add to an existing note">
                  {recentNotes.map(note => (
                    <CaptureDestination key={note.id} value={`${note.title} ${note.body.slice(0, 80)}`} active={destination === `note:${note.id}`} icon={BookOpenText} label={note.title || "Untitled"} onSelect={() => { setDestination(`note:${note.id}`); setMenuOpen(false); }} />
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <span className="ml-auto hidden text-[10px] text-muted-foreground sm:inline">Enter to review</span>
      </div>
      <CaptureReviewDialog review={review} setReview={setReview} notes={notes} projects={projects} saving={saving} onConfirm={() => void submit()} />
    </section>
  );
}

function CaptureReviewDialog({ review, setReview, notes, projects, saving, onConfirm }: {
  review: ReviewDraft | null;
  setReview: React.Dispatch<React.SetStateAction<ReviewDraft | null>>;
  notes: Note[];
  projects: { id: string; name: string }[];
  saving: boolean;
  onConfirm: () => void;
}) {
  if (!review) return null;
  const target = review.destination.startsWith("note:") ? notes.find(note => note.id === review.destination.slice(5)) : undefined;
  const kind = review.destination === "task" ? "task" : target ? "addition" : "note";
  const update = <K extends keyof ReviewDraft>(key: K, value: ReviewDraft[K]) => setReview(current => current ? { ...current, [key]: value } : current);
  return (
    <Dialog open onOpenChange={open => { if (!open && !saving) setReview(null); }}>
      <DialogContent className="max-h-[88dvh] w-[calc(100%-1.5rem)] overflow-y-auto rounded-2xl p-5 sm:max-w-xl">
        <DialogHeader className="pr-6 text-left">
          <DialogTitle className="font-display text-xl">Review {kind}</DialogTitle>
          <DialogDescription>{target ? `This will be added to “${target.title || "Untitled"}”.` : "Check what was detected before saving."}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {!target && <label className="block space-y-1.5"><span className="text-xs font-medium text-muted-foreground">{kind === "task" ? "Task name" : "Title"}</span><Input value={review.title} onChange={event => update("title", event.target.value)} autoFocus /></label>}
          <label className="block space-y-1.5"><span className="text-xs font-medium text-muted-foreground">{target ? "Text to add" : kind === "task" ? "Original capture / notes" : "Note"}</span><Textarea value={review.content} onChange={event => update("content", event.target.value)} rows={4} autoFocus={Boolean(target)} /></label>
          {kind === "task" && <>
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1.5"><span className="flex items-center gap-1 text-xs font-medium text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" />Date</span><Input type="date" value={review.dueDate} onChange={event => update("dueDate", event.target.value)} /></label>
              <label className="space-y-1.5"><span className="flex items-center gap-1 text-xs font-medium text-muted-foreground"><Clock3 className="h-3.5 w-3.5" />Time</span><Input type="time" value={review.time} onChange={event => update("time", event.target.value)} /></label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1.5"><span className="text-xs font-medium text-muted-foreground">Priority</span><Select value={review.priority} onValueChange={value => update("priority", value as Priority)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem></SelectContent></Select></label>
              <label className="space-y-1.5"><span className="text-xs font-medium text-muted-foreground">Area</span><Select value={review.area || "none"} onValueChange={value => update("area", value === "none" ? "" : value as Area)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">No area</SelectItem>{AREAS.map(area => <SelectItem key={area} value={area}>{area}</SelectItem>)}</SelectContent></Select></label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1.5"><span className="text-xs font-medium text-muted-foreground">Project</span><Select value={review.projectId || "none"} onValueChange={value => update("projectId", value === "none" ? "" : value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">No project</SelectItem>{projects.map(project => <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>)}</SelectContent></Select></label>
              <label className="space-y-1.5"><span className="text-xs font-medium text-muted-foreground">Minutes</span><Input inputMode="numeric" value={review.estMinutes} onChange={event => update("estMinutes", event.target.value.replace(/\D/g, ""))} placeholder="Optional" /></label>
            </div>
            <label className="block space-y-1.5"><span className="text-xs font-medium text-muted-foreground">Tags</span><Input value={review.tags} onChange={event => update("tags", event.target.value)} placeholder="care, family" /></label>
          </>}
        </div>
        <DialogFooter className="gap-2 sm:space-x-0">
          <Button type="button" variant="ghost" onClick={() => setReview(null)} disabled={saving}>Keep editing</Button>
          <Button type="button" onClick={onConfirm} disabled={saving || !review.title.trim() || !review.content.trim()}>{saving ? "Saving…" : target ? "Add to note" : `Save ${kind}`}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CaptureDestination({ value, active, icon: Icon, label, onSelect }: {
  value: string;
  active: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onSelect: () => void;
}) {
  return (
    <CommandItem value={value} onSelect={onSelect} className="min-h-11 gap-2">
      <Icon className="h-4 w-4 text-primary" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <Check className={cn("h-4 w-4", active ? "opacity-100" : "opacity-0")} aria-hidden />
    </CommandItem>
  );
}