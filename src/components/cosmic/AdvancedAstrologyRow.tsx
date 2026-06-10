import { Link } from "react-router-dom";
import { Camera, Sun, Moon, Sparkles, Circle, Star } from "lucide-react";
import { computeProgressions, progressedMoonNextIngress } from "@/lib/cosmic/astro/progressions";
import { computeProfection, houseTopics } from "@/lib/cosmic/astro/profections";
import { nextSolarReturn, nextLunarReturn, nextSaturnReturn, nextJupiterReturn } from "@/lib/cosmic/astro/returns";
import { format, differenceInCalendarDays } from "date-fns";
import type { NatalChartV2 } from "@/lib/cosmic/chart";

const TIME_LORD_FLAVOR: Record<string, string> = {
  Sun: "Vitality & purpose",
  Moon: "Care & inner tides",
  Mercury: "Voice & learning",
  Venus: "Love & values",
  Mars: "Drive & courage",
  Jupiter: "Expansion & faith",
  Saturn: "Discipline & structure",
};

function daysFromNow(d: Date | null, today: Date): string {
  if (!d) return "—";
  const n = differenceInCalendarDays(d, today);
  if (n <= 0) return format(d, "MMM d, yyyy");
  if (n < 35) return `In ${n} day${n === 1 ? "" : "s"}`;
  return format(d, "MMM d, yyyy");
}

export function AdvancedAstrologyRow({ chart, today = new Date() }: { chart: NatalChartV2 | null; today?: Date }) {
  const tiles = (() => {
    if (!chart || !chart.houses) {
      return [
        { href: "#profection",   icon: <Camera className="h-3.5 w-3.5 text-primary" />,             title: "Profection Year",   sub: "Add birth time", preview: "Reveals the house & ruler steering your year." },
        { href: "#solar-return", icon: <Sun className="h-3.5 w-3.5 text-warm-foreground" />,        title: "Solar Return",      sub: "Add birth time", preview: "Your yearly chart — themes for the next 12 months." },
        { href: "#progressions", icon: <Moon className="h-3.5 w-3.5 text-moon-foreground" />,       title: "Progressed Moon",   sub: "Add birth date", preview: "Tracks your emotional season (~2.5 yrs per sign)." },
        { href: "#profection",   icon: <Sparkles className="h-3.5 w-3.5 text-primary" />,           title: "House Activations", sub: "Add birth time", preview: "Which life area is being illuminated now." },
        { href: "#lunar-return", icon: <Circle className="h-3.5 w-3.5 text-secondary-foreground" />, title: "Lunar Return",      sub: "Add birth time", preview: "The mood and focus of your next ~28 days." },
        { href: "#time-lord",    icon: <Star className="h-3.5 w-3.5 text-accent-foreground" />,     title: "Time Lord",         sub: "Add birth time", preview: "The planet quietly steering the chapter." },
      ];
    }
    const birthD = new Date(chart.birth.date);
    const prog = computeProgressions(birthD, today);
    const progIng = progressedMoonNextIngress(birthD, today);
    const prof = computeProfection(birthD, chart.houses.ascendantSign, today);
    const solar = nextSolarReturn(birthD, today);
    const lunar = nextLunarReturn(birthD, today);
    const saturn = nextSaturnReturn(birthD, today);
    const jupiter = nextJupiterReturn(birthD, today);
    const houseTopic = houseTopics(prof.house);
    return [
      { href: "#profection", icon: <Camera className="h-3.5 w-3.5 text-primary" />,
        title: "Profection Year", sub: `Age ${prof.age} · ${prof.house}H ${prof.profectedSign}`,
        preview: `${houseTopic} · ruled by ${prof.timeLord}.` },
      { href: "#solar-return", icon: <Sun className="h-3.5 w-3.5 text-warm-foreground" />,
        title: "Solar Return", sub: daysFromNow(solar, today),
        preview: solar ? `Next chart resets ${format(solar, "MMM d, yyyy")}.` : "Sets the theme of your next year." },
      { href: "#progressions", icon: <Moon className="h-3.5 w-3.5 text-moon-foreground" />,
        title: "Progressed Moon", sub: `${prog.progressedMoon.sign} · ${prog.progressedMoon.lunarPhase}`,
        preview: `Inner season in ${prog.progressedMoon.sign} — ${prog.progressedMoon.lunarPhase.toLowerCase()} phase.` },
      { href: "#profection", icon: <Sparkles className="h-3.5 w-3.5 text-primary" />,
        title: "House Activations", sub: `${prof.house}H · ${houseTopic.split(",")[0]}`,
        preview: `Spotlight on: ${houseTopic}.` },
      { href: "#lunar-return", icon: <Circle className="h-3.5 w-3.5 text-secondary-foreground" />,
        title: "Lunar Return", sub: daysFromNow(lunar, today),
        preview: lunar ? `Next monthly reset ${format(lunar, "MMM d")}.` : "The mood of your next ~28 days." },
      { href: "#time-lord", icon: <Star className="h-3.5 w-3.5 text-accent-foreground" />,
        title: "Time Lord", sub: `${prof.timeLord} · ${TIME_LORD_FLAVOR[prof.timeLord] ?? ""}`,
        preview: `${prof.timeLord} steers this year's chapter.` },
      { href: "#progressions", icon: <Moon className="h-3.5 w-3.5 text-moon-foreground" />,
        title: "Prog. Moon Ingress", sub: `${progIng.sign} on ${format(new Date(progIng.date), "MMM yyyy")}`,
        preview: `Emotional shift into ${progIng.sign} approaches.` },
      { href: "#progressions", icon: <Sparkles className="h-3.5 w-3.5 text-primary" />,
        title: "Solar Arc", sub: `${prog.solarArc.toFixed(1)}° from natal Sun`,
        preview: `Slow life-direction arc — ${prog.solarArc.toFixed(1)}° advanced.` },
      { href: "#solar-return", icon: <Star className="h-3.5 w-3.5 text-accent-foreground" />,
        title: "Saturn Return", sub: saturn ? daysFromNow(saturn, today) : "—",
        preview: saturn ? `Maturity gateway near ${format(saturn, "MMM yyyy")}.` : "Major adulthood threshold." },
      { href: "#solar-return", icon: <Sun className="h-3.5 w-3.5 text-warm-foreground" />,
        title: "Jupiter Return", sub: jupiter ? daysFromNow(jupiter, today) : "—",
        preview: jupiter ? `Growth window near ${format(jupiter, "MMM yyyy")}.` : "12-year expansion cycle." },
    ];
  })();

  return (
    <section className="cozy-card p-5" aria-label="Advanced astrology">
      <header className="mb-1">
        <h3 className="font-display text-base">Advanced Astrology</h3>
        <p className="text-[11.5px] text-muted-foreground">Dive deeper into your long-term cosmic blueprint.</p>
      </header>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {tiles.map(t => (
          <Link
            key={t.title}
            to={`/cosmic-flow/predictive${t.href}`}
            className="rounded-lg border border-border/50 bg-card/60 p-2.5 text-center transition-colors hover:border-primary/40 hover:bg-primary/5"
          >
            <div className="mx-auto mb-1.5 flex h-7 w-7 items-center justify-center rounded-md bg-muted/60">{t.icon}</div>
            <p className="text-[11.5px] font-medium leading-tight">{t.title}</p>
            <p className="mt-0.5 text-[10.5px] text-muted-foreground leading-snug">{t.sub}</p>
            {("preview" in t) && (t as any).preview && (
              <p className="mt-1 text-[10px] leading-snug text-foreground/70 line-clamp-2">{(t as any).preview}</p>
            )}
          </Link>
        ))}
      </div>
      <div className="mt-3 text-center">
        <Link to="/cosmic-flow/predictive" className="text-xs text-primary hover:underline">View all advanced charts →</Link>
      </div>
    </section>
  );
}