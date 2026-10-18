import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Shuffle, NotebookPen, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { TarotCardArt } from "@/components/astro-suite/TarotCardArt";
import { DailyTarotPull } from "@/components/astro-suite/DailyTarotPull";
import { TAROT_DECK, getCardById, type TarotCard } from "@/lib/astro-suite/tarot";
import { getTarotAstro, birthChartLinkFor } from "@/lib/astro-suite/tarot-astro";
import { SPREADS, appendToTodaysNote, deletePull, drawCards, loadPulls, pullToText, recordPull, type SpreadKind, type TarotPull } from "@/lib/astro-suite/tarot-pulls";

const FILTERS = ["All", "Major", "Wands", "Cups", "Swords", "Pentacles"] as const;
type Filter = typeof FILTERS[number];

export default function CosmicTarot() {
  const [filter, setFilter] = useState<Filter>("All");
  const [spread, setSpread] = useState<SpreadKind>("three-time");
  const [current, setCurrent] = useState<TarotPull | null>(null);
  const [history, setHistory] = useState<TarotPull[]>(() => loadPulls());
  const [detail, setDetail] = useState<TarotCard | null>(null);

  useEffect(() => {
    const on = () => setHistory(loadPulls());
    window.addEventListener("careflow:tarot-pulls", on);
    return () => window.removeEventListener("careflow:tarot-pulls", on);
  }, []);

  const deck = useMemo(() => TAROT_DECK.filter(c =>
    filter === "All" ? true : filter === "Major" ? c.arcana === "Major" : c.suit === filter), [filter]);

  const doSpread = () => setCurrent(recordPull(spread, drawCards(SPREADS[spread].positions.length)));
  const send = async (p: TarotPull) => {
    try { await appendToTodaysNote(pullToText(p)); toast.success("Added to today's note"); }
    catch { toast.error("Couldn't add to today's note"); }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <header className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon"><Link to="/cosmic-flow" aria-label="Back to Cosmic Flow"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <div>
          <h1 className="font-display text-2xl text-foreground">Tarot</h1>
          <p className="text-sm text-muted-foreground">A reflective deck of 78 cards — for gentle self-inquiry, not prediction.</p>
        </div>
      </header>

      <DailyTarotPull />

      <section className="rounded-2xl border border-border bg-card p-4 shadow-soft space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg">Spreads</h2>
          <Button size="sm" onClick={doSpread}><Shuffle className="mr-1 h-3.5 w-3.5" />Shuffle & draw</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(SPREADS) as SpreadKind[]).filter(k => k !== "single").map(k => (
            <button key={k} onClick={() => setSpread(k)} className={cn("rounded-full border px-3 py-1.5 text-sm min-h-9",
              spread === k ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-muted")}>{SPREADS[k].label}</button>
          ))}
        </div>
        {current && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              {current.cards.map(pc => {
                const card = getCardById(pc.id)!;
                const rev = pc.orientation === "reversed";
                return (
                  <button key={pc.id} onClick={() => setDetail(card)} className="text-left space-y-1.5">
                    <p className="text-center text-xs uppercase tracking-[0.18em] text-muted-foreground">{pc.position}</p>
                    <TarotCardArt card={card} size="md" reversed={rev} />
                    <p className="text-xs text-foreground/85">{rev ? card.reversed : card.upright}</p>
                  </button>
                );
              })}
            </div>
            <Button size="sm" variant="outline" onClick={() => send(current)}><NotebookPen className="mr-1 h-3.5 w-3.5" />Send to today's note</Button>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg">The deck</h2>
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map(f => (
              <button key={f} onClick={() => setFilter(f)} className={cn("rounded-full px-3 py-1 text-xs min-h-8 border",
                filter === f ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted")}>{f}</button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {deck.map(c => <button key={c.id} onClick={() => setDetail(c)} aria-label={c.name}><TarotCardArt card={c} size="sm" /></button>)}
        </div>
      </section>

      {history.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <h2 className="mb-2 font-display text-lg">Past pulls</h2>
          <ul className="divide-y divide-border">
            {history.slice(0, 20).map(p => (
              <li key={p.id} className="flex items-start gap-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">{format(new Date(p.createdAt), "EEE, MMM d · h:mm a")} · {SPREADS[p.spread].label}</p>
                  <p className="text-sm">{p.cards.map(c => `${getCardById(c.id)?.name ?? ""}${c.orientation === "reversed" ? " (rev)" : ""}`).join(" · ")}</p>
                </div>
                <Button size="icon" variant="ghost" aria-label="Send to today's note" onClick={() => send(p)}><NotebookPen className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" aria-label="Delete pull" onClick={() => deletePull(p.id)}><Trash2 className="h-4 w-4" /></Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Sheet open={!!detail} onOpenChange={o => !o && setDetail(null)}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
          {detail && (() => {
            const astro = getTarotAstro(detail);
            return (
              <>
                <SheetHeader><SheetTitle className="font-display">{detail.name}</SheetTitle></SheetHeader>
                <div className="mt-3 flex gap-4">
                  <div className="w-32 shrink-0"><TarotCardArt card={detail} size="md" /></div>
                  <div className="space-y-3 text-sm">
                    <div><p className="text-xs uppercase tracking-wider text-muted-foreground">Upright</p><p>{detail.upright}</p></div>
                    <div><p className="text-xs uppercase tracking-wider text-muted-foreground">Reversed</p><p>{detail.reversed}</p></div>
                    <div className="flex flex-wrap gap-1">{detail.keywords.map(k => <span key={k} className="rounded-full bg-secondary px-2 py-0.5 text-xs">{k}</span>)}</div>
                    {astro && <Link to={birthChartLinkFor(astro)} className="inline-block text-primary hover:underline">✦ Linked to {astro.label} — read in Almanac</Link>}
                  </div>
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
}
