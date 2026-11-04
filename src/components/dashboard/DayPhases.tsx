import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, Play, Plus } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { PHASE_ICONS } from "@/lib/phase-icons";
import { RHYTHM_LABEL, type RhythmPhase } from "@/lib/planner/rhythm-phase";
import { PHASE_WINDOW, phaseForTime, unpinPhase } from "@/lib/today-phase-items";
import type { Item, Kind } from "@/components/planner/schedule/ScheduleStyles";

const PHASE_TITLE: Record<RhythmPhase, string> = {
  plan: "Set the tone for your day", grow: "Make steady progress", care: "Tend to the people you love", letgo: "Wind down and let go",
};
const KIND_LABEL: Record<Kind, string> = { task: "Task", appt: "Event", meal: "Meal", care: "Care" };

export function fmtTime(t?: string) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ap = h >= 12 ? "pm" : "am"; const hh = h % 12 || 12;
  return m ? `${hh}:${String(m).padStart(2, "0")} ${ap}` : `${hh} ${ap}`;
}
const tint = (p: RhythmPhase) => `hsl(var(--rhythm-${p}-tint))`;
const deep = (p: RhythmPhase) => `hsl(var(--rhythm-${p}-deep))`;
const main = (p: RhythmPhase) => `hsl(var(--rhythm-${p}))`;

/** Round phase checkbox — fills with the phase color when done. */
function Check0({ item, onToggle }: { item: Item; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} aria-label={item.done ? `Mark ${item.title} not done` : `Complete ${item.title}`} aria-pressed={!!item.done}
      className="grid h-11 w-11 shrink-0 place-items-center -m-2">
      <span className="grid h-6 w-6 place-items-center rounded-full border-2 transition"
        style={{ borderColor: main(item.phase), background: item.done ? main(item.phase) : "transparent", color: "hsl(var(--rhythm-on, var(--card)))" }}>
        {item.done && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
      </span>
    </button>
  );
}

/** Inline editor for one schedule item (tasks and events are editable; meals/doses link to their pages). */
function InlineItemEditor({ item, onClose }: { item: Item; onClose: () => void }) {
  const { state, updateTask, deleteTask, updateAppointment, deleteAppointment, addTask, addAppointment } = useStore();
  const kind0 = item.id.slice(0, 1); const raw = item.id.slice(2);
  const task = kind0 === "t" ? state.tasks.find(t => t.id === raw) : undefined;
  const appt = kind0 === "a" ? state.appointments.find(a => a.id === raw) : undefined;
  const [title, setTitle] = useState(item.title);
  const [start, setStart] = useState(item.time ?? "");
  const [end, setEnd] = useState(item.end ?? "");
  const [type, setType] = useState<Kind>(task?.area === "Caregiving" && item.kind === "task" ? "care" : item.kind);
  const [note, setNote] = useState(task?.notes ?? appt?.notes ?? "");
  const [confirmDel, setConfirmDel] = useState(false);

  if (!task && !appt) {
    return (
      <div className="mt-1 rounded-2xl bg-card p-3 text-sm text-muted-foreground ring-1 ring-border">
        {item.kind === "meal" ? <>Edit meals in <Link className="font-semibold text-primary underline" to="/meals">Meals</Link>.</>
          : <>Edit doses in <Link className="font-semibold text-primary underline" to="/bedside">Bedside</Link>.</>}
        <button className="ml-2 min-h-[44px] px-2 font-semibold" onClick={onClose}>Close</button>
      </div>
    );
  }

  const save = async () => {
    const t = title.trim(); if (!t) return;
    const timeChanged = start !== (item.time ?? "");
    if (task) {
      if (type === "appt") {
        await addAppointment({ title: t, date: task.dueDate!, time: start || undefined, endTime: end || undefined, notes: note || undefined });
        await deleteTask(task.id);
      } else {
        await updateTask(task.id, { title: t, startTime: start || undefined, endTime: end || undefined, notes: note || undefined,
          ...(type === "care" ? { area: "Caregiving" as any } : {}) });
        if (timeChanged) unpinPhase(task.id);
      }
    } else if (appt) {
      if (type === "task" || type === "care") {
        await addTask({ title: t, dueDate: appt.date, startTime: start || undefined, endTime: end || undefined, notes: note || undefined, ...(type === "care" ? { area: "Caregiving" as any } : {}) });
        await deleteAppointment(appt.id);
      } else {
        await updateAppointment(appt.id, { title: t, time: start || undefined, endTime: end || undefined, notes: note || undefined });
        if (timeChanged) unpinPhase(appt.id);
      }
    }
    const np = phaseForTime(start || undefined);
    if (timeChanged && np && np !== item.phase) toast.success(`Moved to ${RHYTHM_LABEL[np]}`);
    onClose();
  };
  const remove = async () => { if (task) await deleteTask(task.id); else if (appt) await deleteAppointment(appt.id); onClose(); };
  const keys = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); onClose(); }
    if (e.key === "Enter" && !(e.target instanceof HTMLTextAreaElement)) { e.preventDefault(); void save(); }
  };
  const field = "h-11 w-full rounded-xl bg-background px-3 text-sm ring-1 ring-border focus:outline-none focus:ring-2 focus:ring-primary";
  return (
    <div className="mt-1 space-y-2 rounded-2xl bg-card p-3 ring-1 ring-border" onKeyDown={keys}>
      <input autoFocus aria-label="Title" className={field} value={title} onChange={e => setTitle(e.target.value)} />
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-muted-foreground">Start<input type="time" className={field} value={start} onChange={e => setStart(e.target.value)} /></label>
        <label className="text-xs text-muted-foreground">End<input type="time" className={field} value={end} onChange={e => setEnd(e.target.value)} /></label>
      </div>
      <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Type">
        {(["task", "appt", "meal", "care"] as Kind[]).map(k => (
          <button key={k} type="button" role="radio" aria-checked={type === k} disabled={k === "meal"}
            onClick={() => setType(k)}
            className={cn("min-h-[36px] rounded-full px-3 text-xs font-semibold ring-1 ring-border disabled:opacity-40", type === k && "ring-2")}
            style={type === k ? { background: tint(item.phase), color: deep(item.phase) } : undefined}>{KIND_LABEL[k]}</button>
        ))}
      </div>
      <textarea aria-label="Note" placeholder="Add a note…" className={cn(field, "h-16 py-2")} value={note} onChange={e => setNote(e.target.value)} />
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={save} className="min-h-[44px] rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground">Save</button>
        <button type="button" onClick={onClose} className="min-h-[44px] rounded-full px-4 text-sm font-semibold ring-1 ring-border">Cancel</button>
        {confirmDel
          ? <button type="button" onClick={remove} className="ml-auto min-h-[44px] rounded-full bg-destructive px-4 text-sm font-semibold text-destructive-foreground">Delete?</button>
          : <button type="button" onClick={() => setConfirmDel(true)} className="ml-auto min-h-[44px] px-3 text-sm font-semibold text-destructive">Delete</button>}
      </div>
    </div>
  );
}

function ItemRow({ item, toggle, compact }: { item: Item; toggle: (id: string) => void; compact?: boolean }) {
  const [editing, setEditing] = useState(false);
  const sub = [item.time && (item.end ? `${fmtTime(item.time)} – ${fmtTime(item.end)}` : fmtTime(item.time)), item.kind !== "task" && KIND_LABEL[item.kind]].filter(Boolean).join(" · ");
  return (
    <li>
      <div className={cn("flex min-h-[44px] items-start gap-3", !compact && "rounded-2xl bg-card px-3 py-2 ring-1 ring-border/60")}>
        <span className="pt-2.5"><Check0 item={item} onToggle={() => toggle(item.id)} /></span>
        <button type="button" onClick={() => setEditing(e => !e)} className="min-w-0 flex-1 py-2 text-left">
          <span className={cn("block break-words text-[15px] font-medium leading-snug", item.done && "text-muted-foreground line-through")}>{item.title}</span>
          {compact && sub && <span className="block text-xs text-muted-foreground">{sub}</span>}
        </button>
        {!compact && (
          <span className="flex shrink-0 items-center gap-2 py-2.5 text-xs text-muted-foreground">
            {item.kind !== "task" && <span className="rounded-full px-2 py-0.5 font-semibold ring-1 ring-border">{KIND_LABEL[item.kind]}</span>}
            <span className="font-display">{fmtTime(item.time)}</span>
          </span>
        )}
      </div>
      {editing && <InlineItemEditor item={item} onClose={() => setEditing(false)} />}
    </li>
  );
}

function AddLine({ phase, onAdd }: { phase: RhythmPhase; onAdd: (t: string) => Promise<void> }) {
  const [v, setV] = useState("");
  return (
    <form onSubmit={async e => { e.preventDefault(); const t = v.trim(); if (!t) return; setV(""); await onAdd(t); }}
      className="mt-2 flex min-h-[44px] items-center gap-2 rounded-2xl border border-dashed px-3" style={{ borderColor: main(phase) }}>
      <Plus className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      <input value={v} onChange={e => setV(e.target.value)} aria-label={`Add to ${RHYTHM_LABEL[phase]}`} placeholder={`Add to ${RHYTHM_LABEL[phase]}`}
        className="h-11 min-w-0 flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none" />
    </form>
  );
}

export function NowPhaseCard({ phase, items, toggle }: { phase: RhythmPhase; items: Item[]; toggle: (id: string) => void }) {
  const Icon = PHASE_ICONS[phase];
  return (
    <section className="planner-card overflow-hidden border-l-4 p-4 sm:p-5" style={{ borderLeftColor: main(phase), background: `linear-gradient(135deg, ${tint(phase)}, hsl(var(--card)) 70%)` }}>
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full" style={{ background: main(phase), color: "hsl(var(--card))" }}><Icon className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: deep(phase) }}>Now · {RHYTHM_LABEL[phase]}</p>
          <h2 className="font-display text-xl leading-tight">{PHASE_TITLE[phase]}</h2>
        </div>
        <span className="shrink-0 pt-1 text-sm text-muted-foreground">{PHASE_WINDOW[phase]}</span>
      </div>
      <ul className="mt-3 space-y-2">
        {items.length === 0 ? <li className="rounded-2xl bg-card/70 px-4 py-3 text-sm text-muted-foreground">Nothing here right now — a gentle stretch.</li>
          : items.map(i => <ItemRow key={i.id} item={i} toggle={toggle} />)}
      </ul>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link to="/planner" className="inline-flex min-h-[44px] items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground">Open today's plan</Link>
        <Link to="/focus" className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-card px-5 text-sm font-semibold ring-1 ring-border"><Play className="h-4 w-4" />Focus</Link>
      </div>
    </section>
  );
}

export function PhaseDayCard({ phase, items, now, past, toggle, onAdd }: {
  phase: RhythmPhase; items: Item[]; now: boolean; past: boolean; toggle: (id: string) => void; onAdd: (t: string) => Promise<void>;
}) {
  const Icon = PHASE_ICONS[phase];
  const left = items.filter(i => !i.done).length;
  return (
    <section aria-label={RHYTHM_LABEL[phase]} className={cn("flex flex-col rounded-[20px] border-t-4 p-3 transition", now && "ring-2", past && "opacity-75")}
      style={{ background: tint(phase), borderTopColor: main(phase), ...(now ? { "--tw-ring-color": main(phase) } as React.CSSProperties : {}) }}>
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" style={{ color: deep(phase) }} aria-hidden />
        <h3 className="font-semibold" style={{ color: deep(phase) }}>{RHYTHM_LABEL[phase]}</h3>
        <span className="ml-auto text-xs font-semibold" style={{ color: deep(phase) }}>
          {now ? <span className="rounded-full bg-primary px-2 py-0.5 text-primary-foreground">Now</span> : `${left} left`}
        </span>
      </div>
      <p className="mb-1 text-xs text-muted-foreground">{PHASE_WINDOW[phase]}</p>
      <ul className="space-y-0.5">{items.map(i => <ItemRow key={i.id} item={i} toggle={toggle} compact />)}</ul>
      <AddLine phase={phase} onAdd={onAdd} />
    </section>
  );
}
