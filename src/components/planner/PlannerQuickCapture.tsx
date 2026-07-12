import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/store";
import { parseTaskInput } from "@/lib/nlp-task";
import { toast } from "sonner";
import { format } from "date-fns";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  defaultDate?: Date;
}

export function PlannerQuickCapture({ open, onOpenChange, defaultDate }: Props) {
  const { addTask } = useStore();
  const [text, setText] = useState("");
  useEffect(() => { if (open) setText(""); }, [open]);

  const parsed = text ? parseTaskInput(text) : null;

  const submit = async () => {
    if (!text.trim()) return;
    const p = parseTaskInput(text);
    await addTask({
      title: p.title || text,
      area: p.area ?? "Personal",
      priority: p.priority ?? "medium",
      done: false,
      dueDate: p.dueDate ?? (defaultDate ? format(defaultDate, "yyyy-MM-dd") : undefined),
      startTime: p.time,
      estMinutes: p.estMinutes,
      tags: p.tags,
      energy: p.energy,
      recurrenceType: p.recurrenceType,
      recurrenceInterval: p.recurrenceInterval,
      recurrenceDays: p.recurrenceDays,
      inbox: !p.dueDate && !defaultDate,
    } as any);
    toast.success("Captured");
    setText("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-3 p-4">
        <DialogTitle className="text-xs uppercase tracking-wider text-muted-foreground">Quick capture</DialogTitle>
        <Input
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void submit(); } }}
          placeholder="Try: Doctor tomorrow at 3pm #health p1 for 30m"
          className="h-11 text-base"
        />
        {parsed && parsed.chips.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {parsed.chips.map((c, i) => (
              <span key={i} className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-primary">
                {c.label}
              </span>
            ))}
          </div>
        )}
        <p className="text-[11px] text-muted-foreground">Enter to save · Esc to close · Use #tag @area p1-4 for 30m tomorrow at 3pm</p>
      </DialogContent>
    </Dialog>
  );
}