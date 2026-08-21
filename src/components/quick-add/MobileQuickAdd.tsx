import { useEffect, useMemo, useRef, useState } from "react";
import { CheckSquare, CalendarHeart, NotebookPen, Soup, Flame, Lightbulb, ChevronDown, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStore, todayISO } from "@/lib/store";
import { parseTaskInput } from "@/lib/nlp-task";
import { haptics } from "@/lib/haptics";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { QuickAddKind } from "@/lib/quick-add-presets";
import { MINIMAL_KINDS, getLastQuickAddKind, setLastQuickAddKind } from "@/lib/quick-add-last";

const META: Record<string, { label: string; icon: any; placeholder: string; cta: string }> = {
  task:        { label: "Task",    icon: CheckSquare,   placeholder: "What needs doing?",     cta: "Add task" },
  appointment: { label: "Appt",    icon: CalendarHeart, placeholder: "Appointment title",     cta: "Add appointment" },
  journal:     { label: "Journal", icon: NotebookPen,   placeholder: "A few words is enough", cta: "Save entry" },
  meal:        { label: "Meal",    icon: Soup,          placeholder: "Meal name",             cta: "Add meal" },
  habit:       { label: "Habit",   icon: Flame,         placeholder: "Tiny habit",            cta: "Add habit" },
  idea:        { label: "Idea",    icon: Lightbulb,     placeholder: "Capture the spark",     cta: "Save idea" },
};

/**
 * Minimal mobile quick-add: opens on the last-used type, autofocuses the one
 * input that matters, and keeps every other field behind "More".
 */
export function MobileQuickAdd({
  initialText = "",
  initialKind,
  onClose,
  onFull,
}: {
  initialText?: string;
  initialKind?: QuickAddKind;
  onClose: () => void;
  onFull: () => void;
}) {
  const { addTask, addAppointment, addJournal, addMeal, addHabit, addIdea } = useStore();
  const [kind, setKind] = useState<QuickAddKind>(() => initialKind ?? getLastQuickAddKind());
  const [text, setText] = useState(initialText);
  const [more, setMore] = useState(false);
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState("");
  const [slot, setSlot] = useState<"Breakfast" | "Lunch" | "Dinner" | "Snack">("Dinner");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => inputRef.current?.focus(), 60);
    return () => window.clearTimeout(id);
  }, [kind]);

  const parsed = useMemo(() => (kind === "task" ? parseTaskInput(text) : null), [kind, text]);
  const meta = META[kind] ?? META.task;

  const pick = (k: QuickAddKind) => { haptics.tap(); setKind(k); setLastQuickAddKind(k); };

  const submit = async () => {
    const raw = text.trim();
    if (!raw || saving) return;
    setSaving(true);
    try {
      if (kind === "task") {
        const p = parsed!;
        await addTask({
          title: p.title || raw,
          area: (p.area ?? "Personal") as any,
          priority: p.priority ?? "medium",
          dueDate: p.dueDate ?? (more ? date : undefined),
          tags: p.tags,
          estMinutes: p.estMinutes,
        } as any);
        toast.success("Task added");
      } else if (kind === "appointment") {
        await addAppointment({ title: raw, date, time: time || undefined } as any);
        toast.success("Appointment saved");
      } else if (kind === "journal") {
        await addJournal({ body: raw } as any);
        toast.success("Captured");
      } else if (kind === "meal") {
        await addMeal({ name: raw, date, slot } as any);
        toast.success("Meal added");
      } else if (kind === "habit") {
        await addHabit({ title: raw } as any);
        toast.success("Habit added");
      } else {
        await addIdea({ title: raw } as any);
        toast.success("Saved to inbox");
      }
      setLastQuickAddKind(kind);
      haptics.tap();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const showsDate = kind === "appointment" || kind === "meal";

  return (
    <div className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Quick add</span>
        <button onClick={onClose} aria-label="Close quick add" className="rounded p-1 hover:bg-muted/60">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Type row — starts on the last-used type */}
      <div className="-mx-1 mb-3 flex gap-1 overflow-x-auto px-1 pb-1 [-webkit-overflow-scrolling:touch]">
        {MINIMAL_KINDS.map((k) => {
          const Icon = META[k].icon;
          const active = k === kind;
          return (
            <button
              key={k}
              type="button"
              onClick={() => pick(k)}
              aria-pressed={active}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors",
                active ? "border-primary/50 bg-primary/10 text-primary" : "border-border/60 text-muted-foreground",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {META[k].label}
            </button>
          );
        })}
      </div>

      {kind === "journal" ? (
        <Textarea
          ref={inputRef as any}
          rows={4}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={meta.placeholder}
          className="text-base"
        />
      ) : (
        <Input
          ref={inputRef as any}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void submit(); } }}
          placeholder={meta.placeholder}
          className="h-12 text-base"
        />
      )}

      {parsed && parsed.chips.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {parsed.chips.map((c, i) => (
            <Badge key={i} variant="outline" className="rounded-full bg-primary/10 text-[10px] uppercase">{c.label}</Badge>
          ))}
        </div>
      )}

      {/* Essential extras only; everything else collapsed */}
      {(showsDate || more) && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {(showsDate || kind === "task") && (
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-10" />
          )}
          {kind === "appointment" && (
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-10" />
          )}
          {kind === "meal" && (
            <select
              value={slot}
              onChange={(e) => setSlot(e.target.value as any)}
              aria-label="Meal slot"
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              {["Breakfast", "Lunch", "Dinner", "Snack"].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between">
        {!showsDate ? (
          <button
            type="button"
            onClick={() => setMore((v) => !v)}
            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
            aria-expanded={more}
          >
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", more && "rotate-180")} />
            {more ? "Fewer options" : "More options"}
          </button>
        ) : <span />}
        <button type="button" onClick={onFull} className="text-[11px] text-muted-foreground hover:text-foreground">
          Full quick add
        </button>
      </div>

      <Button className="mt-3 h-11 w-full" disabled={!text.trim() || saving} onClick={submit}>{meta.cta}</Button>
    </div>
  );
}
