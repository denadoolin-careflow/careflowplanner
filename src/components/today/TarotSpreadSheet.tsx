import { useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MAJOR_ARCANA, type TarotCard } from "@/lib/tarot";
import { format } from "date-fns";

interface Spread {
  id: string;
  name: string;
  positions: string[];
}

const SPREADS: Spread[] = [
  { id: "ppf", name: "Past · Present · Future", positions: ["Past", "Present", "Future"] },
  { id: "mbs", name: "Mind · Body · Spirit", positions: ["Mind", "Body", "Spirit"] },
  { id: "day", name: "Morning · Afternoon · Evening", positions: ["Morning", "Afternoon", "Evening"] },
];

/** Deterministic per-date+spread pick, no repeats inside a spread. */
function pickSpread(date: Date, spread: Spread): TarotCard[] {
  const seed = (date.getFullYear() * 372 + (date.getMonth() + 1) * 31 + date.getDate()) * 131
    + spread.id.charCodeAt(0);
  const out: TarotCard[] = [];
  const used = new Set<number>();
  let i = 0;
  while (out.length < spread.positions.length && i < 100) {
    const idx = (seed + i * 17) % MAJOR_ARCANA.length;
    if (!used.has(idx)) {
      used.add(idx);
      out.push(MAJOR_ARCANA[idx]);
    }
    i++;
  }
  return out;
}

export function TarotSpreadSheet({
  open, onOpenChange, date,
}: { open: boolean; onOpenChange: (o: boolean) => void; date: Date }) {
  const drawn = useMemo(() => SPREADS.map(s => ({ spread: s, cards: pickSpread(date, s) })), [date]);
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[88vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader className="text-left">
          <SheetTitle className="font-display text-xl">
            Tarot spreads · {format(date, "EEE, MMM d")}
          </SheetTitle>
        </SheetHeader>
        <p className="mt-1 text-[12px] text-muted-foreground">
          Three small spreads, drawn the same way each visit today. Choose the one your gut likes.
        </p>
        <div className="mt-4 space-y-5">
          {drawn.map(({ spread, cards }) => (
            <section key={spread.id} className="rounded-2xl border border-border/60 bg-card/70 p-3">
              <h3 className="font-display text-base">{spread.name}</h3>
              <ul className="mt-3 grid gap-2 sm:grid-cols-3">
                {cards.map((c, i) => (
                  <li key={c.name} className="rounded-xl border border-border/50 bg-gradient-to-br from-card via-accent-soft/30 to-primary-soft/20 p-3">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                      {spread.positions[i]}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-2xl" aria-hidden>{c.glyph}</span>
                      <span className="font-display text-sm leading-tight">{c.name}</span>
                    </div>
                    <p className="mt-1.5 text-[12px] text-foreground/80">{c.meaning}</p>
                    <p className="mt-1 text-[11.5px] italic text-foreground/65">{c.guidance}</p>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}