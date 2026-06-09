import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { routines as routinesApi, useRoutines, ROUTINE_SLOTS, SLOT_LABEL, type RoutineSlot } from "@/lib/routines";
import { RoutineItemRow } from "@/components/routines/RoutineItemRow";
import { useStore } from "@/lib/store";

const STORAGE_KEY = "careflow:routines-mini:v1";
function readPrefs(): { person: string; slot: RoutineSlot } {
  const defaults = { person: "", slot: "morning" as RoutineSlot };
  if (typeof localStorage === "undefined") return defaults;
  try { return { ...defaults, ...JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") }; }
  catch { return defaults; }
}
function writePrefs(p: { person: string; slot: RoutineSlot }) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch { /* */ }
}

function currentSlot(): RoutineSlot {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  if (h < 21) return "evening";
  return "night";
}

export function RoutinesMini() {
  const { state } = useStore();
  useRoutines();
  const [prefs, setPrefs] = useState(() => {
    const initial = readPrefs();
    return { ...initial, slot: initial.slot ?? currentSlot() };
  });
  const update = (patch: Partial<typeof prefs>) => {
    setPrefs(prev => { const next = { ...prev, ...patch }; writePrefs(next); return next; });
  };
  const { person, slot } = prefs;

  const people = useMemo(() => {
    const fromRoutines = routinesApi.people();
    const fromRecipients = state.recipients.map(r => r.name);
    return Array.from(new Set([...fromRoutines, ...fromRecipients]));
  }, [state.recipients]);

  useEffect(() => {
    if (!person && people.length > 0) update({ person: people[0] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [people, person]);

  const current = person ? routinesApi.find(person, slot) : undefined;
  const items = current?.items ?? [];
  const done = items.filter(i => i.done).length;

  return (
    <div className="mt-3 border-t border-border/40 pt-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Users className="h-3 w-3" /> Routines
        </div>
        {items.length > 0 && (
          <span className="text-[10px] font-medium tabular-nums text-muted-foreground">
            {done}/{items.length}
          </span>
        )}
      </div>

      {people.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          <Link to="/routines" className="text-primary hover:underline">Add a person</Link> to start a routine.
        </p>
      ) : (
        <>
          <div className="mb-2 flex flex-wrap gap-1">
            {people.map(p => (
              <button
                key={p}
                type="button"
                onClick={() => update({ person: p })}
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[10px] transition-colors",
                  person === p
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card hover:bg-muted/60",
                )}
              >
                {p}
              </button>
            ))}
          </div>
          <div className="mb-2 flex flex-wrap gap-0.5 rounded-xl bg-muted/50 p-0.5">
            {ROUTINE_SLOTS.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => update({ slot: s })}
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] transition-colors",
                  slot === s ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {SLOT_LABEL[s]}
              </button>
            ))}
          </div>
          {person ? (
            items.length === 0 ? (
              <p className="text-[11px] italic text-muted-foreground">
                No items yet.{" "}
                <Link to="/routines" className="text-primary hover:underline">Add some →</Link>
              </p>
            ) : (
              <div className="space-y-0.5">
                {items.map(it => (
                  <RoutineItemRow key={it.id} item={it} person={person} slot={slot} compact />
                ))}
              </div>
            )
          ) : null}
        </>
      )}

      <div className="mt-2 border-t border-border/40 pt-2">
        <Link
          to="/routines"
          className="block text-[11px] font-medium text-primary hover:underline"
        >
          Open Routines →
        </Link>
      </div>
    </div>
  );
}