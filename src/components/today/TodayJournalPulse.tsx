import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { format, parseISO, subDays, isSameDay } from "date-fns";
import { Flame, Sparkles, Loader2, Heart, ArrowRight } from "lucide-react";
import { useStore } from "@/lib/store";
import { aiInvoke } from "@/lib/ai-invoke";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

function pickPrompt(date: Date) {
  const seed = Number(format(date, "yyyyMMdd"));
  return REFLECTION_PROMPTS[seed % REFLECTION_PROMPTS.length];
}

type CachedInsights = {
  themes: string[];
  patterns: string[];
  breakthroughs: string[];
  cachedAt: string;
};

/**
 * Compact Today-screen card surfacing mood streak, 7-day mood dots,
 * one reflection prompt, and (cached) AI wins & themes.
 */
export function TodayJournalPulse() {
  const { state } = useStore();
  const navigate = useNavigate();
  const todayPrompt = useMemo(() => pickPrompt(new Date()), []);
  const todayKey = format(new Date(), "yyyy-MM-dd");

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

  const cacheKey = `careflow:journal:pulse:${todayKey}`;
  const [insights, setInsights] = useState<CachedInsights | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(cacheKey);
      return raw ? (JSON.parse(raw) as CachedInsights) : null;
    } catch { return null; }
  });
  const [loading, setLoading] = useState(false);

  // Auto-load once per day if we have enough entries.
  useEffect(() => {
    if (insights || loading) return;
    if (state.journal.length < 3) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const recent = state.journal.slice(-30).map((j) => ({
          date: j.date, text: String(j.body ?? "").slice(0, 400),
        }));
        const { data, error } = await aiInvoke("ai-cosmic-journal-insights", { body: { entries: recent } });
        if (error) throw error;
        if (cancelled) return;
        const fresh: CachedInsights = {
          themes: data?.themes ?? [],
          patterns: data?.patterns ?? [],
          breakthroughs: data?.breakthroughs ?? [],
          cachedAt: new Date().toISOString(),
        };
        setInsights(fresh);
        try { localStorage.setItem(cacheKey, JSON.stringify(fresh)); } catch {}
      } catch {
        /* silent — Today shouldn't shout about AI failures */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayKey]);

  const writeOnPrompt = () => {
    try {
      sessionStorage.setItem("careflow:journal:seed-prompt", todayPrompt);
    } catch {}
    navigate("/journal");
  };

  const topThemes = (insights?.themes ?? []).slice(0, 2);
  const topWins = (insights?.breakthroughs ?? []).slice(0, 1);

  return (
    <section
      aria-label="Journal pulse"
      className="cozy-card gradient-warm relative overflow-hidden p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/80">
            <Heart className="h-3 w-3" /> Journal pulse
          </div>
          <p className="mt-2 font-display text-lg leading-snug">{todayPrompt}</p>
        </div>
        <Link
          to="/journal"
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border/50 bg-background/70 px-2.5 py-1 text-[11px] text-muted-foreground hover:text-foreground"
        >
          Open journal <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={writeOnPrompt}>Write on this</Button>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-background/60 px-3 py-1.5 text-xs">
          <Flame className="h-3.5 w-3.5 text-primary" />
          <span className="font-medium">{streak}</span>
          <span className="text-muted-foreground">day streak</span>
        </span>
      </div>

      {/* 7-day mood dots */}
      <div className="mt-4 grid grid-cols-7 gap-1">
        {last7.map(({ d, dStr, count, mood }) => (
          <div
            key={dStr}
            title={`${format(d, "EEE MMM d")} — ${count} entr${count === 1 ? "y" : "ies"}`}
            className={cn(
              "flex h-9 items-end justify-center rounded-md border border-border/40 bg-background/60 text-base leading-none",
              isSameDay(d, new Date()) && "ring-1 ring-primary",
            )}
          >
            <span className="pb-1">{mood ?? (count > 0 ? "·" : "")}</span>
          </div>
        ))}
      </div>

      {/* Wins & themes (cached daily) */}
      {(topThemes.length > 0 || topWins.length > 0) && (
        <div className="mt-4 rounded-xl border border-border/40 bg-background/50 p-3">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            <Sparkles className="h-3 w-3" /> Wins &amp; themes
          </div>
          <ul className="mt-1.5 space-y-1 text-sm">
            {topWins.map((w, i) => (
              <li key={`w${i}`} className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-500/70" />
                <span>{w}</span>
              </li>
            ))}
            {topThemes.map((t, i) => (
              <li key={`t${i}`} className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-foreground/40" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {loading && !insights && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Reflecting on your entries…
        </p>
      )}
    </section>
  );
}