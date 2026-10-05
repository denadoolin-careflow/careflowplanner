import { useMemo, useState } from "react";
import { BookOpenText, Check, ChevronDown, ListTodo, NotebookPen, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { NlpHighlightedInput } from "@/components/inbox/NlpHighlightedInput";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { createNote, updateNote, type Note } from "@/lib/notes";
import { parseTaskInput } from "@/lib/nlp-task";
import type { Task } from "@/lib/types";
import { cn } from "@/lib/utils";

type Destination = "new-note" | "task" | `note:${string}`;

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
  const targetNote = destination.startsWith("note:") ? notes.find(note => `note:${note.id}` === destination) : undefined;
  const destinationLabel = destination === "new-note" ? "New note" : destination === "task" ? "Task" : targetNote?.title || "Selected note";
  const recentNotes = useMemo(() => [...notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [notes]);

  const submit = async () => {
    const raw = text.trim();
    if (!raw || saving) return;
    setSaving(true);
    try {
      if (destination === "task") {
        const parsed = parseTaskInput(raw);
        const project = parsed.projectName
          ? projects.find(item => item.name.toLowerCase() === parsed.projectName?.toLowerCase())
          : undefined;
        const id = await addTask({
          title: parsed.title || raw,
          dueDate: parsed.dueDate,
          startDate: parsed.time ? parsed.dueDate : undefined,
          startTime: parsed.time,
          priority: parsed.priority,
          area: parsed.area,
          tags: parsed.tags,
          energy: parsed.energy,
          estMinutes: parsed.estMinutes,
          projectId: project?.id,
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
      } else if (targetNote) {
        const separator = targetNote.body.trim() ? "\n\n" : "";
        await updateNote(targetNote.id, { body: `${targetNote.body}${separator}${raw}` });
        toast.success(`Added to ${targetNote.title || "note"}`);
        await onCreated({ kind: "append", id: targetNote.id });
      } else {
        const title = raw.length > 80 ? `${raw.slice(0, 77).trimEnd()}…` : raw;
        const note = await createNote({ title, body: raw });
        toast.success("Note created");
        await onCreated({ kind: "note", id: note.id });
      }
      setText("");
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
            if (event.key === "Enter") { event.preventDefault(); void submit(); }
          }}
          placeholder="What’s on your mind? Try ‘Call Mum tomorrow 3pm #care’"
          disabled={saving}
          leftPad="pl-10"
          rightPad="pr-12"
          className="!h-12"
        />
        <Button
          type="button"
          size="icon"
          onClick={() => void submit()}
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
        <span className="ml-auto hidden text-[10px] text-muted-foreground sm:inline">Enter to save</span>
      </div>
    </section>
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