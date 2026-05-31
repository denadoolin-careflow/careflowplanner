import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Clock, MoreHorizontal, Pencil, Play, Plus, Repeat, Sparkles, Tag, Timer, Trash2, UserPlus, Users, Wand2, X } from "lucide-react";
import {
  routines as routinesApi,
  useRoutines,
  ROUTINE_SLOTS,
  ROUTINE_CADENCES,
  SLOT_LABEL,
  CADENCE_LABEL,
  SLOT_DEFAULT_TIME,
  formatTime12,
  routineTotalMinutes,
  type Routine,
  type RoutineSlot,
  type RoutineCadence,
} from "@/lib/routines";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { PomodoroDialog } from "@/components/routines/PomodoroDialog";
import { NowNextBanner } from "@/components/routines/NowNextBanner";
import { RoutineItemRow } from "@/components/routines/RoutineItemRow";
import { RoutineFocusMode } from "@/components/routines/RoutineFocusMode";
import { AIBreakdownDialog } from "@/components/routines/AIBreakdownDialog";
import { RitualStrip } from "@/components/routines/RitualStrip";
import { peopleTags, PERSON_COLORS, fallbackPersonColor } from "@/lib/people-tags";
import { SearchableIconPicker, IconView } from "@/components/common/SearchableIconPicker";
import { TodaysGarden } from "@/components/routines/TodaysGarden";
import { CompactRoutineCard } from "@/components/routines/CompactRoutineCard";
import { getRoutineState, GARDEN_META, type GardenState } from "@/lib/routine-garden";

type GroupBy = "person" | "timeframe" | "cadence" | "tag";

export default function Routines() {
  const { state } = useStore();
  const { routines: list, loaded } = useRoutines();
  const [groupBy, setGroupBy] = useState<GroupBy>("person");
  const [filterPerson, setFilterPerson] = useState<string>("all");
  const [filterTag, setFilterTag] = useState<string>("all");
  const [newPerson, setNewPerson] = useState("");
  const [focus, setFocus] = useState<{ routine: Routine; itemId?: string } | null>(null);
  const [stateFilter, setStateFilter] = useState<GardenState | "all">("all");

  const people = useMemo(() => {
    const fromRoutines = routinesApi.people();
    const fromRecipients = state.recipients.map(r => r.name);
    return Array.from(new Set([...fromRoutines, ...fromRecipients])).sort();
  }, [list, state.recipients]);

  const allTags = useMemo(() => routinesApi.allTags(), [list]);

  const filtered = useMemo(() => {
    return list.filter(r => {
      if (filterPerson !== "all" && r.person_name !== filterPerson) return false;
      if (filterTag !== "all" && !r.tags.includes(filterTag)) return false;
      return true;
    });
  }, [list, filterPerson, filterTag]);

  const visible = useMemo(
    () => stateFilter === "all" ? filtered : filtered.filter(r => getRoutineState(r) === stateFilter),
    [filtered, stateFilter],
  );

  // Smart-sorted state sections — Needs Care first, then Growing, Blooming, Resting.
  const stateSections = useMemo(() => {
    const order: GardenState[] = ["seedling", "growing", "blooming", "resting"];
    const bucket: Record<GardenState, Routine[]> = { seedling: [], growing: [], blooming: [], resting: [] };
    visible.forEach(r => bucket[getRoutineState(r)].push(r));
    return order
      .filter(s => bucket[s].length > 0)
      .map(s => ({ state: s, items: bucket[s], defaultCollapsed: s === "blooming" || s === "resting" }));
  }, [visible]);

  const addPersonInline = async () => {
    const n = newPerson.trim();
    if (!n) return;
    await routinesApi.addPerson(n);
    setNewPerson("");
    toast.success(`${n} added.`);
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 overflow-x-hidden p-4 md:p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Routines</h1>
          <p className="text-sm text-muted-foreground">
            Organize daily, weekly, and monthly rituals by person, timeframe, or cadence.
          </p>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="rounded-full">
              <UserPlus className="mr-1.5 h-4 w-4" /> Add person
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-60 p-2" align="end">
            <form onSubmit={(e) => { e.preventDefault(); void addPersonInline(); }} className="flex gap-1">
              <Input
                autoFocus
                value={newPerson}
                onChange={(e) => setNewPerson(e.target.value)}
                placeholder="Name"
                className="h-8 text-xs"
              />
              <Button type="submit" size="sm" className="h-8 px-2 text-xs">Add</Button>
            </form>
          </PopoverContent>
        </Popover>
      </header>

      <NowNextBanner
        routines={filterPerson === "all" ? filtered : filtered.filter(r => r.person_name === filterPerson)}
        onFocus={(r, itemId) => setFocus({ routine: r, itemId })}
      />

      <TodaysGarden
        routines={filtered}
        activeFilter={stateFilter}
        onFilterChange={setStateFilter}
      />

      <RitualStrip title="Rituals today" />

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-card/40 p-2">
        <Select value={filterPerson} onValueChange={setFilterPerson}>
          <SelectTrigger className="h-8 w-40 text-xs"><SelectValue placeholder="All people" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All people</SelectItem>
            {people.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterTag} onValueChange={setFilterTag}>
          <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="All tags" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tags</SelectItem>
            {allTags.map(t => <SelectItem key={t} value={t}>#{t}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="ml-auto text-xs text-muted-foreground">
          {visible.length} routine{visible.length === 1 ? "" : "s"}
        </div>
      </div>

      {!loaded && <p className="text-sm text-muted-foreground">Loading…</p>}

      {loaded && people.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border/60 bg-card/40 p-10 text-center text-sm text-muted-foreground">
          No routines yet. Add a person above to begin.
        </div>
      )}

      {loaded && people.length > 0 && filterPerson === "all" && (
        <PersonQuickAdd people={people} />
      )}

      <div className="space-y-4">
        {stateSections.map(sec => (
          <StateSection
            key={sec.state}
            state={sec.state}
            routines={sec.items}
            recipients={state.recipients}
            defaultCollapsed={sec.defaultCollapsed}
            onFocus={(r, itemId) => setFocus({ routine: r, itemId })}
          />
        ))}
        {loaded && visible.length === 0 && stateFilter !== "all" && (
          <div className="rounded-2xl border border-dashed border-border/60 bg-card/40 p-8 text-center text-sm text-muted-foreground">
            Nothing {GARDEN_META[stateFilter as GardenState].label.toLowerCase()} right now.
          </div>
        )}
      </div>

      {focus && (
        <RoutineFocusMode
          open={!!focus}
          onOpenChange={(o) => { if (!o) setFocus(null); }}
          routine={list.find(r => r.id === focus.routine.id) ?? focus.routine}
          startItemId={focus.itemId}
        />
      )}
    </div>
  );
}

function StateSection({
  state, routines: items, recipients, defaultCollapsed, onFocus,
}: {
  state: GardenState;
  routines: Routine[];
  recipients: { id: string; name: string }[];
  defaultCollapsed: boolean;
  onFocus?: (r: Routine, itemId?: string) => void;
}) {
  const meta = GARDEN_META[state];
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  return (
    <section className="space-y-2">
      <button
        type="button"
        onClick={() => setCollapsed(c => !c)}
        className="flex w-full items-center gap-2 rounded-lg px-1 text-left hover:bg-muted/30"
      >
        <ChevronRight className={cn("h-4 w-4 text-muted-foreground transition-transform", !collapsed && "rotate-90")} />
        <span className="text-base leading-none">{meta.emoji}</span>
        <h2 className="text-sm font-semibold">{meta.label}</h2>
        <span className="ml-auto rounded-full bg-muted/60 px-1.5 text-[10.5px] font-medium tabular-nums text-muted-foreground">{items.length}</span>
      </button>
      {!collapsed && (
        <div className="grid gap-2 sm:grid-cols-2">
          {items.map(r => (
            <CompactRoutineCard key={r.id} routine={r} recipients={recipients} onFocus={onFocus} />
          ))}
        </div>
      )}
    </section>
  );
}

function PersonQuickAdd({ people }: { people: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5 px-1">
      {people.map(p => <PersonChip key={p} name={p} />)}
    </div>
  );
}

function PersonChip({ name }: { name: string }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const color = peopleTags.colorFor(name) || fallbackPersonColor(name);
  const icon = peopleTags.iconFor(name);

  const commit = async () => {
    const next = draft.trim();
    if (!next || next === name) { setEditing(false); setDraft(name); return; }
    await routinesApi.renamePerson(name, next);
    toast.success(`Renamed to ${next}`);
    setEditing(false);
    setOpen(false);
  };

  const remove = async () => {
    if (!confirm(`Remove all routines for ${name}?`)) return;
    await routinesApi.removePerson(name);
    toast.success(`${name} removed.`);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditing(false); setDraft(name); } }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          style={{ background: color, color: "#fff" }}
          className="group inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium hover:opacity-90"
        >
          {icon && <IconView value={icon} className="h-3 w-3" />}
          {name}
          <MoreHorizontal className="h-3 w-3 opacity-70 group-hover:opacity-100" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        {editing ? (
          <form onSubmit={(e) => { e.preventDefault(); void commit(); }} className="flex gap-1">
            <Input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} className="h-8 text-xs" />
            <Button type="submit" size="sm" className="h-8 px-2 text-xs">Save</Button>
          </form>
        ) : (
          <div className="flex flex-col gap-1">
            <div className="px-1 pt-1">
              <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Color</div>
              <div className="flex flex-wrap gap-1">
                {PERSON_COLORS.map(c => (
                  <button key={c} type="button" onClick={() => void peopleTags.upsert(name, { color: c })}
                    style={{ background: c }}
                    className={cn("h-5 w-5 rounded-full border", color === c ? "ring-2 ring-foreground" : "border-border/60")}
                    aria-label={`Set color ${c}`} />
                ))}
              </div>
              <div className="mt-2 mb-1 flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Icon</span>
                <SearchableIconPicker value={icon ?? undefined} onChange={(v) => void peopleTags.upsert(name, { icon: v || null })} />
              </div>
            </div>
            <div className="my-1 h-px bg-border/60" />
            <Button variant="ghost" size="sm" className="h-8 justify-start text-xs" onClick={() => setEditing(true)}>
              <Pencil className="mr-2 h-3.5 w-3.5" /> Rename
            </Button>
            <Button variant="ghost" size="sm" className="h-8 justify-start text-xs text-destructive hover:text-destructive" onClick={remove}>
              <Trash2 className="mr-2 h-3.5 w-3.5" /> Remove
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function groupRoutines(items: Routine[], by: GroupBy) {
  type G = { id: string; label: string; subtitle?: string; items: Routine[] };
  const map = new Map<string, G>();
  const push = (key: string, label: string, r: Routine, subtitle?: string) => {
    const g = map.get(key) ?? { id: key, label, subtitle, items: [] };
    g.items.push(r);
    map.set(key, g);
  };
  for (const r of items) {
    if (by === "person") push(r.person_name, r.person_name, r);
    else if (by === "timeframe") push(r.slot, SLOT_LABEL[r.slot], r);
    else if (by === "cadence") push(r.cadence, CADENCE_LABEL[r.cadence], r);
    else {
      if (r.tags.length === 0) push("__untagged__", "Untagged", r);
      else r.tags.forEach(t => push(t, `#${t}`, r));
    }
  }
  const order: Record<GroupBy, (a: G, b: G) => number> = {
    person: (a, b) => a.label.localeCompare(b.label),
    timeframe: (a, b) => ROUTINE_SLOTS.indexOf(a.id as RoutineSlot) - ROUTINE_SLOTS.indexOf(b.id as RoutineSlot),
    cadence: (a, b) => ROUTINE_CADENCES.indexOf(a.id as RoutineCadence) - ROUTINE_CADENCES.indexOf(b.id as RoutineCadence),
    tag: (a, b) => a.label.localeCompare(b.label),
  };
  return Array.from(map.values()).sort(order[by]);
}

function RoutineGroup({
  title, subtitle, routines: items, recipients, onFocus,
}: {
  title: string; subtitle?: string; routines: Routine[]; recipients: { id: string; name: string }[];
  onFocus?: (r: Routine, itemId?: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <section className="space-y-2">
      <button
        type="button"
        onClick={() => setCollapsed(c => !c)}
        className="flex w-full items-center gap-2 rounded-lg px-1 text-left hover:bg-muted/30"
      >
        <ChevronRight className={cn("h-4 w-4 text-muted-foreground transition-transform", !collapsed && "rotate-90")} />
        <h2 className="text-base font-semibold">{title}</h2>
        {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
        <span className="ml-auto text-[11px] text-muted-foreground">{items.length}</span>
      </button>
      {!collapsed && (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map(r => <RoutineCard key={r.id} routine={r} recipients={recipients} onFocus={onFocus} />)}
        </div>
      )}
    </section>
  );
}

export function RoutineCard({
  routine: r, recipients, onFocus,
}: {
  routine: Routine;
  recipients: { id: string; name: string }[];
  onFocus?: (r: Routine, itemId?: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const [newTag, setNewTag] = useState("");
  const [generating, setGenerating] = useState(false);
  const [pomo, setPomo] = useState<{ open: boolean; title: string }>({ open: false, title: "" });
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const doneCount = r.items.filter(i => i.done).length;
  const timeValue = r.time_of_day ?? SLOT_DEFAULT_TIME[r.slot];
  const totalMin = routineTotalMinutes(r);
  const prepNotice = r.meta?.prepNoticeMin ?? 0;

  const generate = async () => {
    setGenerating(true);
    try {
      const ideas = await routinesApi.generateIdeas(r.person_name, r.slot);
      if (!ideas.length) { toast("No ideas came back."); return; }
      const existing = r.items.map(i => i.text.toLowerCase());
      const fresh = ideas.filter(i => !existing.includes(i.toLowerCase()));
      const next = [
        ...r.items,
        ...fresh.map(t => ({ id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,5)}`, text: t, done: false })),
      ];
      await routinesApi.upsert(r.person_name, r.slot, { items: next });
      toast.success(`Added ${fresh.length} ideas.`);
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't generate ideas");
    } finally { setGenerating(false); }
  };

  const addTag = async () => {
    const t = newTag.trim().toLowerCase();
    if (!t || r.tags.includes(t)) { setNewTag(""); return; }
    await routinesApi.upsert(r.person_name, r.slot, { tags: [...r.tags, t] });
    setNewTag("");
  };

  return (
    <div className="min-w-0 overflow-hidden rounded-3xl border border-border/60 bg-card/70 p-3 shadow-sm sm:p-3.5">
      {/* Row 1: identity chips */}
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        <span className="truncate font-medium text-sm">{r.person_name}</span>
        <Badge variant="outline" className="rounded-full px-1.5 py-0 text-[10px]">{SLOT_LABEL[r.slot]}</Badge>
        <Badge variant="outline" className="rounded-full px-1.5 py-0 text-[10px]">
          <Clock className="mr-0.5 inline h-2.5 w-2.5" />{formatTime12(timeValue)}
        </Badge>
        <Badge variant="secondary" className="rounded-full px-1.5 py-0 text-[10px]">
          <Repeat className="mr-0.5 inline h-2.5 w-2.5" />{CADENCE_LABEL[r.cadence]}
        </Badge>
        {totalMin > 0 && (
          <Badge variant="outline" className="rounded-full px-1.5 py-0 text-[10px]">~{totalMin}m</Badge>
        )}
        <span className="ml-auto text-[11px] text-muted-foreground">{doneCount}/{r.items.length} done</span>
      </div>

      {/* Row 2: action toolbar — never overlaps chips above */}
      <div className="mt-2 flex w-full flex-wrap items-center gap-1.5">
        {r.items.length > 0 && (
          <Button
            size="sm"
            variant="default"
            onClick={() => onFocus?.(r)}
            className="h-8 rounded-full px-3 text-[11px]"
            aria-label="Start focus mode"
          >
            <Play className="mr-1 h-3.5 w-3.5" /> Focus
          </Button>
        )}
        <Input
          type="time"
          value={timeValue}
          onChange={(e) => routinesApi.upsert(r.person_name, r.slot, { time_of_day: e.target.value || null })}
          className="h-8 w-[92px] px-1.5 text-[11px]"
          aria-label="Time of day"
        />
        <Select
          value={r.cadence}
          onValueChange={(v) => routinesApi.upsert(r.person_name, r.slot, { cadence: v as RoutineCadence })}
        >
          <SelectTrigger className="h-8 w-[88px] text-[11px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {ROUTINE_CADENCES.map(c => <SelectItem key={c} value={c}>{CADENCE_LABEL[c]}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-0.5">
          <Button size="sm" variant="ghost" onClick={generate} disabled={generating} className="h-8 px-2 text-[11px]" aria-label="Generate AI ideas">
            <Sparkles className={cn("h-3.5 w-3.5", generating && "animate-pulse")} />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setBreakdownOpen(true)} className="h-8 px-2 text-[11px]" aria-label="Break down a goal">
            <Wand2 className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost"
            onClick={() => setPomo({ open: true, title: `${r.person_name} · ${SLOT_LABEL[r.slot]}` })}
            className="h-8 px-2 text-[11px]"
            aria-label="Start pomodoro for routine"
          >
            <Timer className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Linked recipient */}
      {recipients.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <span>Linked to</span>
          <Select
            value={r.recipient_id ?? "__none__"}
            onValueChange={(v) => routinesApi.upsert(r.person_name, r.slot, { recipient_id: v === "__none__" ? null : v })}
          >
            <SelectTrigger className="h-6 w-40 text-[11px]"><SelectValue placeholder="No one" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">No one</SelectItem>
              {recipients.map(rec => <SelectItem key={rec.id} value={rec.id}>{rec.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <span className="ml-1">· Prep</span>
          <Select
            value={String(prepNotice)}
            onValueChange={(v) => routinesApi.upsert(r.person_name, r.slot, { meta: { prepNoticeMin: parseInt(v, 10) } })}
          >
            <SelectTrigger className="h-6 w-20 text-[11px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Off</SelectItem>
              <SelectItem value="2">2 min</SelectItem>
              <SelectItem value="5">5 min</SelectItem>
              <SelectItem value="10">10 min</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Items */}
      <div className="mt-2 space-y-1">
        {r.items.map(it => (
          <RoutineItemRow
            key={it.id}
            item={it}
            person={r.person_name}
            slot={r.slot}
            onFocus={() => onFocus?.(r, it.id)}
          />
        ))}
        <form
          onSubmit={(e) => { e.preventDefault(); if (!draft.trim()) return; void routinesApi.addItem(r.person_name, r.slot, draft.trim()); setDraft(""); }}
          className="flex items-center gap-1 rounded-md border border-dashed border-border bg-card/30 px-2 py-1"
        >
          <Plus className="h-3 w-3 text-muted-foreground" />
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add a step…"
            className="h-6 flex-1 border-0 bg-transparent p-0 text-xs shadow-none focus-visible:ring-0"
          />
        </form>
      </div>

      <PomodoroDialog
        open={pomo.open}
        onOpenChange={(o) => setPomo(s => ({ ...s, open: o }))}
        title={pomo.title}
        subtitle={`${SLOT_LABEL[r.slot]} · ${formatTime12(timeValue)}`}
      />

      <AIBreakdownDialog
        open={breakdownOpen}
        onOpenChange={setBreakdownOpen}
        routine={r}
      />

      {/* Tags */}
      <div className="mt-2 flex flex-wrap items-center gap-1">
        {r.tags.map(t => (
          <Badge key={t} variant="outline" className="rounded-full px-1.5 py-0 text-[10px]">
            #{t}
            <button
              onClick={() => routinesApi.upsert(r.person_name, r.slot, { tags: r.tags.filter(x => x !== t) })}
              className="ml-1 opacity-60 hover:opacity-100"
            ><X className="h-2.5 w-2.5" /></button>
          </Badge>
        ))}
        <form onSubmit={(e) => { e.preventDefault(); void addTag(); }} className="flex items-center gap-1">
          <Tag className="h-3 w-3 text-muted-foreground" />
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="tag"
            className="h-5 w-16 border-0 bg-transparent p-0 text-[10px] shadow-none focus-visible:ring-0"
          />
        </form>
      </div>
    </div>
  );
}

/** Public helper for embedding routines for a single person/recipient (used by Caregiving page). */
export function PersonRoutinesPanel({
  personName,
  recipientId,
  recipients,
}: {
  personName: string;
  recipientId?: string;
  recipients: { id: string; name: string }[];
}) {
  const { routines: list, loaded } = useRoutines();
  const [newSlot, setNewSlot] = useState<RoutineSlot>("morning");
  const [newCadence, setNewCadence] = useState<RoutineCadence>("daily");

  // Auto-link routines to recipient on mount when missing
  useEffect(() => {
    if (!recipientId) return;
    list
      .filter(r => r.person_name === personName && r.recipient_id !== recipientId)
      .forEach(r => { void routinesApi.upsert(r.person_name, r.slot, { recipient_id: recipientId }); });
  }, [loaded, personName, recipientId]); // eslint-disable-line react-hooks/exhaustive-deps

  const items = list.filter(r => r.person_name === personName);
  const existingSlots = new Set(items.map(r => r.slot));

  const addSlot = async () => {
    if (existingSlots.has(newSlot)) { toast(`${SLOT_LABEL[newSlot]} already exists.`); return; }
    await routinesApi.upsert(personName, newSlot, { cadence: newCadence, recipient_id: recipientId ?? null });
  };

  if (!loaded) return <p className="text-sm text-muted-foreground">Loading routines…</p>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-card/40 p-2 text-xs">
        <span className="text-muted-foreground">New routine for {personName}</span>
        <Select value={newSlot} onValueChange={(v) => setNewSlot(v as RoutineSlot)}>
          <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {ROUTINE_SLOTS.map(s => <SelectItem key={s} value={s}>{SLOT_LABEL[s]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={newCadence} onValueChange={(v) => setNewCadence(v as RoutineCadence)}>
          <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {ROUTINE_CADENCES.map(c => <SelectItem key={c} value={c}>{CADENCE_LABEL[c]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" className="h-7 px-2 text-xs" onClick={addSlot}>
          <Plus className="mr-1 h-3 w-3" /> Add
        </Button>
      </div>
      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/40 bg-card/30 p-4 text-center text-xs italic text-muted-foreground">
          No routines yet — add one above.
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map(r => <RoutineCard key={r.id} routine={r} recipients={recipients} />)}
        </div>
      )}
    </div>
  );
}