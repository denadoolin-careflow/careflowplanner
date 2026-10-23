import { useEffect, useMemo, useState } from "react";
import { BookOpenText, CalendarDays, Check, ChevronDown, Inbox as InboxIcon } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { getNote, listNotes, updateNote, type Note } from "@/lib/notes";
import { openDailyNoteWithTemplate } from "@/lib/notes/daily";
import { cn } from "@/lib/utils";

/** "inbox" keeps the normal capture flow; "today" = today's notebook; "note:<id>" = any note. */
export type SaveTo = "inbox" | "today" | `note:${string}`;

/** Append text to today's daily note or a chosen note. Returns the note id. */
export async function appendCaptureToNote(target: Exclude<SaveTo, "inbox">, text: string): Promise<{ id: string; title: string }> {
  const note = target === "today"
    ? await openDailyNoteWithTemplate(format(new Date(), "yyyy-MM-dd"))
    : await getNote(target.slice(5));
  if (!note) throw new Error("That note is no longer available");
  const fresh = (await getNote(note.id)) ?? note;
  const body = (fresh.body ?? "").replace(/\s+$/, "");
  await updateNote(fresh.id, { body: `${body}${body ? "\n\n" : ""}${text.trim()}` });
  return { id: fresh.id, title: target === "today" ? "today's notebook" : fresh.title || "note" };
}

export function CaptureSaveTo({ value, onChange }: { value: SaveTo; onChange: (v: SaveTo) => void }) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  useEffect(() => { if (open && !notes.length) void listNotes().then(setNotes).catch(() => {}); }, [open, notes.length]);
  const recent = useMemo(() => [...notes].filter(n => n.kind === "note" || !n.kind).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 40), [notes]);
  const [label, setLabel] = useState("Inbox");
  useEffect(() => { if (value === "inbox") setLabel("Inbox"); else if (value === "today") setLabel("Today's notebook"); }, [value]);
  const pick = (v: SaveTo, l: string) => { onChange(v); setLabel(l); setOpen(false); };

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <span className="shrink-0 text-[11px] text-muted-foreground">Save to</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="ghost" size="sm" className="h-9 min-w-0 max-w-[14rem] gap-1.5 rounded-full px-3" aria-label="Choose where to save">
            {value === "inbox" ? <InboxIcon className="h-3.5 w-3.5 shrink-0" /> : value === "today" ? <CalendarDays className="h-3.5 w-3.5 shrink-0" /> : <BookOpenText className="h-3.5 w-3.5 shrink-0" />}
            <span className="truncate">{label}</span><ChevronDown className="h-3.5 w-3.5 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[min(22rem,calc(100vw-2rem))] p-0">
          <Command>
            <CommandInput placeholder="Search notes…" />
            <CommandList>
              <CommandEmpty>No matching notes.</CommandEmpty>
              <CommandGroup heading="Capture">
                <Item value="inbox" active={value === "inbox"} icon={InboxIcon} label="Inbox" onSelect={() => pick("inbox", "Inbox")} />
                <Item value="today's notebook daily" active={value === "today"} icon={CalendarDays} label="Today's notebook" onSelect={() => pick("today", "Today's notebook")} />
              </CommandGroup>
              <CommandGroup heading="Add to a note">
                {recent.map(n => (
                  <Item key={n.id} value={`${n.title} ${n.id}`} active={value === `note:${n.id}`} icon={BookOpenText} label={n.title || "Untitled"} onSelect={() => pick(`note:${n.id}`, n.title || "Untitled")} />
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function Item({ value, active, icon: Icon, label, onSelect }: { value: string; active: boolean; icon: React.ComponentType<{ className?: string }>; label: string; onSelect: () => void }) {
  return (
    <CommandItem value={value} onSelect={onSelect} className="min-h-11 gap-2">
      <Icon className="h-4 w-4 text-primary" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <Check className={cn("h-4 w-4", active ? "opacity-100" : "opacity-0")} aria-hidden />
    </CommandItem>
  );
}
