import { Link } from "react-router-dom";
import { Camera, Sun, Moon, Sparkles, Circle, Star } from "lucide-react";
import { computeProgressions } from "@/lib/cosmic/astro/progressions";
import { computeProfection } from "@/lib/cosmic/astro/profections";
import { nextSolarReturn, nextLunarReturn } from "@/lib/cosmic/astro/returns";
import { format } from "date-fns";
import type { NatalChartV2 } from "@/lib/cosmic/chart";

export function AdvancedAstrologyRow({ chart, today = new Date() }: { chart: NatalChartV2 | null; today?: Date }) {
  const tiles = (() => {
    if (!chart || !chart.houses) {
      return [
        { icon: <Camera className="h-3.5 w-3.5 text-primary" />,    title: "Profection Year",   sub: "Add birth time" },
        { icon: <Sun className="h-3.5 w-3.5 text-warm-foreground" />, title: "Solar Return",    sub: "Add birth time" },
        { icon: <Moon className="h-3.5 w-3.5 text-moon-foreground" />, title: "Progressed Moon", sub: "Add birth date" },
        { icon: <Sparkles className="h-3.5 w-3.5 text-primary" />,  title: "House Activations", sub: "Add birth time" },
        { icon: <Circle className="h-3.5 w-3.5 text-secondary-foreground" />, title: "Lunar Return", sub: "Add birth time" },
        { icon: <Star className="h-3.5 w-3.5 text-accent-foreground" />, title: "Ruler of the Year", sub: "Add birth time" },
      ];
    }
    const birthD = new Date(chart.birth.date);
    const prog = computeProgressions(birthD, today);
    const prof = computeProfection(birthD, chart.houses.ascendantSign, today);
    const solar = nextSolarReturn(birthD, today);
    const lunar = nextLunarReturn(birthD, today);
    return [
      { icon: <Camera className="h-3.5 w-3.5 text-primary" />,    title: "Profection Year",   sub: `Age ${prof.age} · Year of ${prof.profectedSign}` },
      { icon: <Sun className="h-3.5 w-3.5 text-warm-foreground" />, title: "Solar Return",    sub: solar ? `Next: ${format(solar, "MMM d, yyyy")}` : "—" },
      { icon: <Moon className="h-3.5 w-3.5 text-moon-foreground" />, title: "Progressed Moon", sub: `Currently in ${prog.progressedMoon.sign}` },
      { icon: <Sparkles className="h-3.5 w-3.5 text-primary" />,  title: "House Activations", sub: `${prof.house}th House Activated` },
      { icon: <Circle className="h-3.5 w-3.5 text-secondary-foreground" />, title: "Lunar Return", sub: lunar ? `Next: ${format(lunar, "MMM d, yyyy")}` : "—" },
      { icon: <Star className="h-3.5 w-3.5 text-accent-foreground" />, title: "Ruler of the Year", sub: `${prof.timeLord} (Discipline & Growth)` },
    ];
  })();

  return (
    <section className="cozy-card p-5" aria-label="Advanced astrology">
      <header className="mb-1">
        <h3 className="font-display text-base">Advanced Astrology</h3>
        <p className="text-[11.5px] text-muted-foreground">Dive deeper into your long-term cosmic blueprint.</p>
      </header>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {tiles.map(t => (
          <div key={t.title} className="rounded-lg border border-border/50 bg-card/60 p-2.5 text-center">
            <div className="mx-auto mb-1.5 flex h-7 w-7 items-center justify-center rounded-md bg-muted/60">{t.icon}</div>
            <p className="text-[11.5px] font-medium leading-tight">{t.title}</p>
            <p className="mt-0.5 text-[10.5px] text-muted-foreground leading-snug">{t.sub}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 text-center">
        <Link to="/cosmic-flow/predictive" className="text-xs text-primary hover:underline">View all advanced charts →</Link>
      </div>
    </section>
  );
}