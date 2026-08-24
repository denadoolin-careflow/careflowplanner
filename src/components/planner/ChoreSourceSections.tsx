import { useMemo, useState } from "react";
import { ChevronRight, Sparkles, HeartHandshake, Plus, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { BlockCheckbox } from "@/components/planner/BlockCheckbox";
import { setNewTaskDrag } from "@/lib/planner/chore-drag";
import { inferCleaningZone, CLEANING_ZONES, type CleaningZone } from "@/lib/cleaning-zone-infer";
import {
  useCaregivingChores, caregivingChores, CHORE_CADENCE_LABEL, type CaregivingChore,
} from "@/lib/caregiving-chores";
import type { CleaningTask } from "@/lib/types";
import { haptics } from "@/lib/haptics";
import { toast } from "sonner";

/**
 * Cleaning and Caretaking sources for the planner sidebar.
 *
 * Both lists live outside the task store, so rows carry a "new task" drag
 * payload — dropping one on the time grid creates a real, time-blocked task
 * without converting the chore by hand first.
 */

function Collapsible({ id, label, Icon, count, open, onToggle, children }: {
  id: string; label: string; Icon: React.ComponentType<{ className?: string }>;
  count: number; open: boolean; onToggle: (id: string) => void; children: React.ReactNode;
}) {
  return (
    <div>
      <button
        onClick={() => onToggle(id)}
        aria-expanded={open}
        className="flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-xs font-semibold text-foreground/90 hover:bg-muted/60"
      >
        <ChevronRight className={cn("h-3 w-3 transition-transform", open && "rotate-90")} />
        <Icon className="h-3.5 w-3.5 opacity-70" />
        <span className="flex-1 truncate">{label}</span>
        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground">{count}</span>
      </button>
      {open && <div className="ml-1 space-y-1 py-1">{children}</div>}
    </div>
  );
}

function ChoreRow({ title, chip, done, onToggle, dragPayload }: {
  title: string; chip?: string | null; done: boolean;
  onToggle: () => void;
  dragPayload: { title: string; area?: string; estMinutes?: number; origin: "cleaning" | "caretaking" };
}) {
  return (
    <div
      draggable
      onDragStart={(e) => { setNewTaskDrag(e, dragPayload); haptics.pickup(); }}
      onDragEnd={() => haptics.snap()}
      title="Drag onto the time grid to schedule"
      className="group flex cursor-grab items-start gap-2 rounded-lg border border-border/50 bg-card/70 px-2 py-1.5 text-[length:var(--task-font,13px)] transition-colors hover:border-primary/40 hover:bg-card active:cursor-grabbing"
    >
      <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
      <BlockCheckbox done={done} title={title} onToggle={onToggle} className="mt-0.5" />
      <span className={cn("min-w-0 flex-1 [overflow-wrap:anywhere]", done && "line-through opacity-60")}>{title}</span>
      {chip && (
        <span className="mt-0.5 shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-muted-foreground">
          {chip}
        </span>
      )}
    </div>
  );
}

function QuickAddRow({ placeholder, hint, value, onChange, onSubmit, label }: {
  placeholder: string; hint?: string | null; value: string;
  onChange: (v: string) => void; onSubmit: () => void; label: string;
}) {
  return (
    <form className="px-1" onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
      <div className="relative">
        <Plus className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-primary" />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
          placeholder={placeholder}
          className="w-full rounded-lg border border-dashed border-border/60 bg-transparent py-1 pl-7 pr-2 text-[12px] outline-none placeholder:text-muted-foreground/70 focus:border-primary/50"
        />
      </div>
      {hint && (
        <p className="mt-0.5 pl-7 text-[10px] text-muted-foreground">
          Zone: <span className="text-primary">{hint}</span>
        </p>
      )}
    </form>
  );
}

export function CleaningSourceSection({ search }: { search: string }) {
  const { state, addCleaning, toggleCleaning } = useStore();
  const [open, setOpen] = useState(false);
  const [openZones, setOpenZones] = useState<Record<string, boolean>>({});
  const [draft, setDraft] = useState("");
  const needle = search.trim().toLowerCase();

  const items = useMemo(() => {
    const all = (state.cleaning ?? []) as CleaningTask[];
    return needle ? all.filter(c => c.title.toLowerCase().includes(needle)) : all;
  }, [state.cleaning, needle]);

  const byZone = useMemo(() => {
    const map = new Map<string, CleaningTask[]>();
    for (const c of items) {
      const z = c.zone ?? "Whole home";
      if (!map.has(z)) map.set(z, []);
      map.get(z)!.push(c);
    }
    return CLEANING_ZONES
      .map(z => ({ zone: z as string, rows: map.get(z) ?? [] }))
      .concat(Array.from(map.keys()).filter(z => !CLEANING_ZONES.includes(z as CleaningZone)).map(z => ({ zone: z, rows: map.get(z)! })))
      .filter(g => g.rows.length > 0);
  }, [items]);

  const guess = draft.trim() ? inferCleaningZone(draft) : null;

  const submit = async () => {
    const title = draft.trim();
    if (!title) return;
    const zone = (inferCleaningZone(title) ?? "Whole home") as CleaningTask["zone"];
    await addCleaning({ title, zone, cadence: "weekly", done: false } as any);
    toast.success(`Added to ${zone}`);
    setDraft("");
  };

  return (
    <Collapsible id="cleaning" label="Cleaning" Icon={Sparkles} count={items.length}
      open={open} onToggle={() => setOpen(o => !o)}>
      {byZone.length === 0 && <p className="px-2 py-2 text-[11px] text-muted-foreground">No cleaning tasks yet.</p>}
      {byZone.map(g => {
        const zOpen = openZones[g.zone] ?? true;
        return (
          <div key={g.zone} className="space-y-1">
            <button
              onClick={() => setOpenZones(o => ({ ...o, [g.zone]: !zOpen }))}
              aria-expanded={zOpen}
              className="flex w-full items-center gap-1 px-1 text-left text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground"
            >
              <ChevronRight className={cn("h-2.5 w-2.5 transition-transform", zOpen && "rotate-90")} />
              {g.zone}
              <span className="ml-auto font-normal normal-case tracking-normal">{g.rows.filter(r => !r.done).length}</span>
            </button>
            {zOpen && g.rows.map(c => (
              <ChoreRow
                key={c.id}
                title={c.title}
                chip={c.cadence}
                done={c.done}
                onToggle={() => void toggleCleaning(c.id)}
                dragPayload={{ title: c.title, area: "Home", estMinutes: 20, origin: "cleaning" }}
              />
            ))}
          </div>
        );
      })}
      <QuickAddRow
        label="Add a cleaning task"
        placeholder="Add a cleaning task…"
        hint={guess}
        value={draft}
        onChange={setDraft}
        onSubmit={() => void submit()}
      />
    </Collapsible>
  );
}

export function CaretakingSourceSection({ search }: { search: string }) {
  const { state } = useStore();
  const chores = useCaregivingChores();
  const [open, setOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [draft, setDraft] = useState("");
  const needle = search.trim().toLowerCase();

  const items = useMemo(() => (
    needle ? chores.filter(c => c.title.toLowerCase().includes(needle)) : chores
  ), [chores, needle]);

  const recipientName = (id: string | null) =>
    (state.recipients ?? []).find((r: any) => r.id === id)?.name ?? "Everyone";

  const groups = useMemo(() => {
    const map = new Map<string, CaregivingChore[]>();
    for (const c of items) {
      const key = recipientName(c.recipient_id);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }
    return Array.from(map.entries())
      .map(([label, rows]) => ({ label, rows: rows.slice().sort((a, b) => Number(a.done) - Number(b.done)) }))
      .sort((a, b) => a.label.localeCompare(b.label));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, state.recipients]);

  const submit = async () => {
    const title = draft.trim();
    if (!title) return;
    await caregivingChores.create({ title, cadence: "weekly", area: "Caregiving" });
    toast.success("Added");
    setDraft("");
  };

  return (
    <Collapsible id="caretaking" label="Caretaking" Icon={HeartHandshake} count={items.length}
      open={open} onToggle={() => setOpen(o => !o)}>
      {groups.length === 0 && <p className="px-2 py-2 text-[11px] text-muted-foreground">No caretaking chores yet.</p>}
      {groups.map(g => {
        const gOpen = openGroups[g.label] ?? true;
        return (
          <div key={g.label} className="space-y-1">
            <button
              onClick={() => setOpenGroups(o => ({ ...o, [g.label]: !gOpen }))}
              aria-expanded={gOpen}
              className="flex w-full items-center gap-1 px-1 text-left text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground"
            >
              <ChevronRight className={cn("h-2.5 w-2.5 transition-transform", gOpen && "rotate-90")} />
              {g.label}
              <span className="ml-auto font-normal normal-case tracking-normal">{g.rows.filter(r => !r.done).length}</span>
            </button>
            {gOpen && g.rows.map(c => (
              <ChoreRow
                key={c.id}
                title={c.title}
                chip={CHORE_CADENCE_LABEL[c.cadence] ?? c.cadence}
                done={c.done}
                onToggle={() => void caregivingChores.toggle(c.id)}
                dragPayload={{ title: c.title, area: "Caregiving", estMinutes: c.est_minutes ?? 30, origin: "caretaking" }}
              />
            ))}
          </div>
        );
      })}
      <QuickAddRow
        label="Add a caretaking chore"
        placeholder="Add a caretaking chore…"
        value={draft}
        onChange={setDraft}
        onSubmit={() => void submit()}
      />
    </Collapsible>
  );
}
