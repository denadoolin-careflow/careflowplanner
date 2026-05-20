import { useState } from "react";
import { format } from "date-fns";
import { Sparkles, Heart, BookHeart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MoonGlyph } from "@/components/widgets/MoonGlyph";
import { useMoonDataVersion } from "@/lib/moon-providers";
import { getRhythmForecast, ELEMENT_META } from "@/lib/rhythm-forecast";
import { tarotForDate } from "@/lib/tarot";
import { TarotCard } from "./TarotCard";
import { PlanWithEnergyDialog } from "@/components/rhythm/PlanWithEnergyDialog";
import { useStore } from "@/lib/store";
import { toast } from "sonner";

const ELEMENT_TINT: Record<"fire" | "earth" | "air" | "water", { ring: string; glow1: string; glow2: string; chip: string; chipText: string }> = {
  fire:  { ring: "hsl(20 80% 55% / 0.30)",  glow1: "hsl(20 90% 60% / 0.20)",  glow2: "hsl(35 95% 60% / 0.14)",  chip: "hsl(20 80% 55% / 0.18)",  chipText: "hsl(15 70% 30%)" },
  earth: { ring: "hsl(140 45% 40% / 0.28)", glow1: "hsl(140 55% 45% / 0.18)", glow2: "hsl(95 50% 55% / 0.14)",  chip: "hsl(140 45% 45% / 0.18)", chipText: "hsl(140 50% 22%)" },
  air:   { ring: "hsl(48 90% 55% / 0.32)",  glow1: "hsl(48 95% 60% / 0.20)",  glow2: "hsl(40 90% 65% / 0.14)",  chip: "hsl(48 90% 55% / 0.22)",  chipText: "hsl(38 70% 28%)" },
  water: { ring: "hsl(210 75% 55% / 0.28)", glow1: "hsl(210 80% 60% / 0.20)", glow2: "hsl(195 70% 65% / 0.14)", chip: "hsl(210 75% 55% / 0.20)", chipText: "hsl(215 60% 28%)" },
};

interface Props { date: Date; }

export function RhythmGuidanceCard({ date }: Props) {
  useMoonDataVersion();
  const f = getRhythmForecast(date);
  const card = tarotForDate(date);
  const tint = ELEMENT_TINT[f.element];
  const elemMeta = ELEMENT_META[f.element];
  const [planOpen, setPlanOpen] = useState(false);
  const { addJournal } = useStore();

  const saveAffirmationToJournal = async () => {
    try {
      await addJournal({
        date: format(date, "yyyy-MM-dd"),
        type: "daily",
        title: `Affirmation — ${f.phaseLabel}`,
        body: `“${f.guidance.suggestion}”\n\nMoon in ${f.sign.sign} · ${elemMeta.label}`,
        tags: ["affirmation", "rhythm"],
      });
      toast.success("Saved to your journal.");
    } catch {
      toast.error("Couldn't save right now.");
    }
  };

  return (
    <section
      aria-label="Today's energy"
      className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card/95 via-card/80 to-card/95 p-5 shadow-[var(--shadow-soft)] transition-shadow hover:shadow-[var(--shadow-cozy)]"
      style={{ boxShadow: `0 0 0 1px ${tint.ring}, 0 8px 28px -14px ${tint.glow1}` }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-70"
        style={{ background: `radial-gradient(ellipse at top right, ${tint.glow1}, transparent 65%), radial-gradient(ellipse at bottom left, ${tint.glow2}, transparent 70%)` }}
      />

      {/* Moon / sign / element header */}
      <header className="flex items-start gap-3">
        <div className="relative shrink-0">
          <span
            aria-hidden
            className="absolute inset-[-8px] rounded-full blur-md"
            style={{ background: `radial-gradient(circle, ${tint.glow1}, transparent 70%)` }}
          />
          <MoonGlyph date={date} size={56} className="relative" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Today's Energy</p>
            <span
              className="rounded-full px-1.5 py-px text-[9px] font-medium uppercase tracking-wider"
              style={{ background: tint.chip, color: tint.chipText }}
              title={`Moon in ${f.sign.sign} — ${f.element} element`}
            >
              {elemMeta.label}
            </span>
          </div>
          <p className="font-display text-lg leading-tight">
            {f.phaseLabel} <span className="text-muted-foreground">·</span> Moon in {f.sign.glyph} {f.sign.sign}
          </p>
          <p className="text-[11.5px] text-muted-foreground tabular-nums">
            {f.illumination}% lit · {elemMeta.recommendation}
          </p>
        </div>
      </header>

      {/* Focus chips */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Focus</span>
        {elemMeta.focusAreas.map(area => (
          <span key={area} className="rounded-full bg-muted/60 px-2.5 py-1 text-[11px] capitalize text-foreground/80">{area}</span>
        ))}
      </div>

      {/* Affirmation — tap to save */}
      <button
        type="button"
        onClick={saveAffirmationToJournal}
        title="Tap to save to your journal"
        className={cn(
          "mt-3 w-full rounded-xl border border-border/50 bg-card/70 p-3 text-left transition-all",
          "hover:bg-card hover:shadow-[var(--shadow-soft)]",
        )}
      >
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          <Heart className="h-3 w-3" /> Affirmation
          <span className="ml-auto inline-flex items-center gap-1 text-muted-foreground/70">
            <BookHeart className="h-3 w-3" /> save
          </span>
        </div>
        <p className="mt-1 font-display text-base italic leading-snug text-foreground/90">
          “{f.guidance.suggestion}”
        </p>
      </button>

      {/* Tarot */}
      <div className="mt-3">
        <TarotCard card={card} />
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-border/50 pt-3">
        <p className="text-[11.5px] italic text-muted-foreground">{f.guidance.caregiverNote}</p>
        <Button
          size="sm"
          className="h-8 shrink-0 rounded-full px-3 text-xs"
          onClick={() => setPlanOpen(true)}
        >
          <Sparkles className="mr-1 h-3.5 w-3.5" /> Plan with this energy
        </Button>
      </div>

      <PlanWithEnergyDialog open={planOpen} onOpenChange={setPlanOpen} date={date} forecast={f} />
    </section>
  );
}