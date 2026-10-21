import { useMemo } from "react";
import { addDays, format, isSameDay } from "date-fns";
import { Link, useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DayPickerButton } from "@/components/calendar/DayPickerButton";
import { dailyPullFor, loadPulls } from "@/lib/astro-suite/tarot-pulls";
import { getCardById } from "@/lib/astro-suite/tarot";
import { cn } from "@/lib/utils";
import { LunarDateConnections } from "@/components/cosmic/LunarDateConnections";
import { monthRhythmMoments, cosmicDateFromParam } from "@/lib/cosmic/lunar-rhythm";
import { bodyLongitude } from "@/lib/cosmic/astro/bodies";
import { MoonAspectGuide } from "@/components/cosmic/MoonAspectGuide";
import { AstroPageHeader } from "@/components/cosmic/AstroPageHeader";
import { SkyRowActions } from "@/components/cosmic/SkyRowActions";
import { BODY_GLYPHS } from "@/lib/cosmic/astro/bodies";
import { SIGN_GLYPH } from "@/lib/cosmic/glyphs";
import { houseOf } from "@/lib/cosmic/astro/houses";
import { SKY_BODIES, skyStatus, signOf } from "@/lib/cosmic/sky";
import { useMyChart } from "@/lib/cosmic/use-my-chart";
import { describeSkyPlacement, describeIngress, TERM_HELP } from "@/lib/cosmic/plain-language";
import { MoonDisc } from "@/components/cosmic/MoonArc";

const NAME: Record<string, string> = { NorthNode: "North Node" };
const MEAN_SPEED: Record<string, number> = { Sun: 1, Moon: 13.2, Mercury: 1.38, Venus: 1.2, Mars: 0.52, Jupiter: 0.083, Saturn: 0.033, Uranus: 0.012, Neptune: 0.006, Pluto: 0.004, NorthNode: 0.053, Chiron: 0.02 };

export default function CosmicSky() {
  const { chart } = useMyChart();
  const [params, setParams] = useSearchParams();
  const dateParam = params.get("date");
  const now = useMemo(() => cosmicDateFromParam(dateParam), [dateParam]);
  const tab = params.get("tab") === "lunations" ? "lunations" : "signs";
  const setTab = (value: string) => setParams(p => { const next = new URLSearchParams(p); next.set("tab", value); return next; });
  const isNow = !dateParam || isSameDay(now, new Date());
  const go = (d: Date | null) => setParams(p => { const n = new URLSearchParams(p); if (d) n.set("date", format(d, "yyyy-MM-dd")); else n.delete("date"); return n; });
  const iso = format(now, "yyyy-MM-dd");
  const daily = useMemo(() => dailyPullFor(loadPulls(), iso), [iso]);
  const dailyCard = daily ? getCardById(daily.cards[0]?.id) : undefined;
  const status = useMemo(() => SKY_BODIES.map(b => skyStatus(b, now)), [now]);
  const luns = useMemo(() => monthRhythmMoments(now), [now]);

  return (
    <div className="mx-auto max-w-4xl space-y-4 px-4 py-6 pb-28">
      <AstroPageHeader title="The sky" subtitle="Where every planet is now, what moves next, and the coming new and full Moons." />
      <div className="cozy-card flex flex-wrap items-center gap-2 px-3 py-2">
        <Button size="icon" variant="ghost" className="h-11 w-11" aria-label="Previous day" onClick={() => go(addDays(now, -1))}><ChevronLeft className="h-4 w-4" /></Button>
        <DayPickerButton date={now} onChange={d => go(d)} />
        <Button size="icon" variant="ghost" className="h-11 w-11" aria-label="Next day" onClick={() => go(addDays(now, 1))}><ChevronRight className="h-4 w-4" /></Button>
        {!isNow && <Button size="sm" variant="outline" onClick={() => go(null)}>Now</Button>}
        <p className="text-sm text-muted-foreground">{isNow ? "Sky right now" : `Sky on ${format(now, "EEE, MMM d, yyyy")}`}</p>
        {dailyCard && <Link to={`/cosmic-flow/tarot?date=${iso}`} className="ml-auto rounded-full bg-accent/15 px-2.5 py-1 text-xs hover:bg-accent/25">🔮 Tarot that day: {dailyCard.name}</Link>}
      </div>
      <MoonAspectGuide date={now} reflect />
      <LunarDateConnections date={now} current={tab === "lunations" ? "lunations" : "sky"} />
      <div className="flex gap-1.5">
        {(["signs", "lunations"] as const).map(t => (
          <Button key={t} onClick={() => setTab(t)} variant={tab === t ? "default" : "outline"} className="rounded-full px-3 text-sm min-h-11">
            {t === "signs" ? "Signs & motion" : "Lunations & eclipses"}
          </Button>
        ))}
      </div>

      {tab === "signs" ? (
        <ul aria-label="Planet positions" className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3 sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-3">
          {status.map(s => {
            const speedPct = Math.min(100, Math.round((Math.abs(s.speed) / (MEAN_SPEED[s.body] ?? 1)) * 60));
            return (
              <li key={s.body} className="relative flex w-[85%] shrink-0 snap-start flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:w-auto" data-planet={s.body}>
                <div className="flex items-center gap-3">
                  <div className="relative h-16 w-16 shrink-0" style={{ color: `hsl(var(--sign-${s.sign.toLowerCase()}))` }}>
                    <svg viewBox="0 0 64 64" className="absolute inset-0 h-full w-full -rotate-90" aria-label={`${s.degree.toFixed(1)} degrees through ${s.sign}`}><circle cx="32" cy="32" r="28" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" /><circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="3" pathLength="100" strokeDasharray={`${s.degree / 30 * 100} 100`} strokeLinecap="round" /></svg>
                    <span className="absolute inset-0 flex items-center justify-center text-3xl text-foreground">{BODY_GLYPHS[s.body]}</span>
                  </div>
                  <div className="min-w-0"><h2 className="font-display text-xl">{NAME[s.body] ?? s.body}</h2><p className="text-sm text-muted-foreground">{SIGN_GLYPH[s.sign]}︎ {s.sign} · {s.degree.toFixed(1)}°</p></div>
                </div>
                {s.retrograde && <span title={TERM_HELP.retrograde} className="self-start rounded-sm bg-destructive/10 px-2 py-1 text-xs text-destructive">℞ Retrograde</span>}
                <div className="min-w-0 flex-1">
                  <p className="mt-0.5 text-[12px] leading-snug text-foreground/80">{describeSkyPlacement(s.body, s.sign, s.retrograde)}</p>
                </div>
                <div className="w-full" aria-label={`Speed ${speedPct}% of typical`}>
                  <div className="h-1.5 rounded-full bg-muted"><div className={cn("h-1.5 rounded-full", s.retrograde ? "bg-destructive/70" : "bg-secondary")} style={{ width: `${speedPct}%` }} /></div>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{speedPct < 15 ? "Slowing down — about to change direction" : s.retrograde ? "Looks like it moves backward" : "Moving forward"}</p>
                </div>
                <div className="min-w-0 border-t border-border pt-3 text-xs leading-relaxed text-foreground/80">
                  {s.nextIngress && <p>{describeIngress(s.body, s.nextIngress.sign, s.nextIngress.date)} <span className="text-muted-foreground">({format(s.nextIngress.date, s.body === "Moon" ? "EEE h a" : "MMM d")})</span></p>}
                  {s.nextStation && <p className="text-muted-foreground">Changes direction ({s.nextStation.turns}) {format(s.nextStation.date, "MMM d, yyyy")}</p>}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <ol aria-label="Lunations and eclipses timeline" className="relative space-y-5 before:absolute before:bottom-8 before:left-8 before:top-8 before:w-px before:bg-border">
          {luns.map(l => {
            const longitude = bodyLongitude("Moon", l.date);
            const sign = signOf(longitude);
            const house = chart?.houses ? houseOf(longitude, chart.houses) : null;
            const title = `${l.info.label} · ${l.info.moon} in ${sign}`;
            return (
              <li key={l.date.toISOString()} className="relative grid grid-cols-[64px_minmax(0,1fr)] gap-3">
                <div className={cn("relative flex h-16 w-16 items-center justify-center rounded-full bg-background", l.eclipseSeason && "ring-2 ring-accent ring-offset-4 ring-offset-background")}>
                  <MoonDisc size={56} illum={l.phase === "plan" ? 0 : l.phase === "care" ? 1 : 0.5} waxing={l.phase !== "letgo"} rhythm={l.phase} />
                </div>
                <div className="min-w-0 rounded-lg border border-border bg-card p-3 sm:p-4" style={{ borderTopColor: `hsl(var(--rhythm-${l.phase}-deep))`, borderTopWidth: 3 }}>
                  <p className="mb-1 text-xs font-medium" style={{ color: `hsl(var(--rhythm-${l.phase}-deep))` }}>{l.info.label}</p>
                  <h2 className="font-display text-lg">{l.info.moon} in {sign} {SIGN_GLYPH[sign]}︎</h2>
                  <p className="text-xs text-muted-foreground">
                    {format(l.date, "EEE, MMM d · h:mm a")} · {Math.floor(longitude % 30)}°
                    {house && ` · your house ${house}`}
                    {l.eclipseSeason ? " · possible eclipse window (near the nodes)" : ""}
                  </p>
                  <p className="mt-1 text-xs text-foreground/80">{l.info.invitation}</p>
                  <LunarDateConnections date={l.date} phase={l.phase} current="lunations" />
                  <div className="mt-2 flex justify-end"><SkyRowActions title={title} date={l.date} note={house ? `Touches my house ${house}` : undefined} /></div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
