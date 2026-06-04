import { MoonGlyph } from "@/components/widgets/MoonGlyph";
import { getMoonPhase, MOON_INFO, getIllumination, daysUntilFull, daysUntilNew } from "@/lib/moon";
import { getMoonSign, ELEMENT_EMOJI, SIGN_EMOJI } from "@/lib/zodiac";
import { Badge } from "@/components/ui/badge";

export function MoonCycleCard({ date = new Date() }: { date?: Date }) {
  const phase = getMoonPhase(date);
  const sign = getMoonSign(date);
  const info = MOON_INFO[phase];
  return (
    <section className="cozy-card flex flex-col gap-3 p-5" aria-label="Moon & Cycle">
      <header>
        <h3 className="font-display text-base">Moon &amp; Cycle</h3>
      </header>
      <div className="flex items-center gap-3">
        <MoonGlyph date={date} size={64} className="shrink-0" />
        <div className="min-w-0">
          <p className="font-medium">{info.label}</p>
          <p className="text-xs text-muted-foreground">{getIllumination(date)}% illuminated</p>
        </div>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <span aria-hidden>{SIGN_EMOJI[sign.name]}</span>
        <span className="font-medium">{sign.name}</span>
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground">{ELEMENT_EMOJI[sign.element]} {sign.element} Element</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-[12px] text-muted-foreground">
        <p>{daysUntilFull(date)}d to full</p>
        <p>{daysUntilNew(date)}d to new</p>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Suggested care</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {(phase === "full" ? ["Rest", "Reflect", "Hydrate"]
            : phase === "new" ? ["Quiet", "Journal", "One small wish"]
            : phase === "first-quarter" ? ["Decide", "Move", "Focus block"]
            : phase === "last-quarter" ? ["Clear", "Forgive", "Soft reset"]
            : ["Tend", "Notice", "Pace yourself"]).map(t => (
              <Badge key={t} variant="secondary" className="font-normal">{t}</Badge>
            ))}
        </div>
      </div>
    </section>
  );
}