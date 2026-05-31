import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Play, Plus, Sparkles, Trash2, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { routines as routinesApi, useRoutines, ROUTINE_SLOTS, SLOT_LABEL, type RoutineSlot } from "@/lib/routines";
import { RoutineItemRow } from "@/components/routines/RoutineItemRow";
import { RoutineFocusMode } from "@/components/routines/RoutineFocusMode";
import { useStore } from "@/lib/store";
import { toast } from "sonner";
import { useLocation } from "react-router-dom";

const SLOT_LABELS = SLOT_LABEL;

const STORAGE_KEY = "careflow:routines-strip:v1";
function readPrefs() {
  // Start collapsed by default — calmer first paint, especially on mobile.
  // Users can still expand and the choice persists.
  const defaults = { open: false, person: "", slot: "morning" as RoutineSlot };
  if (typeof localStorage === "undefined") return defaults;
  try { return { ...defaults, ...JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") }; }
  catch { return defaults; }
}
function writePrefs(p: { open: boolean; person: string; slot: RoutineSlot }) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch { /* noop */ }
}

export function RoutinesStrip() {
  const { state } = useStore();
  const { routines, loaded } = useRoutines();
  const [prefs, setPrefs] = useState(readPrefs);
  const location = useLocation();
  const forceClosed =
    location.pathname.startsWith("/week") ||
    location.pathname.startsWith("/month") ||
    location.pathname.startsWith("/calendar");
  const { person, slot } = prefs;
  const open = forceClosed ? false : prefs.open;
  const update = (patch: Partial<typeof prefs>) => {
    setPrefs(prev => { const next = { ...prev, ...patch }; writePrefs(next); return next; });
  };

  // Auto-collapse when the page scrolls past a small threshold, so the
  // strip gets out of the way on long scrolling pages. User keeps control:
  // we never auto-reopen.
  useEffect(() => {
    if (forceClosed) return;
    const onScroll = () => {
      if (window.scrollY > 80) {
        setPrefs(prev => {
          if (!prev.open) return prev;
          const next = { ...prev, open: false };
          writePrefs(next);
          return next;
        });
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [forceClosed]);

  const people = useMemo(() => {
    const fromRoutines = routinesApi.people();
    const fromRecipients = state.recipients.map(r => r.name);
    const merged = Array.from(new Set([...fromRoutines, ...fromRecipients]));
    return merged;
  }, [routines, state.recipients]);

  // Pick first person on first load
  useEffect(() => {
    if (!person && people.length > 0) update({ person: people[0] });
  }, [people, person]);

  const current = person ? routinesApi.find(person, slot) : undefined;
  const items = current?.items ?? [];

  const [draftText, setDraftText] = useState("");
  const [generating, setGenerating] = useState(false);
  const [newPerson, setNewPerson] = useState("");
  const [focusOpen, setFocusOpen] = useState(false);

  const generate = async () => {
    if (!person) { toast("Add a person first."); return; }
    setGenerating(true);
    try {
      const ideas = await routinesApi.generateIdeas(person, slot, state.settings.planningStyle);
      if (!ideas.length) { toast("No ideas came back. Try again?"); return; }
      const existing = items.map(i => i.text.toLowerCase());
      const fresh = ideas.filter(i => !existing.includes(i.toLowerCase()));
      const next = [...items, ...fresh.map(t => ({ id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`, text: t, done: false }))];
      await routinesApi.upsert(person, slot, { items: next });
      toast.success(`Added ${fresh.length} routine ideas.`);
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't generate ideas");
    } finally { setGenerating(false); }
  };

  const addPersonInline = async () => {
    const n = newPerson.trim();
    if (!n) return;
    await routinesApi.addPerson(n);
    setNewPerson("");
    update({ person: n });
    toast.success(`${n} added.`);
  };

  return (
    <div className="border-b border-border/50 bg-card/40 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-2 px-4 py-2 lg:px-8">
        <button
          type="button"
          onClick={() => update({ open: !open })}
          className="flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/50"
          aria-expanded={open}
        >
          <Users className="h-3.5 w-3.5" /> Routines
          {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
        {!open && person && (
          <Badge variant="secondary" className="rounded-full text-[10px]">
            {person} · {SLOT_LABELS[slot]} · {items.filter(i => i.done).length}/{items.length}
          </Badge>
        )}
      </div>

      {open && (
        <div className="mx-auto w-full max-w-6xl px-4 pb-3 lg:px-8">
          <div className="flex flex-wrap items-center gap-2">
            {/* People */}
            <div className="flex flex-wrap items-center gap-1">
              {people.length === 0 && (
                <span className="text-[11px] text-muted-foreground">Add a person to start a routine →</span>
              )}
              {people.map(p => (
                <button
                  key={p}
                  onClick={() => update({ person: p })}
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-[11px] transition-colors",
                    person === p
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card hover:bg-muted/60"
                  )}
                >
                  {p}
                </button>
              ))}
              <Popover>
                <PopoverTrigger asChild>
                  <button className="rounded-full border border-dashed border-border px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-muted/40">
                    <UserPlus className="mr-1 inline h-3 w-3" /> Person
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2">
                  <form onSubmit={(e) => { e.preventDefault(); void addPersonInline(); }} className="flex gap-1">
                    <Input
                      autoFocus
                      value={newPerson}
                      onChange={(e) => setNewPerson(e.target.value)}
                      placeholder="Name"
                      className="h-7 text-xs"
                    />
                    <Button type="submit" size="sm" className="h-7 px-2 text-xs">Add</Button>
                  </form>
                  {person && (
                    <button
                      onClick={() => routinesApi.removePerson(person).then(() => update({ person: "" }))}
                      className="mt-2 flex w-full items-center gap-1 rounded px-1 py-1 text-[11px] text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3 w-3" /> Remove "{person}"
                    </button>
                  )}
                </PopoverContent>
              </Popover>
            </div>

            <span className="mx-1 hidden h-4 w-px bg-border sm:inline-block" />

            {/* Slot tabs */}
            <div className="flex max-w-full flex-wrap justify-center gap-0.5 rounded-2xl bg-muted/50 p-0.5">
              {ROUTINE_SLOTS.map(s => (
                <button
                  key={s}
                  onClick={() => update({ slot: s })}
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-[11px] transition-colors",
                    slot === s ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {SLOT_LABELS[s]}
                </button>
              ))}
            </div>

            <div className="ml-auto flex items-center gap-2">
              {current && items.length > 0 && (
                <Button
                  size="sm" variant="default"
                  onClick={() => setFocusOpen(true)}
                  className="h-7 rounded-full px-2 text-[11px]"
                >
                  <Play className="mr-1 h-3 w-3" /> Focus
                </Button>
              )}
              <Button
                size="sm" variant="outline"
                disabled={!person || generating}
                onClick={generate}
                className="h-7 rounded-full px-2 text-[11px]"
              >
                <Sparkles className={cn("mr-1 h-3 w-3", generating && "animate-pulse")} />
                {generating ? "Generating…" : "AI ideas"}
              </Button>
            </div>
          </div>

          {/* Items */}
          {person ? (
            <div className="mt-2 grid gap-1 sm:grid-cols-2">
              {items.length === 0 && (
                <p className="col-span-full text-[11px] italic text-muted-foreground">
                  No items yet. Add one or tap "AI ideas" for suggestions.
                </p>
              )}
              {items.map(it => (
                <RoutineItemRow
                  key={it.id}
                  item={it}
                  person={person}
                  slot={slot}
                  compact
                  onFocus={() => setFocusOpen(true)}
                />
              ))}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const t = draftText.trim();
                  if (!t) return;
                  void routinesApi.addItem(person, slot, t);
                  setDraftText("");
                }}
                className="flex items-center gap-1 rounded-md border border-dashed border-border bg-card/30 px-2 py-1"
              >
                <Plus className="h-3 w-3 text-muted-foreground" />
                <Input
                  value={draftText}
                  onChange={(e) => setDraftText(e.target.value)}
                  placeholder={`Add a ${SLOT_LABELS[slot].toLowerCase()} step…`}
                  className="h-6 flex-1 border-0 bg-transparent p-0 text-xs shadow-none focus-visible:ring-0"
                />
              </form>
            </div>
          ) : null}
        </div>
      )}

      {current && (
        <RoutineFocusMode
          open={focusOpen}
          onOpenChange={setFocusOpen}
          routine={current}
        />
      )}
    </div>
  );
}