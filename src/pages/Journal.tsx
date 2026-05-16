import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { SectionCard } from "@/components/cards/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, parseISO, subDays, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { Trash2, Search, Sparkles, Pin, PinOff, Flame, Plus, X } from "lucide-react";
import { JournalEntry } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { BlockEditor } from "@/components/notes/BlockEditor";
import { NoteMarkdown } from "@/components/notes/NoteMarkdown";
import { getMoonPhase, MOON_INFO } from "@/lib/moon";

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
  "first-quarter": "first-quarter-moon",
  "full": "full-moon",
  "last-quarter": "last-quarter-moon",
};

function templateForToday(): TemplateKey | null {
  const phase = getMoonPhase(new Date());
  return MOON_TO_TEMPLATE[phase] ?? null;
}

const MOODS = ["💗","😊","😌","😐","😔","😣","🥲","😴"];
const ENERGIES: { value: string; label: string }[] = [
  { value: "low", label: "Low" }, { value: "medium", label: "Medium" }, { value: "high", label: "High" },
];

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
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  const tpl = TEMPLATES.find(t => t.key === template) ?? TEMPLATES[0];
  const todaysMoonTpl = useMemo(() => templateForToday(), []);
  const moonPhase = getMoonPhase(new Date());
  const moon = MOON_INFO[moonPhase];

  const switchTemplate = (k: TemplateKey) => {
    setTemplate(k);
    const t = TEMPLATES.find(x => x.key === k)!;
    setActivePrompts(t.prompts);
    if (k === "gratitude" && gratitudeItems.every(g => !g.trim())) setGratitudeItems(["", "", ""]);
  };

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
      <div className="cozy-card gradient-warm p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl font-semibold">Journal</h2>
            <p className="mt-1 text-sm text-muted-foreground">Soft pages. Templates, prompts, and a quiet place to land.</p>
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
        <Tabs value={filter} onValueChange={(v: any) => setFilter(v)} className="mb-3">
          <TabsList className="flex-wrap">
            <TabsTrigger value="all">All</TabsTrigger>
            {TEMPLATES.map(t => <TabsTrigger key={t.key} value={t.key}>{t.emoji} {t.label}</TabsTrigger>)}
          </TabsList>
        </Tabs>

        {pinned.length > 0 && (
          <div className="mb-4">
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Pinned</div>
            <ul className="space-y-3">{pinned.map(e => <EntryCard key={e.id} e={e} onPin={updateJournal} onDelete={deleteJournal} />)}</ul>
          </div>
        )}

        <ul className="space-y-3">
          {rest.map(e => <EntryCard key={e.id} e={e} onPin={updateJournal} onDelete={deleteJournal} />)}
          {filtered.length === 0 && <p className="text-sm text-muted-foreground">No entries yet.</p>}
        </ul>
      </SectionCard>
    </div>
  );
}

function EntryCard({ e, onPin, onDelete }: { e: JournalEntry; onPin: (id: string, p: Partial<JournalEntry>) => void; onDelete: (id: string) => void }) {
  const tpl = TEMPLATES.find(t => t.key === (e.template as TemplateKey)) ?? TEMPLATES[0];
  return (
    <li className="group rounded-xl border border-border/60 bg-card p-4 transition hover:shadow-sm">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <span>{format(parseISO(e.date), "MMM d, yyyy")}</span>
          <span>·</span>
          <span>{tpl.emoji} {tpl.label}</span>
          {e.mood && <span className="text-base leading-none">{e.mood}</span>}
          {e.energy && <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide">{e.energy}</span>}
        </span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-80">
          <button onClick={() => onPin(e.id, { pinned: !e.pinned })} title={e.pinned ? "Unpin" : "Pin"}>
            {e.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
          </button>
          <button onClick={() => onDelete(e.id)}><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      </div>
      {e.title && <div className="mt-1 font-display text-base">{e.title}</div>}
      <div className="mt-1 text-sm leading-relaxed">
        <NoteMarkdown body={e.body} />
      </div>
      {e.tags && e.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {e.tags.map(t => <span key={t} className="rounded-full bg-muted/50 px-2 py-0.5 text-[10px]">#{t}</span>)}
        </div>
      )}
    </li>
  );
}
