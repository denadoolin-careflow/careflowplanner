import { useMemo } from "react";
import { Loader2, RefreshCw, Target, Heart, Home, Leaf, TrendingUp, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DailyGuidance } from "@/lib/cosmic/v2-hooks";
import { getMoonSign } from "@/lib/zodiac";

type Category = { key: string; label: string; tone: string; icon: React.ReactNode };
const CATS: Category[] = [
  { key: "focus",         label: "Focus",         tone: "from-primary/12 to-primary/4 border-primary/30",     icon: <Target className="h-3.5 w-3.5 text-primary" /> },
  { key: "relationships", label: "Relationships", tone: "from-accent/25 to-accent/5 border-accent/40",        icon: <Heart  className="h-3.5 w-3.5 text-accent-foreground" /> },
  { key: "home",          label: "Home",          tone: "from-moon/20 to-moon/5 border-moon/30",              icon: <Home   className="h-3.5 w-3.5 text-moon-foreground" /> },
  { key: "wellbeing",     label: "Wellbeing",     tone: "from-secondary/30 to-secondary/5 border-secondary/40", icon: <Leaf className="h-3.5 w-3.5 text-secondary-foreground" /> },
  { key: "growth",        label: "Growth",        tone: "from-warm/30 to-warm/5 border-warm/40",              icon: <TrendingUp className="h-3.5 w-3.5 text-warm-foreground" /> },
];

/** Local fallback copy keyed by moon sign + category so the grid is rich
 *  even before the AI guidance lands. */
function fallbackFor(sign: string, key: string): { body: string; action: string } {
  const base: Record<string, Record<string, { body: string; action: string }>> = {
    Aquarius: {
      focus: { body: "You're being asked to slow down and refine what you've already started. Depth over breadth wins now.", action: "Simplify your priorities." },
      relationships: { body: "Honest conversations bring you closer. Lead with clarity and kindness.", action: "Reach out with an open heart." },
      home: { body: "Your environment affects your energy more than usual. Create calm.", action: "Clear one small space today." },
      wellbeing: { body: "Nervous energy may build. Movement and breath will help you reset.", action: "Take a mindful walk or stretch." },
      growth: { body: "New ideas are sprouting—capture them. Something exciting is forming.", action: "Journal your next steps." },
    },
  };
  const def = {
    focus: { body: "Pick one meaningful thing and let the rest wait. Less is more today.", action: "Do one small task fully." },
    relationships: { body: "A soft word or quick check-in goes further than you think.", action: "Send one warm message." },
    home: { body: "Small order in your space supports your mind. Tend something small.", action: "Tidy a single surface." },
    wellbeing: { body: "Your body is asking for a kinder rhythm. Honor it without negotiation.", action: "Take a slow 10-minute pause." },
    growth: { body: "A quiet insight is gathering. Notice the thread you keep returning to.", action: "Write down one curiosity." },
  };
  return base[sign]?.[key] ?? def[key as keyof typeof def];
}

function categoryFromAction(s: string): string {
  const t = s.toLowerCase();
  if (/(call|family|friend|partner|message|reach|talk)/.test(t)) return "relationships";
  if (/(clean|tidy|home|declutter|kitchen|space|pantry)/.test(t)) return "home";
  if (/(walk|breath|rest|stretch|nap|hydrate|sleep|water)/.test(t)) return "wellbeing";
  if (/(journal|idea|reflect|study|learn|plan)/.test(t)) return "growth";
  return "focus";
}

export function PersonalGuidanceGrid({ data, loading, onRefresh, date = new Date() }: {
  data: DailyGuidance | null; loading: boolean; onRefresh: (force?: boolean) => void; date?: Date;
}) {
  const sign = getMoonSign(date).name;
  const tiles = useMemo(() => {
    // Map AI suggested_actions onto categories — fill the rest with fallback.
    const assigned: Record<string, { body: string; action: string }> = {};
    if (data) {
      const bodyChunks = (data.body || "").split(/\n+|\.\s+/).filter(Boolean);
      data.suggested_actions?.forEach((a, i) => {
        const cat = categoryFromAction(a);
        if (assigned[cat]) return;
        assigned[cat] = {
          body: bodyChunks[i] ? bodyChunks[i].replace(/\.$/, "") + "." : fallbackFor(sign, cat).body,
          action: a,
        };
      });
    }
    return CATS.map(c => ({ ...c, ...(assigned[c.key] ?? fallbackFor(sign, c.key)) }));
  }, [data, sign]);

  return (
    <section className="cozy-card p-5" aria-label="Personalized cosmic guidance">
      <header className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="font-display text-base flex items-center gap-1.5">
            Personalized Cosmic Guidance <Sparkles className="h-3.5 w-3.5 text-primary" />
          </h3>
          <p className="text-[11.5px] text-muted-foreground">Guidance based on your natal chart, current transits, and life themes.</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => onRefresh(true)} disabled={loading} className="h-7 gap-1 px-2 text-xs">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Refresh
        </Button>
      </header>

      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map(t => (
          <div key={t.key} className={`rounded-lg border bg-gradient-to-b p-3 ${t.tone}`}>
            <p className="mb-1.5 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              {t.icon}{t.label}
            </p>
            <p className="min-h-[64px] text-[11.5px] leading-snug">{t.body}</p>
            <p className="mt-2 border-t border-border/40 pt-1.5 text-[10.5px] text-muted-foreground">
              Action: <span className="text-foreground/80">{t.action}</span>
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}