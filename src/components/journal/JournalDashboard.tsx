import { useMemo, useState } from "react";
import { format, parseISO, subDays, isSameDay } from "date-fns";
import { Flame, Sparkles, Loader2, Heart } from "lucide-react";
import { useStore } from "@/lib/store";
import { aiInvoke } from "@/lib/ai-invoke";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const REFLECTION_PROMPTS = [
  "How am I, really — beneath the to-do list?",
  "What's one thing I'd like to release from today?",
  "Where did I show up well, even quietly?",
  "What does my body need that my mind keeps ignoring?",
  "Who or what made today a little softer?",
  "What small win deserves to be named?",
  "If today had a color, what would it be — and why?",
  "What am I carrying that isn't mine?",
  "What's one kind thing I could do for tomorrow's me?",
  "What feeling has been knocking that I haven't opened the door for?",
];

const MOODS: { emoji: string; label: string }[] = [
  { emoji: "💗", label: "Tender" },
  { emoji: "😊", label: "Light" },
  { emoji: "😌", label: "Calm" },
  { emoji: "😐", label: "Neutral" },
  { emoji: "😔", label: "Heavy" },
  { emoji: "😣", label: "Overwhelmed" },
];

function pickPrompt(date: Date) {
  const seed = Number(format(date, "yyyyMMdd"));
  return REFLECTION_PROMPTS[seed % REFLECTION_PROMPTS.length];
}

export function JournalDashboard({ onUsePrompt }: { onUsePrompt?: (prompt: string) => void }) {
  const { state, addJournal } = useStore();
  const todayPrompt = useMemo(() => pickPrompt(new Date()), []);
  const today = format(new Date(), "yyyy-MM-dd");
  const todaysEntries = state.journal.filter((j) => j.date === today);
  const todayMood = todaysEntries.find((j) => (j as any).mood)?.mood as string | undefined;

  const last7 = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const d = subDays(new Date(), 6 - i);
      const dStr = format(d, "yyyy-MM-dd");
      const entries = state.journal.filter((j) => j.date === dStr);
      const mood = entries.find((j) => (j as any).mood)?.mood as string | undefined;
      return { d, dStr, count: entries.length, mood };
    });
  }, [state.journal]);

  const streak = useMemo(() => {
    const set = new Set(state.journal.map((j) => j.date));
    let s = 0;
    for (let i = 0; i < 365; i++) {
      const d = format(subDays(new Date(), i), "yyyy-MM-dd");
      if (set.has(d)) s++;
      else if (i === 0) continue;
      else break;
    }
    return s;
  }, [state.journal]);

  const [insights, setInsights] = useState<{ themes: string[]; patterns: string[]; breakthroughs: string[]; reflection_prompt?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const loadInsights = async () => {
    setLoading(true);
    try {
      const recent = state.journal.slice(-30).map((j) => ({ date: j.date, text: String(j.body ?? "").slice(0, 400) }));
      const { data, error } = await aiInvoke("ai-cosmic-journal-insights", { body: { entries: recent } });
      if (error) throw error;
      setInsights({
        themes: data?.themes ?? [],
        patterns: data?.patterns ?? [],
        breakthroughs: data?.breakthroughs ?? [],
        reflection_prompt: data?.reflection_prompt,
      });
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't pull themes right now");
    } finally {
      setLoading(false);
    }
  };

  const logMood = async (emoji: string) => {
    try {
      await addJournal({
        body: `Mood check-in: ${emoji}`,
        type: "daily",
        template: "emotional-checkin",
        mood: emoji,
        tags: ["mood-checkin"],
      } as any);
      toast.success("Mood noted — gently held");
    } catch {
      toast.error("Couldn't save mood");
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Today's Reflection */}
      <div className="cozy-card gradient-warm relative overflow-hidden p-5 lg:col-span-2">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/80">
          <Heart className="h-3 w-3" /> Today's reflection
        </div>
        <p className="mt-3 font-display text-2xl leading-snug">{todayPrompt}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => onUsePrompt?.(todayPrompt)}>
            Write on this
          </Button>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-background/60 px-3 py-1.5 text-xs">
            <Flame className="h-3.5 w-3.5 text-primary" />
            <span className="font-medium">{streak}</span>
            <span className="text-muted-foreground">day streak</span>
          </span>
          {todaysEntries.length > 0 && (
            <span className="rounded-full bg-background/60 px-3 py-1.5 text-xs text-muted-foreground">
              {todaysEntries.length} entr{todaysEntries.length === 1 ? "y" : "ies"} today
            </span>
          )}
        </div>

        {/* 7-day strip */}
        <div className="mt-5">
          <div className="mb-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">Last 7 days</div>
          <div className="flex items-end justify-between gap-1">
            {last7.map(({ d, dStr, count, mood }) => (
              <div key={dStr} className="flex flex-1 flex-col items-center gap-1">
                <div
                  title={`${format(d, "EEE MMM d")} — ${count} entr${count === 1 ? "y" : "ies"}`}
                  className={cn(
                    "flex h-10 w-full items-end justify-center rounded-md border border-border/40 bg-background/60 text-base leading-none",
                    isSameDay(d, new Date()) && "ring-1 ring-primary",
                  )}
                >
                  <span className="pb-1">{mood ?? (count > 0 ? "·" : "")}</span>
                </div>
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                  {format(d, "EEEEE")}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mood wheel */}
      <div className="cozy-card p-5">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          How are you, right now?
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          One tap. No paragraph required.
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {MOODS.map((m) => (
            <button
              key={m.emoji}
              onClick={() => logMood(m.emoji)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl border border-border/60 bg-background/60 px-2 py-3 transition hover:bg-muted/50",
                todayMood === m.emoji && "border-primary bg-primary/10 ring-1 ring-primary",
              )}
              title={m.label}
            >
              <span className="text-2xl leading-none">{m.emoji}</span>
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{m.label}</span>
            </button>
          ))}
        </div>
        {todayMood && (
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Today's mood: <span className="text-base align-middle">{todayMood}</span>
          </p>
        )}
      </div>

      {/* AI Wins & Themes */}
      <div className="cozy-card p-5 lg:col-span-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Wins & themes
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              A gentle mirror of what you've been writing lately.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={loadInsights} disabled={loading || state.journal.length === 0}>
            {loading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1.5 h-3.5 w-3.5" />}
            {insights ? "Refresh" : "Reflect for me"}
          </Button>
        </div>

        {insights && (
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <InsightList title="Themes" items={insights.themes} tone="sage" />
            <InsightList title="Patterns" items={insights.patterns} tone="warm" />
            <InsightList title="Breakthroughs" items={insights.breakthroughs} tone="calm" />
            {insights.reflection_prompt && (
              <div className="md:col-span-3 rounded-xl border border-primary/30 bg-primary/5 p-3">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-primary/80">A prompt for you</div>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <p className="font-display text-base leading-snug">{insights.reflection_prompt}</p>
                  <Button size="sm" variant="ghost" onClick={() => onUsePrompt?.(insights.reflection_prompt!)}>
                    Write on this
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {!insights && state.journal.length === 0 && (
          <p className="mt-3 text-sm text-muted-foreground">
            Write a few entries and I'll surface themes, patterns, and small wins here.
          </p>
        )}
      </div>
    </div>
  );
}

function InsightList({ title, items, tone }: { title: string; items: string[]; tone: "sage" | "warm" | "calm" }) {
  const toneClass =
    tone === "sage" ? "border-emerald-500/20 bg-emerald-500/5"
    : tone === "warm" ? "border-amber-500/20 bg-amber-500/5"
    : "border-sky-500/20 bg-sky-500/5";
  return (
    <div className={cn("rounded-xl border p-3", toneClass)}>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</div>
      {items.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">Nothing surfaced yet.</p>
      ) : (
        <ul className="mt-2 space-y-1.5 text-sm leading-snug">
          {items.map((it, i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-foreground/40" />
              <span>{it}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}