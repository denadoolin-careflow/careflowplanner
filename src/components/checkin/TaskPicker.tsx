import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/types";

export interface TaskPickerProps {
  tasks: Task[];
  /** Rendered inside the trigger button. */
  label: string;
  muted?: boolean;
  className?: string;
  /** Currently linked task id, shown with a check in the list. */
  selectedId?: string | null;
  onSelectTask: (taskId: string) => void;
  onCreate: (title: string) => void;
}

/** Type-or-select control: search existing tasks, or create one from free text. */
export function TaskPicker({ tasks, label, muted, className, selectedId, onSelectTask, onCreate }: TaskPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = tasks.filter((t) => (!t.done || t.id === selectedId) && !t.parentTaskId && t.status !== "parked");
    const filtered = q ? pool.filter((t) => t.title.toLowerCase().includes(q)) : pool;
    return filtered.slice(0, 40);
  }, [tasks, query, selectedId]);

  const typed = query.trim();

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQuery(""); }}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "h-auto w-full justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-[15px] font-normal hover:bg-muted/60",
            muted && "text-muted-foreground",
            className,
          )}
        >
          <span className="min-w-0 flex-1 truncate">{label}</span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(22rem,90vw)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder="Search tasks or type a new one…"
          />
          <CommandList>
            {options.length === 0 && !typed && <CommandEmpty>No tasks yet.</CommandEmpty>}
            {typed && (
              <CommandGroup heading="Create">
                <CommandItem
                  value={`__create__${typed}`}
                  onSelect={() => { onCreate(typed); setOpen(false); setQuery(""); }}
                >
                  <Plus className="mr-2 h-3.5 w-3.5" />
                  Create “{typed}”
                </CommandItem>
              </CommandGroup>
            )}
            {options.length > 0 && (
              <CommandGroup heading="Your tasks">
                {options.map((t) => (
                  <CommandItem
                    key={t.id}
                    value={t.id}
                    onSelect={() => { onSelectTask(t.id); setOpen(false); setQuery(""); }}
                  >
                    <Check className={cn("mr-2 h-3.5 w-3.5", t.id === selectedId ? "opacity-100" : "opacity-0")} />
                    <span className="min-w-0 flex-1 truncate">{t.title}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
