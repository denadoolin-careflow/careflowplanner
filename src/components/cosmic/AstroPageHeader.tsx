import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MOON_INFO, getMoonPhase } from "@/lib/moon";

export function AstroPageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const moon = MOON_INFO[getMoonPhase(new Date())];
  return (
    <header className="cosmic-sky-band flex items-center gap-2 rounded-2xl border border-border p-3 shadow-sm motion-safe:animate-fade-in">
      <Button asChild variant="ghost" size="icon" className="relative z-10 h-11 w-11 shrink-0"><Link to="/cosmic-flow" aria-label="Back to Cosmic Flow"><ArrowLeft className="h-4 w-4" /></Link></Button>
      <div className="relative z-10 min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Cosmic Flow</p>
        <h1 className="font-display text-2xl leading-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      <span className="relative z-10 shrink-0 text-center text-xs text-muted-foreground" title={moon.label}>
        <span className="block text-2xl leading-none">{moon.glyph}</span>{moon.label}
      </span>
    </header>
  );
}

export function NeedsChart() {
  return (
    <div className="cozy-card p-5 text-sm">
      <p className="font-medium">Add your birth details to use this view.</p>
      <Button asChild size="sm" className="mt-3"><Link to="/cosmic-flow/birth-chart">Add birth chart</Link></Button>
    </div>
  );
}
