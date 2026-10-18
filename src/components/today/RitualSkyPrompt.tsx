import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { NotebookPen, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getCardById } from "@/lib/astro-suite/tarot";
import { MOON_RITUALS, getMoonPhase } from "@/lib/astro-suite/lunar";
import { appendToTodaysNote, drawCards, recordPull, todaysDailyPull, type TarotPull } from "@/lib/astro-suite/tarot-pulls";

/** Today's tarot card + moon prompt, woven into Morning Reset / Evening Reflection. */
export function RitualSkyPrompt({ kind, iso }: { kind: "morning" | "evening"; iso: string }) {
  const [pull, setPull] = useState<TarotPull | undefined>(() => todaysDailyPull());
  useEffect(() => {
    const on = () => setPull(todaysDailyPull());
    window.addEventListener("careflow:tarot-pulls", on);
    return () => window.removeEventListener("careflow:tarot-pulls", on);
  }, []);
  if (iso !== format(new Date(), "yyyy-MM-dd")) return null;

  const moon = MOON_RITUALS[getMoonPhase()];
  const pc = pull?.cards[0];
  const card = pc ? getCardById(pc.id) : undefined;
  const rev = pc?.orientation === "reversed";
  const prompt = kind === "morning"
    ? `${moon.glyph} ${moon.label} intention — ${moon.tarotPrompt}`
    : `${moon.glyph} Evening with the ${moon.label} — ${card ? `How did "${card.name}" show up today?` : moon.tarotPrompt}`;

  const journal = async () => {
    try {
      const cardLine = card ? `\n\n🔮 ${card.name}${rev ? " (reversed)" : ""} — ${rev ? card.reversed : card.upright}` : "";
      await appendToTodaysNote(`${prompt}${cardLine}\n\n`);
      toast.success("Added to today's note");
    } catch { toast.error("Couldn't add to today's note"); }
  };

  return (
    <div className="mt-2 space-y-2 rounded-xl bg-accent/10 p-3 text-[13px]" aria-label="Today's sky prompt">
      <div className="flex items-start gap-2">
        <span className="text-lg leading-none" aria-hidden>{card ? card.glyph : "🔮"}</span>
        <div className="min-w-0 flex-1">
          {card ? (
            <p><span className="font-medium">{card.name}{rev && " (reversed)"}:</span> {rev ? card.reversed : card.upright}</p>
          ) : (
            <p className="text-muted-foreground">No card pulled yet today.</p>
          )}
          <p className="mt-1 text-foreground/80">{kind === "morning" ? `“${moon.affirmation}”` : prompt.split(" — ")[1]}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {!card && (
          <Button size="sm" variant="outline" className="h-8 rounded-full" onClick={() => setPull(recordPull("single", drawCards(1)))}>
            <Sparkles className="mr-1 h-3.5 w-3.5" />Pull today's card
          </Button>
        )}
        <Button size="sm" variant="outline" className="h-8 rounded-full" onClick={journal}><NotebookPen className="mr-1 h-3.5 w-3.5" />Journal this</Button>
        <Button asChild size="sm" variant="ghost" className="h-8 rounded-full"><Link to="/cosmic-flow/moon">{moon.label}</Link></Button>
      </div>
    </div>
  );
}
