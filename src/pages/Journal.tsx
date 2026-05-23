import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useStore } from "@/lib/store";
import { SectionCard } from "@/components/cards/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format, parseISO, subDays, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { Trash2, Search, Sparkles, Pin, PinOff, Flame, Plus, X, Filter, Layers, ArrowUpDown, LayoutList, GanttChart } from "lucide-react";
import { ChevronDown, Wind } from "lucide-react";
import { Link } from "react-router-dom";
import { JournalEntry } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { BlockEditor } from "@/components/notes/BlockEditor";
import { NoteMarkdown } from "@/components/notes/NoteMarkdown";
import { getMoonPhase, MOON_INFO } from "@/lib/moon";
import { RhythmJournalPrompt } from "@/components/rhythm/RhythmJournalPrompt";
import { JournalProjectPicker } from "@/components/journal/JournalProjectPicker";
import { startOfWeek, endOfWeek, startOfYear, getYear } from "date-fns";

type TemplateKey =
  | "daily" | "gratitude" | "brain-dump" | "caregiver-reflection" | "emotional-checkin"
  | "daily-reset" | "productivity" | "habit-reflection"
  | "new-moon" | "first-quarter-moon" | "full-moon" | "last-quarter-moon";

const TEMPLATES: { key: TemplateKey; label: string; emoji: string; type: JournalEntry["type"]; prompts: string[]; accent: "sage" | "warm" | "calm"; ritual?: string }[] = [
  { key: "daily", label: "Daily", emoji: "🌿", type: "daily", accent: "sage", prompts: ["How am I, really?", "One thing I noticed today…", "What needs my attention tomorrow?"] },
  { key: "gratitude", label: "Gratitude", emoji: "🌼", type: "gratitude", accent: "warm", prompts: ["Three small things I appreciated…", "Someone who made today softer…", "A moment I want to remember…"] },
  { key: "brain-dump", label: "Brain dump", emoji: "🌀", type: "brain-dump", accent: "calm", prompts: ["Everything that's loud right now — unfiltered.", "What's been circling in my head?"] },
  { key: "caregiver-reflection", label: "Caregiver", emoji: "🤲", type: "daily", accent: "warm", prompts: ["What is full today, what is empty?", "Where did I show up well?", "What support do I need?"] },
  { key: "emotional-checkin", label: "Emotional check-in", emoji: "💗", type: "daily", accent: "warm", prompts: ["What am I feeling, named gently?", "Where do I feel it in my body?", "What's underneath the feeling?"] },
  { key: "daily-reset", label: "Daily reset", emoji: "🌙", type: "daily", accent: "calm", prompts: ["What can I release from today?", "What did I learn?", "What do I want to carry into tomorrow?"] },
  { key: "productivity", label: "Productivity", emoji: "⚡️", type: "daily", accent: "sage", prompts: ["Where did my focus go?", "What created friction?", "What's the smallest next step?"] },
  { key: "habit-reflection", label: "Habit reflection", emoji: "🌱", type: "daily", accent: "sage", prompts: ["Which habits stuck this week?", "Which ones slipped, and why?", "What gentle adjustment could help?"] },
  { key: "new-moon", label: "New Moon", emoji: "🌑", type: "monthly", accent: "calm",
    prompts: ["What quiet wish is taking root?", "What am I ready to begin — softly?", "What seed do I want to plant this cycle?", "What does 'a fresh start' look like for me right now?"],
    ritual: "Light a candle. Sit in dim light for 3 minutes. Write one intention you can whisper, not shout." },
  { key: "first-quarter-moon", label: "First Quarter Moon", emoji: "🌓", type: "weekly", accent: "sage",
    prompts: ["Where am I meeting resistance?", "What's worth pushing through, and what's worth letting go?", "What small commitment will I keep this week?", "What support do I need to keep moving?"],
    ritual: "Pour a glass of water. Name one obstacle out loud, then one next step. Drink to seal it." },
  { key: "full-moon", label: "Full Moon", emoji: "🌕", type: "monthly", accent: "warm",
    prompts: ["What is fully lit in my life right now?", "What am I celebrating, even quietly?", "What feeling am I allowed to feel without fixing?", "What's ready to be witnessed?"],
    ritual: "Step outside for 1 minute. Let the moon (or sky) see you. Come back and write what surfaced." },
  { key: "last-quarter-moon", label: "Last Quarter Moon", emoji: "🌗", type: "weekly", accent: "calm",
    prompts: ["What am I ready to release without guilt?", "What story am I outgrowing?", "What's no longer mine to carry?", "What space am I clearing for next cycle?"],
    ritual: "Open a window. Exhale longer than you inhale, three times. Write what you're letting go of." },
];

const MOON_TO_TEMPLATE: Record<string, TemplateKey> = {
  "new": "new-moon",
  "waxing-crescent": "new-moon",
  "first-quarter": "first-quarter-moon",
  "waxing-gibbous": "first-quarter-moon",
  "full": "full-moon",
  "waning-gibbous": "full-moon",
  "last-quarter": "last-quarter-moon",
  "waning-crescent": "last-quarter-moon",
};

function templateForToday(): TemplateKey | null {
  const phase = getMoonPhase(new Date());
  return MOON_TO_TEMPLATE[phase] ?? null;
}

const MOODS = ["💗","😊","😌","😐","😔","😣","🥲","😴"];
const ENERGIES: { value: string; label: string }[] = [
  { value: "low", label: "Low" }, { value: "medium", label: "Medium" }, { value: "high", label: "High" },
];

const GROUP_LABEL = {
  none: "None",
  template: "Template",
  day: "Day",
  week: "Week",
  month: "Month",
  year: "Year",
  mood: "Mood",
  energy: "Energy",
} as const;
type GroupKey = keyof typeof GROUP_LABEL;

const SORT_LABEL = {
  newest: "Newest",
  oldest: "Oldest",
  template: "Template",
  mood: "Mood",
} as const;
type SortKey = keyof typeof SORT_LABEL;

function sortEntries(items: JournalEntry[], sort: SortKey): JournalEntry[] {
  const arr = [...items];
  switch (sort) {
    case "newest": return arr.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
    case "oldest": return arr.sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
    case "template": return arr.sort((a, b) => (a.template ?? a.type ?? "").localeCompare(b.template ?? b.type ?? ""));
    case "mood": return arr.sort((a, b) => (a.mood ?? "").localeCompare(b.mood ?? ""));
  }
}

function groupEntries(items: JournalEntry[], group: GroupKey, sort: SortKey): { key: string; label: string; items: JournalEntry[] }[] {
  const sorted = sortEntries(items, sort);
  const buckets = new Map<string, { label: string; items: JournalEntry[] }>();
  for (const e of sorted) {
    let key = "—", label = "—";
    if (group === "template") {
      const t = TEMPLATES.find(x => x.key === (e.template as TemplateKey));
      key = t?.key ?? "other"; label = t ? `${t.emoji} ${t.label}` : "Other";
    } else if (group === "day") {
      try { key = e.date; label = format(parseISO(e.date), "EEEE, MMM d, yyyy"); }
      catch { key = "unknown"; label = "Unknown date"; }
    } else if (group === "week") {
      try {
        const d = parseISO(e.date);
        const ws = startOfWeek(d, { weekStartsOn: 1 });
        const we = endOfWeek(d, { weekStartsOn: 1 });
        key = format(ws, "yyyy-'W'II");
        label = `Week of ${format(ws, "MMM d")} – ${format(we, "MMM d, yyyy")}`;
      } catch { key = "unknown"; label = "Unknown week"; }
    } else if (group === "month") {
      try { key = format(parseISO(e.date), "yyyy-MM"); label = format(parseISO(e.date), "MMMM yyyy"); }
      catch { key = "unknown"; label = "Unknown date"; }
    } else if (group === "year") {
      try { key = String(getYear(parseISO(e.date))); label = key; }
      catch { key = "unknown"; label = "Unknown year"; }
    } else if (group === "mood") {
      key = e.mood || "none"; label = e.mood || "No mood";
    } else if (group === "energy") {
      key = e.energy || "none"; label = e.energy ? e.energy[0].toUpperCase() + e.energy.slice(1) : "No energy";
    }
    if (!buckets.has(key)) buckets.set(key, { label, items: [] });
    buckets.get(key)!.items.push(e);
  }
  return Array.from(buckets.entries()).map(([key, v]) => ({ key, ...v }));
}

export default function Journal() {
  const { state, addJournal, updateJournal, deleteJournal } = useStore();
  const [template, setTemplate] = useState<TemplateKey>("daily");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [mood, setMood] = useState<string>("");
  const [energy, setEnergy] = useState<string>("");
  const [gratitudeItems, setGratitudeItems] = useState<string[]>(["", "", ""]);
  const [activePrompts, setActivePrompts] = useState<string[]>(TEMPLATES[0].prompts);
  const [aiLoading, setAiLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | TemplateKey>("all");
  const [q, setQ] = useState("");
  const [groupBy, setGroupBy] = useState<GroupKey>("none");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "template" | "mood">("newest");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [entriesView, setEntriesView] = useState<"cards" | "timeline">(() => {
    if (typeof window === "undefined") return "timeline";
    return (localStorage.getItem("journal.entriesView") as "cards" | "timeline") ?? "timeline";
  });
  const switchEntriesView = (v: "cards" | "timeline") => {
    setEntriesView(v);
    try { localStorage.setItem("journal.entriesView", v); } catch {}
  };

  const tpl = TEMPLATES.find(t => t.key === template) ?? TEMPLATES[0];
  const todaysMoonTpl = useMemo(() => templateForToday(), []);
  const moonPhase = getMoonPhase(new Date());
  const moon = MOON_INFO[moonPhase];
  const [searchParams, setSearchParams] = useSearchParams();
  const linkProjectId = searchParams.get("linkProject");
  const linkProjectLabel = searchParams.get("label") ?? undefined;

  const switchTemplate = (k: TemplateKey) => {
    setTemplate(k);
    const t = TEMPLATES.find(x => x.key === k)!;
    setActivePrompts(t.prompts);
    if (k === "gratitude" && gratitudeItems.every(g => !g.trim())) setGratitudeItems(["", "", ""]);
  };

  useEffect(() => {
    const requested = searchParams.get("template") as TemplateKey | null;
    if (requested && TEMPLATES.some(t => t.key === requested)) {
      switchTemplate(requested);
      const next = new URLSearchParams(searchParams);
      next.delete("template");
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const generatePrompts = async () => {
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-journal", {
        body: { template, mood, energy, context: title || body.slice(0, 200) },
      });
      if (error) throw error;
      if (Array.isArray(data?.prompts) && data.prompts.length) {
        setActivePrompts(data.prompts);
        toast.success("Fresh prompts ready");
      }
    } catch (e: any) {
      toast.error(e?.message ?? "AI prompts unavailable");
    } finally {
      setAiLoading(false);
    }
  };

  const insertPrompt = (p: string) => {
    setBody(b => (b ? `${b}\n\n**${p}**\n\n` : `**${p}**\n\n`));
  };

  const save = async () => {
    let finalBody = body.trim();
    if (template === "gratitude") {
      const list = gratitudeItems.map(g => g.trim()).filter(Boolean);
      if (list.length) finalBody = list.map((g, i) => `${i + 1}. ${g}`).join("\n") + (finalBody ? `\n\n${finalBody}` : "");
    }
    if (!finalBody) { toast.error("Write a sentence first"); return; }
    await addJournal({
      body: finalBody,
      type: tpl.type,
      title: title || undefined,
      template,
      mood: mood || undefined,
      energy: energy || undefined,
      prompts: activePrompts,
      gratitudeItems: template === "gratitude" ? gratitudeItems.filter(Boolean) : undefined,
      tags,
      linkedIds: linkProjectId
        ? [{ type: "project", id: linkProjectId, label: linkProjectLabel }]
        : undefined,
    } as any);
    setBody(""); setTitle(""); setMood(""); setEnergy(""); setGratitudeItems(["", "", ""]); setTags([]);
    toast.success("Saved to your journal");
  };

  // streak: consecutive days back from today with at least one entry
  const streak = useMemo(() => {
    const set = new Set(state.journal.map(j => j.date));
    let s = 0;
    for (let i = 0; i < 365; i++) {
      const d = format(subDays(new Date(), i), "yyyy-MM-dd");
      if (set.has(d)) s++;
      else if (i === 0) continue; // allow no entry today
      else break;
    }
    return s;
  }, [state.journal]);

  // monthly heatmap
  const monthDays = useMemo(() => {
    const start = startOfMonth(new Date());
    const end = endOfMonth(new Date());
    const days = eachDayOfInterval({ start, end });
    const counts = new Map<string, number>();
    state.journal.forEach(j => counts.set(j.date, (counts.get(j.date) ?? 0) + 1));
    return days.map(d => ({ d, count: counts.get(format(d, "yyyy-MM-dd")) ?? 0 }));
  }, [state.journal]);

  const filtered = state.journal.filter(e =>
    (filter === "all" || (e.template ?? e.type) === filter) &&
    (q === "" || (e.body + (e.title ?? "") + (e.tags ?? []).join(" ")).toLowerCase().includes(q.toLowerCase()))
  );

  const pinned = filtered.filter(e => e.pinned);
  const rest = filtered.filter(e => !e.pinned);

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (!t) return;
    if (!tags.includes(t)) setTags([...tags, t]);
    setTagInput("");
  };

  return (
    <div className="space-y-6">
      {linkProjectId && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-2.5 text-sm">
          <span className="text-primary">
            New entry will be linked to project
            {linkProjectLabel ? <strong className="ml-1">{linkProjectLabel}</strong> : null}.
          </span>
          <button
            onClick={() => {
              const next = new URLSearchParams(searchParams);
              next.delete("linkProject"); next.delete("label");
              setSearchParams(next, { replace: true });
            }}
            className="text-xs text-primary/80 underline hover:text-primary"
          >
            Clear
          </button>
        </div>
      )}
      <div className="cozy-card gradient-warm p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl font-semibold">Journal</h2>
            <p className="mt-1 text-sm text-muted-foreground">Soft pages. Templates, prompts, and a quiet place to land.</p>
            <Link
              to="/journal-flow"
              className="mt-3 ml-0 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/15"
              title="Focused writing with a Pomodoro by your side"
            >
              <Wind className="h-3.5 w-3.5" /> Open Journal & Flow
            </Link>
            {todaysMoonTpl && (
              <button
                onClick={() => switchTemplate(todaysMoonTpl)}
                className="mt-3 inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1.5 text-xs hover:bg-background"
                title="Open today's moon template"
              >
                <span aria-hidden>{moon.glyph}</span>
                <span className="font-medium">{moon.label} ritual</span>
                <span className="text-muted-foreground">· tap to journal</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-full bg-background/60 px-3 py-1.5 text-sm shadow-sm">
              <Flame className="h-4 w-4 text-primary" />
              <span className="font-medium">{streak}</span>
              <span className="text-muted-foreground">day streak</span>
            </div>
            <div className="hidden md:flex items-center gap-1">
              {monthDays.map(({ d, count }) => (
                <span
                  key={d.toISOString()}
                  title={`${format(d, "MMM d")} — ${count} entr${count === 1 ? "y" : "ies"}`}
                  className={cn(
                    "h-3 w-3 rounded-sm border border-border/40",
                    isSameDay(d, new Date()) && "ring-1 ring-primary",
                    count === 0 ? "bg-muted/30" :
                    count === 1 ? "bg-primary/30" :
                    count === 2 ? "bg-primary/60" : "bg-primary",
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <RhythmJournalPrompt scope="daily" />

      <SectionCard title="Choose a template" accent="sage">
        <div className="flex flex-wrap gap-2">
          {TEMPLATES.map(t => (
            <button
              key={t.key}
              onClick={() => switchTemplate(t.key)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm transition",
                template === t.key
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border/60 bg-background hover:bg-muted/40",
              )}
            >
              <span className="mr-1">{t.emoji}</span>{t.label}
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard title={`${tpl.emoji} ${tpl.label} entry`} accent={tpl.accent}>
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
          <Input placeholder="Title (optional)" value={title} onChange={e => setTitle(e.target.value)} />
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground mr-1">Mood</span>
            {MOODS.map(m => (
              <button key={m} onClick={() => setMood(mood === m ? "" : m)}
                className={cn("h-8 w-8 rounded-full text-base transition", mood === m ? "bg-primary/20 ring-1 ring-primary" : "hover:bg-muted/50")}>
                {m}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground mr-1">Energy</span>
            {ENERGIES.map(e => (
              <button key={e.value} onClick={() => setEnergy(energy === e.value ? "" : e.value)}
                className={cn("rounded-full px-2.5 py-1 text-xs", energy === e.value ? "bg-primary text-primary-foreground" : "bg-muted/50 hover:bg-muted")}>
                {e.label}
              </button>
            ))}
          </div>
        </div>

        {tpl.ritual && (
          <div className="mt-3 rounded-xl border border-primary/30 bg-primary/5 p-3">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-primary/80">Ritual</div>
            <p className="mt-1 text-sm leading-snug">{tpl.ritual}</p>
          </div>
        )}

        <div className="mt-3 rounded-xl border border-dashed border-border/60 bg-muted/20 p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-xs font-medium text-muted-foreground">Prompts</div>
            <Button size="sm" variant="ghost" onClick={generatePrompts} disabled={aiLoading}>
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />{aiLoading ? "Thinking…" : "AI prompts"}
            </Button>
          </div>
          <ul className="grid gap-1.5 text-sm md:grid-cols-2">
            {activePrompts.map((p, i) => (
              <li key={i}>
                <button onClick={() => insertPrompt(p)} className="w-full rounded-lg bg-background/70 px-3 py-2 text-left font-display leading-snug hover:bg-background">
                  {p}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {template === "gratitude" ? (
          <div className="mt-3 space-y-2">
            {gratitudeItems.map((g, i) => (
              <Input key={i} placeholder={`Grateful for #${i + 1}`} value={g}
                onChange={e => setGratitudeItems(gs => gs.map((v, idx) => idx === i ? e.target.value : v))} />
            ))}
            <button onClick={() => setGratitudeItems(gs => [...gs, ""])} className="text-xs text-muted-foreground hover:text-foreground">
              <Plus className="inline h-3 w-3" /> add another
            </button>
            <div className="rounded-xl border border-border/60 bg-card/60 p-2">
              <BlockEditor body={body} onChange={(md) => setBody(md)} placeholder="Anything else you want to add…" />
            </div>
          </div>
        ) : (
          <div className="mt-3 rounded-xl border border-border/60 bg-card/60 p-2 min-h-[180px]">
            <BlockEditor body={body} onChange={(md) => setBody(md)} placeholder="Write a sentence. That's enough. Press / for blocks." />
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {tags.map(t => (
            <span key={t} className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5 text-xs">
              #{t}
              <button onClick={() => setTags(tags.filter(x => x !== t))}><X className="h-3 w-3" /></button>
            </span>
          ))}
          <Input
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
            placeholder="Add tag…"
            className="h-7 w-32 text-xs"
          />
          <Button className="ml-auto" onClick={save}>Save entry</Button>
        </div>
      </SectionCard>

      <SectionCard
        title="Entries"
        accent="calm"
        action={
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input className="h-8 w-44 pl-7 text-xs" placeholder="Search…" value={q} onChange={e => setQ(e.target.value)} />
          </div>
        }
      >
        <div className="mb-3 flex flex-wrap items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
              <Filter className="h-3.5 w-3.5" />
              {filter === "all" ? "All entries" : TEMPLATES.find(t => t.key === filter)?.label}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52">
            <DropdownMenuCheckboxItem
              checked={filter === "all"}
              onCheckedChange={() => setFilter("all")}
            >
              All
            </DropdownMenuCheckboxItem>
            {TEMPLATES.map(t => (
              <DropdownMenuCheckboxItem
                key={t.key}
                checked={filter === t.key}
                onCheckedChange={() => setFilter(t.key)}
              >
                <span className="mr-1.5">{t.emoji}</span>{t.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
              <Layers className="h-3.5 w-3.5" /> Group: {GROUP_LABEL[groupBy]}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-44">
            {(Object.keys(GROUP_LABEL) as GroupKey[]).map(k => (
              <DropdownMenuCheckboxItem key={k} checked={groupBy === k} onCheckedChange={() => setGroupBy(k)}>
                {GROUP_LABEL[k]}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
              <ArrowUpDown className="h-3.5 w-3.5" /> Sort: {SORT_LABEL[sortBy]}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-44">
            {(Object.keys(SORT_LABEL) as SortKey[]).map(k => (
              <DropdownMenuCheckboxItem key={k} checked={sortBy === k} onCheckedChange={() => setSortBy(k)}>
                {SORT_LABEL[k]}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        </div>

        {pinned.length > 0 && (
          <div className="mb-4">
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Pinned</div>
            <ul className="space-y-3">{pinned.map(e => <EntryCard key={e.id} e={e} onPin={updateJournal} onDelete={deleteJournal} />)}</ul>
          </div>
        )}

        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">No entries yet.</p>
        ) : groupBy === "none" ? (
          <ul className="space-y-3">
            {sortEntries(rest, sortBy).map(e => <EntryCard key={e.id} e={e} onPin={updateJournal} onDelete={deleteJournal} />)}
          </ul>
        ) : (
          <div className="space-y-5">
            {groupEntries(rest, groupBy, sortBy).map(g => (
              <div key={g.key}>
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{g.label} <span className="ml-1 text-muted-foreground/70">({g.items.length})</span></div>
                <ul className="space-y-3">
                  {g.items.map(e => <EntryCard key={e.id} e={e} onPin={updateJournal} onDelete={deleteJournal} />)}
                </ul>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function EntryCard({ e, onPin, onDelete }: { e: JournalEntry; onPin: (id: string, p: Partial<JournalEntry>) => void; onDelete: (id: string) => void }) {
  const { updateJournal } = useStore();
  const tpl = TEMPLATES.find(t => t.key === (e.template as TemplateKey)) ?? TEMPLATES[0];
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(e.title ?? "");
  const [draftBody, setDraftBody] = useState(e.body ?? "");
  const preview = (e.body || "").replace(/[*_`#>\-]/g, "").replace(/\s+/g, " ").trim().slice(0, 120);

  const startEdit = () => {
    setDraftTitle(e.title ?? "");
    setDraftBody(e.body ?? "");
    setEditing(true);
    setOpen(true);
  };
  const saveEdit = async () => {
    await updateJournal(e.id, { title: draftTitle || undefined, body: draftBody });
    setEditing(false);
    toast.success("Entry updated");
  };

  return (
    <li className="group rounded-xl border border-border/60 bg-card transition hover:shadow-sm">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>{format(parseISO(e.date), "MMM d, yyyy")}</span>
            <span>·</span>
            <span>{tpl.emoji} {tpl.label}</span>
            {e.mood && <span className="text-base leading-none">{e.mood}</span>}
            {e.energy && <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide">{e.energy}</span>}
          </div>
          {e.title && <div className="mt-1 truncate font-display text-base">{e.title}</div>}
          {!open && preview && (
            <p className="mt-0.5 truncate text-sm text-muted-foreground">{preview}</p>
          )}
        </div>
        <div
          className="flex items-center gap-2 opacity-60 transition-opacity group-hover:opacity-100"
          onClick={(ev) => ev.stopPropagation()}
          role="presentation"
        >
          <button onClick={startEdit} title="Edit" className="text-muted-foreground hover:text-foreground text-[11px] underline">Edit</button>
          <button onClick={() => onPin(e.id, { pinned: !e.pinned })} title={e.pinned ? "Unpin" : "Pin"}>
            {e.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
          </button>
          <button onClick={() => onDelete(e.id)}><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      </button>
      {open && (
        <div className="space-y-2 border-t border-border/50 px-4 pb-4 pt-3">
          {editing ? (
            <div className="space-y-2">
              <Input
                value={draftTitle}
                onChange={(ev) => setDraftTitle(ev.target.value)}
                placeholder="Title (optional)"
                className="h-9"
              />
              <div className="rounded-xl border border-border/60 bg-card/60 p-2 min-h-[160px]">
                <BlockEditor body={draftBody} onChange={setDraftBody} placeholder="Edit your entry…" />
              </div>
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
                <Button size="sm" onClick={saveEdit}>Save changes</Button>
              </div>
            </div>
          ) : (
            <div className="text-sm leading-relaxed">
              <NoteMarkdown body={e.body} />
            </div>
          )}
          {e.tags && e.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {e.tags.map(t => <span key={t} className="rounded-full bg-muted/50 px-2 py-0.5 text-[10px]">#{t}</span>)}
            </div>
          )}
          <div className="pt-1">
            <JournalProjectPicker entry={e} />
          </div>
        </div>
      )}
    </li>
  );
}
