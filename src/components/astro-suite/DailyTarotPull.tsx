import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, NotebookPen, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { TarotCardArt } from "./TarotCardArt";
import { getCardById } from "@/lib/astro-suite/tarot";
import { getTarotAstro, birthChartLinkFor } from "@/lib/astro-suite/tarot-astro";
import { appendToTodaysNote, drawCards, pullToText, recordPull, todaysDailyPull, type TarotPull } from "@/lib/astro-suite/tarot-pulls";

/** One tactile card pull per day; stays steady until tomorrow. */
export function DailyTarotPull({ compact }: { compact?: boolean }) {
  const [pull, setPull] = useState<TarotPull | undefined>(() => todaysDailyPull());
  const [flipping, setFlipping] = useState(false);

  useEffect(() => {
    const on = () => setPull(todaysDailyPull());
    window.addEventListener("careflow:tarot-pulls", on);
    return () => window.removeEventListener("careflow:tarot-pulls", on);
  }, []);

  const draw = () => {
    setFlipping(true);
    setTimeout(() => { setPull(recordPull("single", drawCards(1))); setFlipping(false); }, 650);
  };

  const pc = pull?.cards[0];
  const card = pc ? getCardById(pc.id) : undefined;
  const reversed = pc?.orientation === "reversed";
  const astro = card ? getTarotAstro(card) : null;

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-lg text-foreground">Today's card</h2>
        <Link to="/cosmic-flow/tarot" className="text-xs text-primary hover:underline inline-flex items-center gap-1">Tarot <ArrowRight className="h-3 w-3" /></Link>
      </div>
      <div className="flex gap-4">
        <div className={compact ? "w-24 shrink-0" : "w-32 shrink-0"} style={{ perspective: 800 }}>
          <div className="transition-transform duration-500" style={{ transformStyle: "preserve-3d", transform: flipping ? "rotateY(90deg)" : "none" }}>
            {card ? <TarotCardArt card={card} size="md" reversed={reversed} /> : (
              <button onClick={draw} aria-label="Pull today's card" className="block w-full aspect-[3/5] rounded-xl border border-border bg-gradient-to-br from-primary/80 to-accent/70 shadow-soft hover:scale-[1.02] transition-transform">
                <Sparkles className="mx-auto h-6 w-6 text-primary-foreground" />
              </button>
            )}
          </div>
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          {card ? (
            <>
              <p className="font-display text-base text-foreground">{card.name}{reversed && <span className="ml-1 text-xs text-muted-foreground">(reversed)</span>}</p>
              <p className="text-sm text-foreground/85">{reversed ? card.reversed : card.upright}</p>
              <div className="flex flex-wrap gap-1">
                {card.keywords.map(k => <span key={k} className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-secondary-foreground">{k}</span>)}
                {astro && <Link to={birthChartLinkFor(astro)} className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] text-foreground hover:bg-accent/25">✦ {astro.label}</Link>}
              </div>
              <Button size="sm" variant="outline" onClick={async () => {
                try { await appendToTodaysNote(pullToText(pull!)); toast.success("Added to today's note"); }
                catch { toast.error("Couldn't add to today's note"); }
              }}><NotebookPen className="mr-1 h-3.5 w-3.5" />Send to today's note</Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">Take a breath, hold a question for today, then tap the deck to pull your card.</p>
              <Button size="sm" onClick={draw} disabled={flipping}><Sparkles className="mr-1 h-3.5 w-3.5" />Pull a card</Button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
