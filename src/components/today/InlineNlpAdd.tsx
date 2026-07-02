import { useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { NlpHighlightedInput } from "@/components/inbox/NlpHighlightedInput";
import { parseTaskInput } from "@/lib/nlp-task";
import { useStore } from "@/lib/store";
import type { Area, Task } from "@/lib/types";
import { cn } from "@/lib/utils";

type Defaults = Partial<Pick<Task, "dueDate" | "dueTime" | "area" | "projectId" | "priority" | "tags" | "status" | "parentTaskId">>;

interface Props {
  label?: string;
  placeholder?: string;
  defaults?: Defaults;
  /** Snap parsed/absent time into a slot window (24h hour range). */
  slotHours?: [number, number];
  className?: string;
  compact?: boolean;
}

/** Compact NLP quick-add row used across Today cards (Schedule, Progress, Upcoming, Focus). */
export function InlineNlpAdd({ label = "Add task", placeholder = "Add task… (try 'call mom tomorrow 3pm p2 #care')", defaults, slotHours, className, compact }: Props) {
  const { addTask } = useStore();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const snapTime = (t?: string): string | undefined => {
    if (!slotHours) return t;
    const [lo, hi] = slotHours;
    if (t) {
      const h = Number(t.slice(0, 2));
      if (h >= lo && h < hi) return t;
    }
    // default to middle of slot
    const mid = Math.floor((lo + hi) / 2);
    return `${String(mid).padStart(2, "0")}:00`;
  };

  const submit = async () => {
    const raw = text.trim();
    if (!raw) { setOpen(false); return; }
    const p = parseTaskInput(raw);
    const dueTime = snapTime(p.time ?? (defaults as any)?.dueTime);
    await addTask({
      title: p.title || raw,
      dueDate: p.dueDate ?? defaults?.dueDate,
      dueTime: dueTime as any,
      priority: (p.priority ?? defaults?.priority ?? "medium") as any,
      area: ((p.area ?? defaults?.area) ?? "Personal") as Area,
      tags: p.tags?.length ? p.tags : defaults?.tags,
      projectId: defaults?.projectId,
      parentTaskId: defaults?.parentTaskId,
      status: defaults?.status ?? (p.someday ? "someday" : "active"),
      done: false,
      inbox: false,
    } as any);
    setText("");
    // keep composer open so users can add several in a row
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 0); }}
        className={cn(
          "mt-1.5 flex w-full items-center justify-center gap-1 rounded-full py-1 text-[11px] font-medium text-primary/80 transition hover:bg-primary/10 hover:text-primary",
          className,
        )}
      >
        <Plus className="h-3 w-3" /> {label}
      </button>
    );
  }

  return (
    <div className={cn("mt-1.5", className)}>
      <div className={cn("relative", compact && "text-xs")}>
        <NlpHighlightedInput
          ref={inputRef}
          value={text}
          onChange={setText}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); void submit(); }
            if (e.key === "Escape") { setText(""); setOpen(false); }
          }}
          onBlur={() => { if (!text.trim()) setOpen(false); }}
          placeholder={placeholder}
          leftPad="pl-3"
          rightPad="pr-8"
          className="!h-10"
        />
        <button
          type="button"
          onClick={() => { setText(""); setOpen(false); }}
          className="absolute right-2 top-1/2 z-30 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted"
          aria-label="Close"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}