import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  ChefHat, ChevronDown, Plus, Sparkles, UtensilsCrossed, X,
  Sunrise, Sun, Moon, ListChecks, CheckCircle2, Circle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { useMealsLibrary, type LibraryMeal } from "@/lib/meals-library";
import {
  routines as routinesApi, useRoutines, type RoutineSlot, SLOT_LABEL,
} from "@/lib/routines";
import type { Meal } from "@/lib/types";
import { toast } from "sonner";

const SLOTS = [
  { slot: "Breakfast" as const, part: "morning", label: "Breakfast", icon: Sunrise },
  { slot: "Lunch"     as const, part: "afternoon", label: "Lunch",   icon: Sun },
  { slot: "Dinner"    as const, part: "evening", label: "Dinner",    icon: Moon },
];

const ROUTINE_PARTS: { slot: RoutineSlot; label: string; icon: typeof Sunrise }[] = [
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

export function DayExtras({ date }: { date: Date }) {
  const iso = format(date, "yyyy-MM-dd");
  const { state, addMeal, deleteMeal } = useStore();
  const dayMeals = useMemo(() => state.meals.filter(m => m.date === iso), [state.meals, iso]);
  const { items: library } = useMealsLibrary();

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

  const [routinesOpen, setRoutinesOpen] = useState(true);

  return (
    <div className="space-y-3">
      {/* Meals row aligned with parts (3 columns) */}
      <div className="grid gap-3 md:grid-cols-3">
        {SLOTS.map(({ slot, label, icon: Icon }) => {
          const m = dayMeals.find(x => x.slot === slot);
          return (
            <MealSlotCard
              key={slot}
              icon={Icon}
              label={label}
              slot={slot}
              meal={m}
              library={library}
              onAdd={async (name) => {
                await addMeal({ name, date: iso, slot });
                toast.success(`Added ${label.toLowerCase()}: ${name}`);
              }}
              onClear={async () => { if (m) await deleteMeal(m.id); }}
            />
          );
        })}
      </div>

      {/* Routines row aligned with parts */}
      <Collapsible open={routinesOpen} onOpenChange={setRoutinesOpen}>
        <div className="cozy-card rounded-2xl p-3">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <CollapsibleTrigger className="flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-semibold text-foreground hover:bg-muted/50">
              <ListChecks className="h-3.5 w-3.5 text-primary" /> Routines
              <ChevronDown className={cn("h-3 w-3 transition-transform", routinesOpen && "rotate-180")} />
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
            <div className="grid gap-3 md:grid-cols-3">
              {ROUTINE_PARTS.map(({ slot, label, icon: Icon }) => (
                <RoutineSlotCard
                  key={slot}
                  icon={Icon}
                  label={label}
                  slot={slot}
                  person={person}
                  // re-render when underlying list changes
                  routineKey={`${person}-${slot}-${list.length}`}
                />
              ))}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </div>
  );
}

function MealSlotCard({
  icon: Icon, label, slot, meal, library, onAdd, onClear,
}: {
  icon: typeof Sunrise; label: string;
  slot: "Breakfast" | "Lunch" | "Dinner";
  meal?: Meal;
  library: LibraryMeal[];
  onAdd: (name: string) => Promise<void> | void;
  onClear: () => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matchSlot = library.filter(m =>
      !m.slot || m.slot === slot || (slot === "Dinner" && m.slot === "Snack"));
    if (!q) return matchSlot.slice(0, 10);
    return library
      .filter(m => m.title.toLowerCase().includes(q))
      .slice(0, 10);
  }, [library, query, slot]);

  return (
    <div className="flex min-h-[78px] flex-col gap-1.5 rounded-2xl border border-border/60 bg-card/60 p-3 transition-colors hover:bg-card/80">
      <div className="flex items-center gap-2">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-accent/15 text-accent-foreground">
          <Icon className="h-3 w-3" />
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="ml-auto grid h-6 w-6 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-primary/15 hover:text-primary"
              aria-label={`Add ${label.toLowerCase()}`}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 rounded-2xl p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium">
              <UtensilsCrossed className="h-3.5 w-3.5 text-primary" /> Plan {label.toLowerCase()}
            </div>
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search library or type a new meal…"
              className="h-8 rounded-lg text-xs"
              onKeyDown={async (e) => {
                if (e.key === "Enter" && query.trim()) {
                  e.preventDefault();
                  await onAdd(query.trim());
                  setQuery(""); setOpen(false);
                }
              }}
            />
            <div className="mt-2 max-h-52 space-y-1 overflow-y-auto pr-1">
              {filtered.length === 0 && (
                <p className="rounded-lg bg-muted/40 px-2 py-1.5 text-[11px] text-muted-foreground">
                  {query ? "Press Enter to add as a new meal." : "Your library is empty — start by typing a name."}
                </p>
              )}
              {filtered.map(lib => (
                <button
                  key={lib.id}
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs hover:bg-primary/10"
                  onClick={async () => { await onAdd(lib.title); setOpen(false); }}
                >
                  <ChefHat className="h-3 w-3 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">{lib.title}</span>
                  {lib.is_favorite && <Sparkles className="h-3 w-3 text-amber-400" />}
                </button>
              ))}
            </div>
            {query.trim() && (
              <Button
                size="sm"
                className="mt-2 h-7 w-full rounded-full text-xs"
                onClick={async () => { await onAdd(query.trim()); setQuery(""); setOpen(false); }}
              >
                <Plus className="mr-1 h-3 w-3" /> Add “{query.trim()}”
              </Button>
            )}
          </PopoverContent>
        </Popover>
      </div>
      {meal ? (
        <div className="flex items-start gap-1">
          <p className="min-w-0 flex-1 break-words text-sm font-medium text-foreground/90">{meal.name}</p>
          <button
            type="button"
            onClick={() => void onClear()}
            className="grid h-5 w-5 shrink-0 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Clear meal"
            title="Clear"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <p className="text-[11px] italic text-muted-foreground">No {label.toLowerCase()} planned.</p>
      )}
    </div>
  );
}

function RoutineSlotCard({
  icon: Icon, label, slot, person, routineKey,
}: {
  icon: typeof Sunrise; label: string; slot: RoutineSlot;
  person: string;
  routineKey: string;
}) {
  // routineKey is included to force memo refresh when routines list changes
  void routineKey;
  const current = person ? routinesApi.find(person, slot) : undefined;
  const items = current?.items ?? [];
  const done = items.filter(i => i.done).length;
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

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
    <div className="flex min-h-[140px] flex-col rounded-2xl border border-border/60 bg-card/60 p-3">
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
          Pick a person above to load {SLOT_LABEL[slot].toLowerCase()} routines.
        </p>
      ) : (
        <>
          <ul className="flex-1 space-y-1">
            {items.length === 0 && (
              <li className="rounded-lg border border-dashed border-border/50 px-2 py-2 text-center text-[11px] text-muted-foreground">
                Nothing yet. Add a small ritual.
              </li>
            )}
            {items.map(it => (
              <li key={it.id} className="group flex items-center gap-2 rounded-lg bg-muted/40 px-2 py-1.5 text-sm">
                <button
                  type="button"
                  onClick={() => void routinesApi.toggleItem(person, slot, it.id)}
                  className="text-muted-foreground hover:text-primary"
                  aria-label="Toggle routine step"
                >
                  {it.done ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <Circle className="h-4 w-4" />}
                </button>
                <span className={cn("min-w-0 flex-1 truncate", it.done && "text-muted-foreground line-through")}>
                  {it.text}
                </span>
                <button
                  type="button"
                  onClick={() => void routinesApi.removeItem(person, slot, it.id)}
                  className="grid h-5 w-5 shrink-0 place-items-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100"
                  aria-label="Remove step"
                  title="Remove"
                >
                  <X className="h-3 w-3" />
                </button>
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