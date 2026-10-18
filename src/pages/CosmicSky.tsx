import { useMemo, useState } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { AstroPageHeader } from "@/components/cosmic/AstroPageHeader";
import { SkyRowActions } from "@/components/cosmic/SkyRowActions";
import { BODY_GLYPHS } from "@/lib/cosmic/astro/bodies";
import { SIGN_GLYPH } from "@/lib/cosmic/glyphs";
import { houseOf } from "@/lib/cosmic/astro/houses";
import { SKY_BODIES, skyStatus, lunations } from "@/lib/cosmic/sky";
import { useMyChart } from "@/lib/cosmic/use-my-chart";
import { describeSkyPlacement, describeIngress, TERM_HELP } from "@/lib/cosmic/plain-language";

const NAME: Record<string, string> = { NorthNode: "North Node" };
const MEAN_SPEED: Record<string, number> = { Sun: 1, Moon: 13.2, Mercury: 1.38, Venus: 1.2, Mars: 0.52, Jupiter: 0.083, Saturn: 0.033, Uranus: 0.012, Neptune: 0.006, Pluto: 0.004, NorthNode: 0.053, Chiron: 0.02 };

export default function CosmicSky() {
  const [tab, setTab] = useState<"signs" | "lunations">("signs");
  const { chart } = useMyChart();
  const now = useMemo(() => new Date(), []);
  const status = useMemo(() => SKY_BODIES.map(b => skyStatus(b, now)), [now]);
  const luns = useMemo(() => lunations(now, 14), [now]);

  return (
    <div className="mx-auto max-w-4xl space-y-4 px-4 py-6 pb-28">
      <AstroPageHeader title="The sky" subtitle="Where every planet is now, what moves next, and the coming new and full Moons." />
      <div className="flex gap-1.5">
        {(["signs", "lunations"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={cn("rounded-full border px-3 py-1.5 text-sm min-h-9",
            tab === t ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted")}>
            {t === "signs" ? "Signs & motion" : "Lunations & eclipses"}
          </button>
        ))}
      </div>

      {tab === "signs" ? (
        <ul className="cozy-card divide-y divide-border">
          {status.map(s => {
            const speedPct = Math.min(100, Math.round((Math.abs(s.speed) / (MEAN_SPEED[s.body] ?? 1)) * 60));
            return (
              <li key={s.body} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className="w-6 text-center text-lg">{BODY_GLYPHS[s.body]}</span>
                <div className="min-w-[9rem] flex-1">
                  <p className="text-sm font-medium">{NAME[s.body] ?? s.body} {s.retrograde && <span title={TERM_HELP.retrograde} className="ml-1 rounded bg-destructive/10 px-1 text-[10px] text-destructive">℞</span>}</p>
                  <p className="text-xs text-muted-foreground">{SIGN_GLYPH[s.sign]} {s.sign} {Math.floor(s.degree)}°</p>
                  <p className="mt-0.5 text-[12px] leading-snug text-foreground/80">{describeSkyPlacement(s.body, s.sign, s.retrograde)}</p>
                </div>
                <div className="w-24" aria-label={`Speed ${speedPct}% of typical`}>
                  <div className="h-1.5 rounded-full bg-muted"><div className={cn("h-1.5 rounded-full", s.retrograde ? "bg-destructive/70" : "bg-secondary")} style={{ width: `${speedPct}%` }} /></div>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{speedPct < 15 ? "Slowing down — about to change direction" : s.retrograde ? "Looks like it moves backward" : "Moving forward"}</p>
                </div>
                <div className="min-w-[10rem] text-xs text-foreground/80">
                  {s.nextIngress && <p>{describeIngress(s.body, s.nextIngress.sign, s.nextIngress.date)} <span className="text-muted-foreground">({format(s.nextIngress.date, s.body === "Moon" ? "EEE h a" : "MMM d")})</span></p>}
                  {s.nextStation && <p className="text-muted-foreground">Changes direction ({s.nextStation.turns}) {format(s.nextStation.date, "MMM d, yyyy")}</p>}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <ul className="cozy-card divide-y divide-border">
          {luns.map(l => {
            const house = chart?.houses ? houseOf(l.longitude, chart.houses) : null;
            const title = `${l.kind === "new" ? "New" : "Full"} Moon in ${l.sign}`;
            return (
              <li key={l.date.toISOString()} className={cn("flex items-center gap-3 px-4 py-3", l.eclipseSeason && "bg-accent/10")}>
                <span className="text-xl">{l.kind === "new" ? "🌑" : "🌕"}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{title} {SIGN_GLYPH[l.sign]}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(l.date, "EEE, MMM d · h:mm a")} · {Math.floor(l.longitude % 30)}°
                    {house && ` · your house ${house}`}
                    {l.eclipseSeason ? ` · eclipse season (${l.nodeDistance.toFixed(0)}° from the nodes)` : ""}
                  </p>
                </div>
                <SkyRowActions title={title} date={l.date} note={house ? `Touches my house ${house}` : undefined} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
