import { useMemo, useState, useRef, useEffect } from "react";
import { Sunrise, Sun, Moon, CheckCircle2, Circle, GripVertical, Plus, ArrowDownToLine } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { hmToHours } from "@/lib/time-blocks";
import { TASK_DRAG_MIME } from "./UnscheduledTasksRail";
import { useLongPressDrag } from "@/lib/long-press-drag";
import { toast } from "sonner";

type ApptLike = {
  label: string;
  time?: string | null;
  id?: string;
  kind?: "appt" | "gcal" | "task" | "bday" | "hol";
};

interface Props {
  days: Date[];
  appointmentsOn: (iso: string) => ApptLike[];
  onTaskDropAt?: (taskId: string, date: string, startHour: number) => void;
  onApptClick?: (apptId: string) => void;
  onTaskClick?: (taskId: string) => void;
}

const PARTS = [
  { key: "morning",   label: "Morning",   icon: Sunrise, range: [5, 12], dropHour: 8,  hint: "5 AM – 12 PM" },
  { key: "afternoon", label: "Afternoon", icon: Sun,     range: [12, 17], dropHour: 13, hint: "12 – 5 PM" },
  { key: "evening",   label: "Evening",   icon: Moon,    range: [17, 24], dropHour: 19, hint: "5 PM – late" },
] as const;

function partOf(hm: string | null | undefined): "morning" | "afternoon" | "evening" | null {
  if (!hm || !/^\d{2}:\d{2}/.test(hm)) return null;
  const h = hmToHours(hm.slice(0, 5));
  for (const p of PARTS) if (h >= p.range[0] && h < p.range[1]) return p.key as any;
  return null;
}

export function DayPartsView({ days, appointmentsOn, onTaskDropAt, onApptClick, onTaskClick }: Props) {
  const { state, toggleTask, addTask } = useStore();
  const day = days[0];
  const iso = day.toISOString().slice(0, 10);
  const [composerPart, setComposerPart] = useState<null | "morning" | "afternoon" | "evening">(null);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => { if (composerPart) inputRef.current?.focus(); }, [composerPart]);
  // Tracks which column the pointer/HTML5 drag is currently over so we can
  // light up that drop target with a strong visual cue.
  const [dragOverPart, setDragOverPart] = useState<null | "morning" | "afternoon" | "evening" | "anytime">(null);
  // Tracks whether any draggable item is currently being dragged anywhere
  // on the page so we can show subtle "drop here" affordances on every
  // valid target — not just the one under the cursor.
  const [anyDragging, setAnyDragging] = useState(false);
  useEffect(() => {
    const onStart = () => setAnyDragging(true);
    const onEnd = () => { setAnyDragging(false); setDragOverPart(null); };
    // HTML5 drag events bubble to document.
    document.addEventListener("dragstart", onStart);
    document.addEventListener("dragend", onEnd);
    document.addEventListener("drop", onEnd);
    // Touch long-press drag uses a custom event lifecycle — approximate by
    // listening for the ghost element added to <body>.
    const obs = new MutationObserver(() => {
      const hasGhost = !!document.querySelector("[data-droppart-active]");
      if (hasGhost) setAnyDragging(true);
    });
    obs.observe(document.body, { childList: true, subtree: false, attributes: true, attributeFilter: ["data-droppart-active"] });
    return () => {
      document.removeEventListener("dragstart", onStart);
      document.removeEventListener("dragend", onEnd);
      document.removeEventListener("drop", onEnd);
      obs.disconnect();
    };
  }, []);

  const submit = async (part: "morning" | "afternoon" | "evening") => {
    const title = draft.trim();
    if (!title) { setComposerPart(null); return; }
    const dayPart = (part[0].toUpperCase() + part.slice(1)) as any;
    await addTask({ title, dueDate: iso, dayPart, inbox: false });
    setDraft("");
    toast(`Added to ${part}`);
  };

  const grouped = useMemo(() => {
    const out: Record<string, { items: { time?: string; label: string; kind: string; id?: string; done?: boolean; taskId?: string }[]; anytime: typeof out extends never ? never : any }> = {
      morning: { items: [], anytime: [] as any },
      afternoon: { items: [], anytime: [] as any },
      evening: { items: [], anytime: [] as any },
    } as any;
    const anytime: { kind: string; label: string; id?: string; done?: boolean; taskId?: string }[] = [];
    for (const a of appointmentsOn(iso)) {
      const p = partOf(a.time);
      const entry = { time: a.time ?? undefined, label: a.label, kind: a.kind ?? "appt", id: a.id };
      if (p) (out as any)[p].items.push(entry);
      else anytime.push(entry);
    }
    // tasks scheduled today (no time) → bucket by dayPart hint or all-day
    for (const t of state.tasks) {
      if (t.done || t.parentTaskId || t.dueDate !== iso) continue;
      // skip if already represented through appointmentsOn (Today.tsx adds them with ○ prefix)
      const already = (out.morning.items as any[]).concat(out.afternoon.items, out.evening.items, anytime).some((x: any) => x.label?.includes(t.title));
      if (already) continue;
      const item = { label: t.title, kind: "task", taskId: t.id, done: t.done };
      const dp = (t.dayPart ?? "").toLowerCase();
      const p = dp === "morning" || dp === "afternoon" || dp === "evening" ? dp : null;
      if (p) (out as any)[p].items.push(item);
      else anytime.push(item);
    }
    for (const k of Object.keys(out)) {
      (out as any)[k].items.sort((a: any, b: any) => (a.time ?? "z").localeCompare(b.time ?? "z"));
    }
    return { ...out, anytime };
  }, [iso, appointmentsOn, state.tasks]);

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {PARTS.map(p => {
        const Icon = p.icon;
        const items = (grouped as any)[p.key].items as any[];
        const isOver = dragOverPart === p.key;
        return (
          <div
            key={p.key}
            data-droppart={p.key}
            data-dropdate={iso}
            onDragEnter={e => {
              if (Array.from(e.dataTransfer.types).includes(TASK_DRAG_MIME)) {
                setDragOverPart(p.key as any);
              }
            }}
            onDragOver={e => {
              if (Array.from(e.dataTransfer.types).includes(TASK_DRAG_MIME)) {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                setDragOverPart(p.key as any);
              }
            }}
            onDragLeave={e => {
              // Only clear if we actually left the column (not just entered a child)
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                setDragOverPart(prev => (prev === p.key ? null : prev));
              }
            }}
            onDrop={e => {
              const id = e.dataTransfer.getData(TASK_DRAG_MIME);
              setDragOverPart(null);
              if (!id || !onTaskDropAt) return;
              e.preventDefault();
              onTaskDropAt(id, iso, p.dropHour);
            }}
            className={cn(
              "group/part relative flex min-h-[180px] flex-col rounded-2xl border bg-card/60 p-3 transition-all duration-150",
              "border-border/60 hover:bg-card/80",
              anyDragging && "border-dashed border-primary/40 bg-primary/[0.03]",
              isOver && "scale-[1.01] border-solid border-primary bg-primary/10 shadow-glow ring-2 ring-primary/40",
              // Long-press drag highlights via data attribute set by the helper
              "data-[droppart-active=true]:scale-[1.01] data-[droppart-active=true]:border-solid data-[droppart-active=true]:border-primary data-[droppart-active=true]:bg-primary/10 data-[droppart-active=true]:shadow-glow data-[droppart-active=true]:ring-2 data-[droppart-active=true]:ring-primary/40",
            )}
          >
            {isOver && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl bg-primary/5 backdrop-blur-[1px]">
                <div className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-[11px] font-medium text-primary-foreground shadow-cozy">
                  <ArrowDownToLine className="h-3 w-3" />
                  Drop into {p.label}
                </div>
              </div>
            )}
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-primary/15 text-primary">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div>
                  <div className="text-sm font-semibold leading-tight">{p.label}</div>
                  <div className="text-[10px] text-muted-foreground">{p.hint}</div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{items.length}</span>
                <button
                  type="button"
                  onClick={() => { setComposerPart(p.key as any); setDraft(""); }}
                  className="grid h-6 w-6 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-primary/15 hover:text-primary"
                  aria-label={`Add task to ${p.label}`}
                  title={`Add task to ${p.label}`}
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            {composerPart === p.key && (
              <form
                onSubmit={(e) => { e.preventDefault(); void submit(p.key as any); }}
                className="mb-2 flex items-center gap-1 rounded-lg border border-border/60 bg-background/80 px-2 py-1"
              >
                <input
                  ref={inputRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={() => { if (!draft.trim()) setComposerPart(null); }}
                  onKeyDown={(e) => { if (e.key === "Escape") { setComposerPart(null); setDraft(""); } }}
                  placeholder={`New ${p.label.toLowerCase()} task…`}
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
                />
                <button
                  type="submit"
                  disabled={!draft.trim()}
                  className="rounded-md bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary disabled:opacity-40"
                >
                  Add
                </button>
              </form>
            )}
            <ul className="flex-1 space-y-1">
              {items.length === 0 && (
                <li className={cn(
                  "rounded-lg border border-dashed p-3 text-center text-[11px] transition-colors",
                  anyDragging
                    ? "border-primary/60 bg-primary/5 text-primary"
                    : "border-border/50 text-muted-foreground",
                )}>
                  {anyDragging ? "Release to drop here" : "Nothing planned. Drop a task here."}
                </li>
              )}
              {items.map((it, i) => {
                return (
                  <DayPartItem
                    key={i}
                    it={it}
                    onApptClick={onApptClick}
                    onTaskClick={onTaskClick}
                    onToggle={toggleTask}
                  />
                );
              })}
            </ul>
          </div>
        );
      })}
      {(grouped as any).anytime.length > 0 && (
        <div
          className={cn(
            "md:col-span-3 rounded-2xl border bg-card/40 p-3 transition-all duration-150",
            "border-border/60",
            anyDragging && "border-dashed border-primary/40 bg-primary/[0.03]",
            dragOverPart === "anytime" && "border-solid border-primary bg-primary/10 ring-2 ring-primary/40",
            "data-[droppart-active=true]:border-solid data-[droppart-active=true]:border-primary data-[droppart-active=true]:bg-primary/10 data-[droppart-active=true]:ring-2 data-[droppart-active=true]:ring-primary/40",
          )}
          data-droppart="morning"
          data-dropdate={iso}
          onDragEnter={e => {
            if (Array.from(e.dataTransfer.types).includes(TASK_DRAG_MIME)) setDragOverPart("anytime");
          }}
          onDragOver={e => {
            if (Array.from(e.dataTransfer.types).includes(TASK_DRAG_MIME)) {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              setDragOverPart("anytime");
            }
          }}
          onDragLeave={e => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
              setDragOverPart(prev => (prev === "anytime" ? null : prev));
            }
          }}
          onDrop={e => {
            const id = e.dataTransfer.getData(TASK_DRAG_MIME);
            setDragOverPart(null);
            if (!id || !onTaskDropAt) return;
            e.preventDefault();
            onTaskDropAt(id, iso, 8);
          }}
        >
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Any time today</div>
          <ul className="grid gap-1 sm:grid-cols-2 md:grid-cols-3">
            {(grouped as any).anytime.map((it: any, i: number) => (
              <DayPartItem
                key={i}
                it={it}
                onApptClick={onApptClick}
                onTaskClick={onTaskClick}
                onToggle={toggleTask}
                hideTime
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function DayPartItem({
  it,
  onApptClick,
  onTaskClick,
  onToggle,
  hideTime,
}: {
  it: { time?: string; label: string; kind: string; id?: string; done?: boolean; taskId?: string };
  onApptClick?: (id: string) => void;
  onTaskClick?: (id: string) => void;
  onToggle: (id: string) => void | Promise<void>;
  hideTime?: boolean;
}) {
  const clickable =
    (it.kind === "appt" && it.id && onApptClick) ||
    (it.kind === "task" && it.taskId && onTaskClick);
  const drag = useLongPressDrag(
    () =>
      it.kind === "task" && it.taskId
        ? { type: "task", id: it.taskId, label: it.label }
        : null,
    {
      onClick: () => {
        if (it.kind === "appt" && it.id && onApptClick) onApptClick(it.id);
        else if (it.kind === "task" && it.taskId && onTaskClick) onTaskClick(it.taskId);
      },
    },
  );
  return (
    <li
      onPointerDown={it.kind === "task" ? drag.onPointerDown : undefined}
      onClick={
        it.kind === "task"
          ? undefined
          : () => { if (it.kind === "appt" && it.id && onApptClick) onApptClick(it.id); }
      }
      className={cn(
        "flex items-center gap-2 rounded-lg bg-muted/40 px-2 py-1.5 text-sm",
        clickable && "cursor-pointer hover:bg-primary/10",
        it.kind === "task" && "touch-none",
      )}
    >
      {it.kind === "task" ? (
        <button
          onPointerDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); if (it.taskId) void onToggle(it.taskId); }}
          className="text-muted-foreground hover:text-primary"
          aria-label="Toggle task"
        >
          {it.done ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <Circle className="h-4 w-4" />}
        </button>
      ) : !hideTime ? (
        <span className="w-12 shrink-0 font-mono text-[10px] text-muted-foreground">{it.time?.slice(0, 5) ?? ""}</span>
      ) : null}
      <span className="min-w-0 flex-1 truncate">{it.label}</span>
      {it.kind === "task" && (
        <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" aria-hidden />
      )}
    </li>
  );
}