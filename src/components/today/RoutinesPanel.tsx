import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ListChecks, Sunrise, Sun, Moon, GripVertical } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { routines as routinesApi, useRoutines, type RoutineSlot, type Routine } from "@/lib/routines";
import { RoutineItemRow } from "@/components/routines/RoutineItemRow";
import { RoutineFocusMode } from "@/components/routines/RoutineFocusMode";

const PARTS: { slot: RoutineSlot; label: string; icon: typeof Sunrise }[] = [
  { slot: "morning",   label: "Morning routine",   icon: Sunrise },
  { slot: "afternoon", label: "Afternoon routine", icon: Sun },
  { slot: "evening",   label: "Evening routine",   icon: Moon },
];

const PERSON_KEY = "careflow:dayextras:person:v1";
function readPerson(): string {
  if (typeof localStorage === "undefined") return "";
  return localStorage.getItem(PERSON_KEY) ?? "";
}
function writePerson(p: string) {
  try { localStorage.setItem(PERSON_KEY, p); } catch { /* noop */ }
}

/**
 * Today-view routines strip showing morning / afternoon / evening routines
 * for a selected person. Items are draggable to reorder, show their icon,
 * and expose a Focus button that opens the timer-driven RoutineFocusMode.
 */
export function RoutinesPanel() {
  const { state } = useStore();
  const { routines: list } = useRoutines();

  const people = useMemo(() => {
    const fromR = routinesApi.people();
    const fromRec = state.recipients.map(r => r.name);
    return Array.from(new Set([...fromR, ...fromRec]));
  }, [list, state.recipients]);

  const [person, setPerson] = useState<string>(readPerson());
  useEffect(() => {
    if (!person && people.length > 0) { setPerson(people[0]); writePerson(people[0]); }
  }, [people, person]);
  const updatePerson = (p: string) => { setPerson(p); writePerson(p); };

  const [open, setOpen] = useState(true);
  const [focus, setFocus] = useState<{ routine: Routine; itemId?: string } | null>(null);

  return (
    <>
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="cozy-card overflow-hidden rounded-2xl p-3">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <CollapsibleTrigger className="flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-semibold text-foreground hover:bg-muted/50">
              <ListChecks className="h-3.5 w-3.5 text-primary" /> Routines
              <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
            </CollapsibleTrigger>
            <div className="ml-auto flex items-center gap-2">
              {people.length > 0 ? (
                <Select value={person} onValueChange={updatePerson}>
                  <SelectTrigger className="h-7 w-[160px] rounded-full border-border/60 bg-background/70 text-xs">
                    <SelectValue placeholder="Pick person…" />
                  </SelectTrigger>
                  <SelectContent>
                    {people.map(p => (
                      <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <span className="text-xs text-muted-foreground">Add a person in Routines first.</span>
              )}
            </div>
          </div>
          <CollapsibleContent>
            <div className="grid min-w-0 gap-3 md:grid-cols-3">
              {PARTS.map(({ slot, label, icon: Icon }) => (
                <RoutineSlotColumn
                  key={slot}
                  icon={Icon}
                  label={label}
                  slot={slot}
                  person={person}
                  onFocus={(r, itemId) => setFocus({ routine: r, itemId })}
                />
              ))}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
      {focus && (
        <RoutineFocusMode
          open={!!focus}
          onOpenChange={(o) => { if (!o) setFocus(null); }}
          routine={focus.routine}
          startItemId={focus.itemId}
        />
      )}
    </>
  );
}

function RoutineSlotColumn({
  icon: Icon, label, slot, person, onFocus,
}: {
  icon: typeof Sunrise; label: string; slot: RoutineSlot; person: string;
  onFocus: (r: Routine, itemId?: string) => void;
}) {
  const current = person ? routinesApi.find(person, slot) : undefined;
  const items = current?.items ?? [];
  const done = items.filter(i => i.done).length;
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  const submitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = draft.trim();
    if (!t || !person) return;
    setBusy(true);
    try {
      await routinesApi.addItem(person, slot, t);
      setDraft("");
    } finally { setBusy(false); }
  };

  return (
    <div className="flex min-h-[160px] min-w-0 flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/60 p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-primary/15 text-primary">
          <Icon className="h-3 w-3" />
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className="ml-auto rounded-full bg-muted px-1.5 py-0.5 text-[10px] tabular-nums text-muted-foreground">
          {done}/{items.length}
        </span>
      </div>
      {!person ? (
        <p className="text-[11px] italic text-muted-foreground">
          Pick a person above to load routines.
        </p>
      ) : (
        <>
          <ul className="min-w-0 flex-1 space-y-1">
            {items.length === 0 && (
              <li className="rounded-lg border border-dashed border-border/50 px-2 py-2 text-center text-[11px] text-muted-foreground">
                Nothing yet. Add a small ritual.
              </li>
            )}
            {items.map((it, idx) => (
              <li
                key={it.id}
                draggable
                onDragStart={(e) => { setDragIdx(idx); e.dataTransfer.effectAllowed = "move"; }}
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setOverIdx(idx); }}
                onDragLeave={() => setOverIdx(prev => (prev === idx ? null : prev))}
                onDrop={async (e) => {
                  e.preventDefault();
                  if (dragIdx !== null && dragIdx !== idx && current) {
                    await routinesApi.reorderItems(person, slot, dragIdx, idx);
                  }
                  setDragIdx(null); setOverIdx(null);
                }}
                onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}
                className={cn(
                  "flex items-center gap-1 rounded-lg transition-colors",
                  overIdx === idx && dragIdx !== null && dragIdx !== idx && "ring-2 ring-primary/60",
                  dragIdx === idx && "opacity-50",
                )}
              >
                <span
                  className="grid h-6 w-4 cursor-grab place-items-center text-muted-foreground/60 hover:text-foreground active:cursor-grabbing"
                  aria-label="Drag to reorder"
                  title="Drag to reorder"
                >
                  <GripVertical className="h-3 w-3" />
                </span>
                <div className="min-w-0 flex-1">
                  <RoutineItemRow
                    item={it}
                    person={person}
                    slot={slot}
                    compact
                    onFocus={current ? () => onFocus(current, it.id) : undefined}
                  />
                </div>
              </li>
            ))}
          </ul>
          <form onSubmit={submitAdd} className="mt-2 flex items-center gap-1 rounded-lg border border-border/60 bg-background/80 px-2 py-1">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={`Add to ${label.toLowerCase()}…`}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
            />
            <button
              type="submit"
              disabled={!draft.trim() || busy}
              className="rounded-md bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary disabled:opacity-40"
            >
              Add
            </button>
          </form>
        </>
      )}
    </div>
  );
}