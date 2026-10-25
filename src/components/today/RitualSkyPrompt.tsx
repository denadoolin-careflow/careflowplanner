import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { NotebookPen, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getCardById } from "@/lib/astro-suite/tarot";
import { MOON_RITUALS, getMoonPhase } from "@/lib/astro-suite/lunar";
import { appendToTodaysNote, drawCards, recordPull, todaysDailyPull, loadPulls, eveningPullFor, eveningCardChoices, type TarotPull } from "@/lib/astro-suite/tarot-pulls";

/** Today's tarot card + moon prompt, woven into Morning Reset / Evening Reflection. */
export function RitualSkyPrompt({ kind, iso }: { kind: "morning" | "evening"; iso: string }) {
  const readPull = () => kind === "evening" ? eveningPullFor(loadPulls(), iso) : todaysDailyPull();
  const [pull, setPull] = useState<TarotPull | undefined>(readPull);
  const [choosing, setChoosing] = useState(false);
  const [search, setSearch] = useState("");
  useEffect(() => {
    const on = () => setPull(readPull());
    on();
    window.addEventListener("careflow:tarot-pulls", on);
    return () => window.removeEventListener("careflow:tarot-pulls", on);
  }, [kind, iso]);
  if (iso !== format(new Date(), "yyyy-MM-dd")) return null;

  const moon = MOON_RITUALS[getMoonPhase()];
  const morningCardId = todaysDailyPull()?.cards[0]?.id;
  const choices = eveningCardChoices(morningCardId);
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
            <p className="text-muted-foreground">{kind === "evening" ? "Choose a card for your evening reflection." : "No card pulled yet today."}</p>
          )}
          <p className="mt-1 text-foreground/80">{kind === "morning" ? `“${moon.affirmation}”` : prompt.split(" — ")[1]}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {kind === "evening" && <Button size="sm" variant="outline" className="min-h-11 h-auto whitespace-normal rounded-full" onClick={() => { setSearch(""); setChoosing(true); }}><Sparkles className="mr-1 h-3.5 w-3.5" />{card ? "Change evening card" : "Choose evening card"}</Button>}
        {!card && kind === "morning" && (
          <Button size="sm" variant="outline" className="h-8 rounded-full" onClick={() => setPull(recordPull("single", drawCards(1)))}>
            <Sparkles className="mr-1 h-3.5 w-3.5" />Pull today's card
          </Button>
        )}
        <Button size="sm" variant="outline" className="h-8 rounded-full" onClick={journal}><NotebookPen className="mr-1 h-3.5 w-3.5" />Journal this</Button>
        <Button asChild size="sm" variant="ghost" className="h-8 rounded-full"><Link to="/cosmic-flow/moon">{moon.label}</Link></Button>
      </div>
      <Dialog open={choosing} onOpenChange={setChoosing}>
        <DialogContent className="max-h-[85dvh] overflow-hidden">
          <DialogHeader><DialogTitle>Evening tarot card</DialogTitle></DialogHeader>
          <Input aria-label="Search tarot cards" placeholder="Search cards…" value={search} onChange={e => setSearch(e.target.value)} />
          <div className="max-h-[50dvh] space-y-1 overflow-y-auto">
            {choices.filter(c => c.name.toLowerCase().includes(search.toLowerCase())).map(c => (
              <Button key={c.id} variant="ghost" className="min-h-11 h-auto w-full justify-start whitespace-normal text-left" onClick={() => {
                setPull(recordPull("single", [{ card: c, orientation: "upright" }], "evening"));
                setChoosing(false);
              }}><span className="mr-2" aria-hidden>{c.glyph}</span>{c.name}</Button>
            ))}
            {!choices.some(c => c.name.toLowerCase().includes(search.toLowerCase())) && <p className="p-3 text-sm text-muted-foreground">No matching cards.</p>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
