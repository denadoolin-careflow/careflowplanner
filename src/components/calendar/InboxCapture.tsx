import { useEffect, useMemo, useRef, useState } from "react";
import * as chrono from "chrono-node";
import { format } from "date-fns";
import { useStore } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Inbox as InboxIcon,
  CheckSquare,
  CalendarClock,
  StickyNote,
  Lightbulb,
  Target,
  Sparkles,
  Bell,
  Loader2,
} from "lucide-react";

type Kind = "auto" | "task" | "appointment" | "note" | "idea" | "goal" | "reminder";

const KINDS: { k: Kind; label: string; Icon: any }[] = [
  { k: "auto",        label: "Auto",        Icon: Sparkles },
  { k: "task",        label: "Task",        Icon: CheckSquare },
  { k: "appointment", label: "Appointment", Icon: CalendarClock },
  { k: "reminder",    label: "Reminder",    Icon: Bell },
  { k: "note",        label: "Note",        Icon: StickyNote },
  { k: "idea",        label: "Idea",        Icon: Lightbulb },
  { k: "goal",        label: "Goal",        Icon: Target },
];

/** Heuristic auto-detect of capture intent. */
function detectKind(text: string): Exclude<Kind, "auto"> {
  const t = text.toLowerCase();
  if (/\b(appt|appointment|meeting|call|doctor|dentist|visit|checkup|consult)\b/.test(t)) return "appointment";
  if (/\b(remind|reminder|don't forget|dont forget)\b/.test(t)) return "reminder";
  if (/\b(idea|maybe|someday|what if|consider)\b/.test(t)) return "idea";
  if (/\b(goal|aim|target|aspire|by end of)\b/.test(t)) return "goal";
  if (/^(note:|note\s)|\bjournal\b|\bthought\b/.test(t)) return "note";
  return "task";
}

/** Strip the matched chrono date phrase from input to keep a clean title. */
function cleanTitle(text: string, parsed: chrono.ParsedResult[]): string {
  let out = text;
  for (const r of parsed) out = out.replace(r.text, "");
  return out.replace(/\s{2,}/g, " ").replace(/\s*[,;:-]\s*$/g, "").trim();
}

export function InboxCapture({ defaultDate }: { defaultDate?: Date }) {
  const { addTask, addAppointment, addIdea, addGoal } = useStore();
  const [value, setValue] = useState("");
  const [kind, setKind] = useState<Kind>("auto");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Live NLP preview
  const preview = useMemo(() => {
    if (!value.trim()) return null;
    const ref = defaultDate ?? new Date();
    const parsed = chrono.parse(value, ref, { forwardDate: true });
    const date = parsed[0]?.start?.date();
    const hasTime = parsed[0]?.start?.isCertain("hour");
    const detected = kind === "auto" ? detectKind(value) : kind;
    const title = parsed.length ? cleanTitle(value, parsed) : value.trim();
    return { detected, title, date: date ?? null, hasTime: !!hasTime };
  }, [value, kind, defaultDate]);

  // Cmd/Ctrl+K to focus
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const submit = async () => {
    if (!preview || !preview.title) return;
    setBusy(true);
    try {
      const dateISO = preview.date ? format(preview.date, "yyyy-MM-dd") : undefined;
      const time = preview.hasTime && preview.date ? format(preview.date, "HH:mm") : undefined;

      switch (preview.detected) {
        case "appointment":
          if (!dateISO) {
            toast("Add a date for appointments (e.g. “next Thursday at 2”).");
            setBusy(false);
            return;
          }
          await addAppointment({ title: preview.title, date: dateISO, time });
          toast(`Appointment scheduled — ${format(preview.date!, "MMM d")}${time ? " at " + time : ""}`);
          break;
        case "idea":
          await addIdea({ title: preview.title });
          toast(`Captured idea`);
          break;
        case "goal":
          await addGoal({ title: preview.title });
          toast(`New goal captured`);
          break;
        case "note":
          // Notes live in the notes table; treat as a quick task tagged "note" for now,
          // until Phase 5 ships the rich notes editor capture path.
          await addTask({ title: preview.title, dueDate: dateISO, inbox: !dateISO, tags: ["note"] as any });
          toast(`Saved as note`);
          break;
        case "reminder":
        case "task":
        default:
          await addTask({ title: preview.title, dueDate: dateISO, inbox: !dateISO });
          toast(dateISO ? `Scheduled for ${format(preview.date!, "MMM d")}` : `Added to Inbox`);
      }
      setValue("");
      setKind("auto");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not capture");
    } finally {
      setBusy(false);
    }
  };

  const Detected = KINDS.find(k => k.k === (preview?.detected ?? "task"))?.Icon ?? CheckSquare;

  return (
    <div className="cozy-card gradient-calm group p-4 sm:p-5">
      <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
        <InboxIcon className="h-3.5 w-3.5" />
        <span className="font-medium">Inbox capture</span>
        <span className="opacity-60">— type anything: “Doctor appointment next Thursday at 2” or “Pay insurance bill on the 15th”</span>
        <kbd className="ml-auto hidden rounded border border-border/60 bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline">⌘K</kbd>
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); submit(); }}
        className="flex flex-col gap-2 sm:flex-row sm:items-center"
      >
        <div className="relative flex-1">
          <Detected className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
          <Input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Capture a task, appointment, note, idea, goal…"
            className="h-11 pl-9 text-sm"
          />
        </div>
        <Button type="submit" disabled={!preview?.title || busy} className="h-11 gap-1.5 px-5">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Capture
        </Button>
      </form>

      {/* Type chips */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {KINDS.map(({ k, label, Icon }) => {
          const active = kind === k || (kind === "auto" && k !== "auto" && preview?.detected === k);
          const isManual = kind === k;
          return (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={cn(
                "flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all",
                isManual
                  ? "border-primary/50 bg-primary text-primary-foreground shadow-sm"
                  : active
                    ? "border-primary/40 bg-primary-soft text-foreground"
                    : "border-border/50 bg-card text-muted-foreground hover:text-foreground hover:border-border",
              )}
            >
              <Icon className="h-3 w-3" /> {label}
            </button>
          );
        })}
      </div>

      {/* Live preview */}
      {preview?.title && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-border/50 bg-card/60 px-3 py-2 text-xs animate-fade-in">
          <Detected className="h-3.5 w-3.5 text-primary" />
          <span className="font-medium text-foreground">{preview.title}</span>
          <span className="text-muted-foreground">·</span>
          <span className="capitalize text-muted-foreground">{preview.detected}</span>
          {preview.date && (
            <>
              <span className="text-muted-foreground">·</span>
              <span className="rounded-full bg-primary-soft px-2 py-0.5 font-medium text-foreground">
                {format(preview.date, preview.hasTime ? "EEE MMM d · h:mm a" : "EEE MMM d")}
              </span>
            </>
          )}
          {!preview.date && (
            <span className="text-muted-foreground">→ Inbox</span>
          )}
        </div>
      )}
    </div>
  );
}