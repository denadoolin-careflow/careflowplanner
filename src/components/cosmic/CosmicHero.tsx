import { useMemo } from "react";
import { Link } from "react-router-dom";
import { NotebookPen, CalendarDays, Orbit, Moon, Sparkles } from "lucide-react";
import { bodySign } from "@/lib/cosmic/astro/bodies";
import { getMoonPhase, getIllumination, MOON_INFO } from "@/lib/moon";
import type { NatalChartV2 } from "@/lib/cosmic/chart";
import type { Sign } from "@/lib/transits";

const SIGN_THEMES: Record<Sign, string> = {
  Aries: "courage, initiation, fresh starts",
  Taurus: "rooting, sensory pleasure, steady building",
  Gemini: "curiosity, conversation, learning",
  Cancer: "nurture, home, emotional truth",
  Leo: "play, creativity, full-hearted expression",
  Virgo: "routines, health, organization, caregiving",
  Libra: "relationships, beauty, balance",
  Scorpio: "depth, intimacy, transformation",
  Sagittarius: "expansion, meaning, adventure",
  Capricorn: "structure, responsibility, the long game",
  Aquarius: "vision, community, freedom",
  Pisces: "softness, intuition, dreaming",
};

const ZODIAC_DATES: Record<Sign, string> = {
  Aries: "Mar 21 – Apr 19", Taurus: "Apr 20 – May 20", Gemini: "May 21 – Jun 20",
  Cancer: "Jun 21 – Jul 22", Leo: "Jul 23 – Aug 22", Virgo: "Aug 23 – Sep 22",
  Libra: "Sep 23 – Oct 22", Scorpio: "Oct 23 – Nov 21", Sagittarius: "Nov 22 – Dec 21",
  Capricorn: "Dec 22 – Jan 19", Aquarius: "Jan 20 – Feb 18", Pisces: "Feb 19 – Mar 20",
};

const QUICK = [
  { to: "/journal", label: "Journal", icon: NotebookPen },
  { to: "/today", label: "Plan day", icon: CalendarDays },
  { to: "/cosmic-flow/predictive", label: "Transits", icon: Orbit },
  { to: "/cosmic-flow/calendar", label: "Moon ritual", icon: Moon },
  { to: "/cosmic-flow/natal", label: "Insights", icon: Sparkles },
] as const;

export function CosmicHero({ date, chart }: { date: Date; chart: NatalChartV2 | null }) {
  const data = useMemo(() => {
    const phase = getMoonPhase(date);
    const moonInfo = MOON_INFO[phase];
    const sunSign = bodySign("Sun", date) as Sign;
    const moonSign = bodySign("Moon", date) as Sign;
    const illumination = getIllumination(date);
    const rising = chart?.houses?.ascendantSign as Sign | undefined;
    const weather = `Today the Moon moves through ${moonSign}, bringing focus to ${SIGN_THEMES[moonSign]}.`;
    return { phase, moonInfo, sunSign, moonSign, illumination, rising, weather };
  }, [date, chart]);

  return (
    <section
      className="relative overflow-hidden rounded-3xl border border-border/50 p-5 sm:p-7"
      style={{
        background:
          "radial-gradient(120% 80% at 80% 0%, hsl(var(--primary) / 0.22), transparent 55%)," +
          "radial-gradient(90% 60% at 0% 100%, hsl(45 70% 60% / 0.10), transparent 60%)," +
          "linear-gradient(160deg, hsl(245 40% 12%), hsl(258 35% 16%) 60%, hsl(270 30% 20%))",
        color: "hsl(36 50% 96%)",
      }}
    >
      {/* starfield */}
      <div className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(1px 1px at 20% 30%, white, transparent)," +
            "radial-gradient(1px 1px at 70% 20%, white, transparent)," +
            "radial-gradient(1.5px 1.5px at 40% 70%, white, transparent)," +
            "radial-gradient(1px 1px at 85% 60%, white, transparent)," +
            "radial-gradient(1px 1px at 10% 80%, white, transparent)",
          backgroundSize: "300px 300px",
        }}
      />

      <div className="relative grid gap-5 sm:grid-cols-[1fr_auto] sm:items-start">
        <div className="min-w-0 space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.22em] backdrop-blur">
            <span>🌙</span> Cosmic Flow
          </div>
          <h1 className="font-display text-2xl leading-tight sm:text-4xl">
            {data.moonInfo.label} in {data.moonSign}
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-white/80 sm:text-base">
            {data.weather}
          </p>

          <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
            <Chip label={`${data.moonInfo.glyph} ${data.moonInfo.label}`} sub={`${data.illumination}% lit`} />
            <Chip label={`☉ ${data.sunSign} season`} sub={ZODIAC_DATES[data.sunSign]} />
            {data.rising && (
              <Chip label={`↑ ${data.rising} rising`} sub={SIGN_THEMES[data.rising].split(",")[0]} />
            )}
          </div>
        </div>

        {/* Moon dial */}
        <MoonDial phase={data.phase} illumination={data.illumination} />
      </div>

      <div className="relative mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {QUICK.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="group inline-flex items-center justify-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-white/90 backdrop-blur transition hover:border-white/30 hover:bg-white/10"
          >
            <Icon className="h-3.5 w-3.5 opacity-80 group-hover:opacity-100" />
            {label}
          </Link>
        ))}
      </div>
    </section>
  );
}

function Chip({ label, sub }: { label: string; sub?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-2.5 py-1 backdrop-blur">
      <span className="font-medium text-white/95">{label}</span>
      {sub && <span className="text-white/55">· {sub}</span>}
    </span>
  );
}

function MoonDial({ illumination }: { phase: string; illumination: number }) {
  // simple lit-disc visualization using a clip + offset
  const lit = Math.max(0, Math.min(100, illumination));
  const offset = 50 - lit / 2; // for shadow position
  return (
    <div className="relative mx-auto h-24 w-24 sm:h-28 sm:w-28">
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "radial-gradient(circle at 30% 30%, hsl(45 80% 92%), hsl(45 50% 75%) 60%, hsl(258 30% 35%))",
          boxShadow: "0 0 40px hsl(45 70% 70% / 0.35), inset -10px -10px 30px hsl(258 40% 15% / 0.5)",
        }}
      />
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: "hsl(245 40% 10% / 0.85)",
          clipPath: `inset(0 ${offset}% 0 0 round 9999px)`,
          opacity: lit > 95 ? 0 : 1,
          transition: "all 400ms ease",
        }}
      />
      <div className="absolute inset-0 grid place-items-center text-[10px] uppercase tracking-widest text-white/70">
        {lit}%
      </div>
    </div>
  );
}