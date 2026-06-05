import { useMemo } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Plus, BookHeart, ChevronRight } from "lucide-react";
import { cachedSnapshot } from "@/lib/cosmic/event-meta";
import { ELEMENT_VAR, type Element } from "@/lib/cosmic/glyphs";
import { useStore } from "@/lib/store";
import { toast } from "sonner";

function elementStyle(el: Element | null): React.CSSProperties {
  if (!el) return {};
  const v = ELEMENT_VAR[el];
  return {
    background: `linear-gradient(135deg, hsl(var(${v}) / 0.22), hsl(var(--card)))`,
    borderColor: `hsl(var(${v}) / 0.35)`,
  };
}

function WeatherDial({ score }: { score: number }) {
  const pct = (score / 10) * 100;
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-14 w-14 shrink-0 rounded-full bg-muted/40">
        <div
          className="absolute inset-0 rounded-full"
          style={{ background: `conic-gradient(hsl(var(--primary)) ${pct}%, hsl(var(--muted)) 0)` }}
        />
        <div className="absolute inset-1.5 flex items-center justify-center rounded-full bg-card font-display text-lg">
          {score}
        </div>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Cosmic weather</p>
        <p className="text-sm font-medium">
          {score >= 8 ? "Spacious & supportive" : score >= 6 ? "Workable & warm" : score >= 4 ? "A bit choppy" : "Tender — go slow"}
        </p>
      </div>
    </div>
  );
}

export function CosmicDaySheet({
  open, onOpenChange, date,
}: { open: boolean; onOpenChange: (v: boolean) => void; date: Date | null }) {
  const snap = useMemo(() => date ? cachedSnapshot(date) : null, [date]);
  const { addTask } = useStore() as any;

  if (!snap) return null;

  function addBestForTask(text: string) {
    addTask?.({ title: text, cosmic_tag: `day-${format(snap!.date, "yyyy-MM-dd")}` });
    toast.success("Added to CareFlow");
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 font-display">
            <Sparkles className="h-4 w-4 text-primary" />
            {format(snap.date, "EEEE, MMM d")}
          </SheetTitle>
        </SheetHeader>

        {/* Cosmic snapshot card */}
        <section
          className="mt-4 rounded-xl border p-4"
          style={elementStyle(snap.dominantElement)}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Cosmic snapshot</p>
              <p className="mt-1 font-display text-lg leading-tight">
                <span className="mr-1.5" aria-hidden>{snap.moonGlyph}</span>
                Moon in {snap.moonSign}
              </p>
              <p className="text-xs text-muted-foreground">
                {snap.dominantElement ? `${snap.dominantElement} energy dominates` : "A quiet sky"}
                {snap.hasRetro ? " · retrograde active" : ""}
                {snap.hasEclipse ? " · eclipse window" : ""}
              </p>
            </div>
            <WeatherDial score={snap.weatherScore} />
          </div>
        </section>

        {/* Best for / avoid */}
        <section className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-border/50 bg-card/60 p-3">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Best energy for</p>
            <ul className="mt-1.5 flex flex-wrap gap-1">
              {snap.bestFor.map(b => (
                <li key={b}>
                  <Badge variant="secondary" className="font-normal">{b}</Badge>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-border/50 bg-card/60 p-3">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Avoid</p>
            <ul className="mt-1.5 flex flex-wrap gap-1">
              {snap.avoid.map(b => (
                <li key={b}>
                  <Badge variant="outline" className="font-normal">{b}</Badge>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Events */}
        <section className="mt-3 rounded-lg border border-border/50 bg-card/60 p-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Cosmic events</p>
          {snap.events.length === 0 ? (
            <p className="mt-1 text-sm italic text-muted-foreground">A quiet sky — a fine day for steady ordinary things.</p>
          ) : (
            <ul className="mt-1.5 space-y-1.5">
              {snap.events.map(e => (
                <li key={e.id}>
                  <Link
                    to={`/cosmic-flow/event/${encodeURIComponent(e.id)}`}
                    className="flex items-center justify-between gap-2 rounded-md border border-border/40 bg-background/50 px-2.5 py-2 text-sm hover:bg-background"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span aria-hidden className="text-base">{e.glyph}</span>
                      <span className="truncate">{e.title}</span>
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Recommended CareFlow actions */}
        <section className="mt-3 rounded-lg border border-border/50 bg-card/60 p-3 pb-2">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Recommended CareFlow actions</p>
          <ul className="mt-1.5 space-y-1.5">
            {snap.bestFor.map(b => (
              <li key={b} className="flex items-center justify-between gap-2 text-sm">
                <span>{b}</span>
                <Button size="sm" variant="ghost" className="h-7 gap-1 px-2" onClick={() => addBestForTask(b)}>
                  <Plus className="h-3.5 w-3.5" /> Add
                </Button>
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-3 flex gap-2 pb-8">
          <Button asChild variant="outline" size="sm" className="flex-1">
            <Link to={`/journal?date=${format(snap.date, "yyyy-MM-dd")}`}>
              <BookHeart className="h-3.5 w-3.5 mr-1" />Journal
            </Link>
          </Button>
          <Button asChild size="sm" className="flex-1">
            <Link to={`/today?date=${format(snap.date, "yyyy-MM-dd")}`}>Open day</Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
