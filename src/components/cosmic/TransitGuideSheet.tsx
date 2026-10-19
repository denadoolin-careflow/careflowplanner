import { useMemo, useState } from "react";
import { format } from "date-fns";
import { CalendarPlus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { OrbPeakChart } from "@/components/cosmic/OrbPeakChart";
import { TransitJournalInline } from "@/components/cosmic/TransitJournalInline";
import { TarotCardArt } from "@/components/astro-suite/TarotCardArt";
import { useIsMobile } from "@/hooks/use-mobile";
import { useStore } from "@/lib/store";
import { ASPECTS } from "@/lib/cosmic/astro/aspects";
import { describeTransit, timingLabel, ASPECT_TONE_HINT } from "@/lib/cosmic/plain-language";
import { MAJOR_ASPECTS, type TransitRow } from "@/lib/cosmic/sky";
import { HOUSE_AREA, journalPrompts, lengthLabel, orbLimitFor, practicalActions, transitWindow } from "@/lib/cosmic/transit-guide";
import { drawCards, recordPull } from "@/lib/astro-suite/tarot-pulls";
import { getTarotAstro } from "@/lib/astro-suite/tarot-astro";
import type { TarotCard, TarotOrientation } from "@/lib/astro-suite/tarot";

const POSITIONS = ["Situation", "Challenge", "Guidance"];

interface Props {
  row: TransitRow | null;
  natalLon: number | null;
  natalHouse: number | null;
  on: Date;
  onClose: () => void;
}

export function TransitGuideSheet({ row, natalLon, natalHouse, on, onClose }: Props) {
  const isMobile = useIsMobile();
  return (
    <Sheet open={!!row} onOpenChange={o => !o && onClose()}>
      <SheetContent side={isMobile ? "bottom" : "right"} className={isMobile ? "max-h-[90vh] overflow-y-auto rounded-t-2xl" : "w-full overflow-y-auto sm:max-w-lg"}>
        {row && natalLon != null && <Guide key={`${row.transit}-${row.aspect}-${row.natal}`} row={row} natalLon={natalLon} natalHouse={natalHouse} on={on} />}
      </SheetContent>
    </Sheet>
  );
}

function Guide({ row, natalLon, natalHouse, on }: { row: TransitRow; natalLon: number; natalHouse: number | null; on: Date }) {
  const { addTask } = useStore() as any;
  const d = describeTransit(row.transit, row.aspect, row.natal);
  const angle = MAJOR_ASPECTS.find(a => a.name === row.aspect)!.angle;
  const defOrb = ASPECTS.find(a => a.name === row.aspect)?.defaultOrb ?? 6;
  const win = useMemo(() => transitWindow(row.transit, natalLon, angle, on, orbLimitFor(row.transit, defOrb)), [row, natalLon, angle, on, defOrb]);
  const fmt = row.transit === "Moon" ? "MMM d, h a" : "MMM d, yyyy";
  const actions = practicalActions(row.transit, row.aspect, natalHouse);
  const prompts = journalPrompts(row.transit, row.natal, natalHouse);
  const [cards, setCards] = useState<{ card: TarotCard; orientation: TarotOrientation; position: string }[]>([]);

  const pull = (n: 1 | 3) => {
    const drawn = drawCards(n);
    recordPull(n === 1 ? "single" : "three-self", drawn);
    setCards(drawn.map((c, i) => ({ ...c, position: n === 1 ? "Message" : POSITIONS[i] })));
  };
  const toPlanner = async (title: string) => {
    await addTask?.({ title, dueDate: on.toLocaleDateString("en-CA"), cosmic_tag: "sky" });
    toast.success("Added to Planner");
  };
  const tarotLine = cards.length ? `\nTarot: ${cards.map(c => `${c.position} — ${c.card.name}${c.orientation === "reversed" ? " (reversed)" : ""}`).join("; ")}` : "";

  return (
    <div className="space-y-5 pb-6">
      <SheetHeader className="text-left">
        <SheetTitle className="font-display text-xl">{d.title}</SheetTitle>
        <SheetDescription className="flex flex-wrap gap-1.5">
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-foreground">{d.tone}</span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-foreground">{timingLabel(row.orb, row.applying)}</span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-foreground">{row.orb.toFixed(1)}° orb</span>
        </SheetDescription>
      </SheetHeader>

      <section className="cozy-card space-y-2 p-3">
        <h3 className="text-sm font-semibold">When it's active</h3>
        <dl className="grid grid-cols-3 gap-2 text-xs">
          <div><dt className="text-muted-foreground">Starts</dt><dd>{win.capped ? "Before " : ""}{format(win.start, fmt)}</dd></div>
          <div><dt className="text-muted-foreground">Exact</dt><dd>{row.exactDate ? format(row.exactDate, fmt) : "Passed"}</dd></div>
          <div><dt className="text-muted-foreground">Ends</dt><dd>{win.capped ? "After " : ""}{format(win.end, fmt)}</dd></div>
        </dl>
        <p className="text-sm">Lasts {lengthLabel(win.days)}{win.capped ? " or longer" : ""}.</p>
        <OrbPeakChart body={row.transit} natalLon={natalLon} angle={angle} from={on} days={row.transit === "Moon" ? 7 : 180} />
      </section>

      <section className="space-y-1">
        <h3 className="text-sm font-semibold">What it means</h3>
        <p className="text-sm">{d.meaning}</p>
        <p className="text-xs text-muted-foreground">{ASPECT_TONE_HINT[d.tone]}</p>
      </section>

      <section className="space-y-1">
        <h3 className="text-sm font-semibold">Where it shows up</h3>
        {natalHouse ? <p className="text-sm">Your {row.natal} lives in house {natalHouse}: {HOUSE_AREA[natalHouse]}.</p> : <p className="text-sm text-muted-foreground">Add your birth time to see which life area this touches.</p>}
        {row.house && <p className="text-sm">{row.transit} is passing through house {row.house}: {HOUSE_AREA[row.house]}.</p>}
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">How to work with it</h3>
        <ul className="space-y-1.5">
          {actions.map(a => (
            <li key={a} className="flex items-start justify-between gap-2 rounded-lg bg-muted/50 p-2 text-sm">
              <span>{a}</span>
              <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" aria-label="Add to Planner" onClick={() => toPlanner(a)}><CalendarPlus className="h-4 w-4" /></Button>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Tarot for this transit</h3>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => pull(1)}><Sparkles className="mr-1 h-4 w-4" />Pull a card</Button>
          <Button size="sm" variant="outline" onClick={() => pull(3)}>3-card spread</Button>
        </div>
        {cards.length > 0 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {cards.map(c => {
              const link = getTarotAstro(c.card);
              const match = link?.kind === "planet" && (link.planet === row.transit || link.planet === row.natal);
              return (
                <div key={c.card.id} className={`rounded-lg border p-2 text-center ${match ? "border-primary" : "border-border"}`}>
                  <p className="text-xs text-muted-foreground">{c.position}</p>
                  <div className="my-1 flex justify-center"><TarotCardArt card={c.card} size="sm" reversed={c.orientation === "reversed"} /></div>
                  <p className="text-sm font-medium">{c.card.name}{c.orientation === "reversed" ? " (reversed)" : ""}</p>
                  <p className="text-xs">{c.orientation === "reversed" ? c.card.reversed : c.card.upright}</p>
                  {match && <p className="mt-1 text-xs text-primary">Linked to {link!.label} — echoes this transit</p>}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Journal</h3>
        <ul className="list-disc space-y-0.5 pl-5 text-sm text-muted-foreground">{prompts.map(p => <li key={p}>{p}</li>)}</ul>
        <TransitJournalInline
          eventId={`grid:${row.transit}-${row.aspect}-${row.natal}:${format(win.start, "yyyy-MM-dd")}`}
          eventLabel={d.title}
          eventDate={on.toLocaleDateString("en-CA")}
          prompt={`${prompts[0]}${tarotLine}`}
        />
      </section>
    </div>
  );
}
