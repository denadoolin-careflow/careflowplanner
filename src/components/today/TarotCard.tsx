import { useState } from "react";
import { ChevronDown, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TarotCard as TarotCardType } from "@/lib/tarot";

export function TarotCard({ card }: { card: TarotCardType }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setOpen(o => !o)}
      aria-expanded={open}
      className={cn(
        "group relative w-full overflow-hidden rounded-2xl border border-border/60 p-4 text-left transition-all",
        "bg-gradient-to-br from-card via-accent-soft/40 to-primary-soft/30",
        "hover:shadow-[var(--shadow-cozy)] hover:-translate-y-0.5",
        open && "shadow-[var(--shadow-cozy)]",
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-50 blur-2xl"
        style={{ background: "hsl(var(--primary) / 0.25)" }}
      />
      <div className="relative flex items-start gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-card/80 text-2xl shadow-[var(--shadow-soft)]">
          {card.glyph}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            <Sparkles className="h-3 w-3" /> Card of the day
          </div>
          <p className="font-display text-base leading-tight">{card.name}</p>
          <p className="mt-0.5 text-[12.5px] text-foreground/80">{card.meaning}</p>
          <div
            className={cn(
              "grid overflow-hidden transition-[grid-template-rows] duration-300",
              open ? "grid-rows-[1fr] mt-2" : "grid-rows-[0fr]",
            )}
          >
            <div className="min-h-0">
              <p className="border-t border-border/60 pt-2 text-[12.5px] italic text-foreground/85">
                {card.guidance}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {card.keywords.map(k => (
                  <span key={k} className="rounded-full bg-muted/60 px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">{k}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </div>
    </button>
  );
}