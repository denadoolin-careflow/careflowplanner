import { useMemo } from "react";
import { format } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { seasonFor, SEASON_META } from "@/lib/seasons/season-utils";
import { seasonsInMonth } from "@/lib/seasons/zodiac-seasons";
import { monthRhythmMoments } from "@/lib/cosmic/lunar-rhythm";
import { cn } from "@/lib/utils";
import m01 from "@/assets/month-01.jpg";
import m02 from "@/assets/month-02.jpg";
import m03 from "@/assets/month-03.jpg";
import m04 from "@/assets/month-04.jpg";
import m05 from "@/assets/month-05.jpg";
import m06 from "@/assets/month-06.jpg";
import m07 from "@/assets/month-07.jpg";
import m08 from "@/assets/month-08.jpg";
import m09 from "@/assets/month-09.jpg";
import m10 from "@/assets/month-10.jpg";
import m11 from "@/assets/month-11.jpg";
import m12 from "@/assets/month-12.jpg";

const MONTHS = [
  { img: m01, theme: "Snowy Pines" }, { img: m02, theme: "First Snowdrops" }, { img: m03, theme: "Daffodil Rain" },
  { img: m04, theme: "Cherry Blossoms" }, { img: m05, theme: "Lilac Garden" }, { img: m06, theme: "Wildflower Meadow" },
  { img: m07, theme: "Sunflower Fields" }, { img: m08, theme: "Golden Dunes" }, { img: m09, theme: "Harvest Gold" },
  { img: m10, theme: "Apple Orchard" }, { img: m11, theme: "Misty Embers" }, { img: m12, theme: "Evergreen Glow" },
];

/** Photo-forward seasonal header for a month: nature season + zodiac seasons + key lunations. */
export function MonthSeasonHeader({ month, className }: { month: Date; className?: string }) {
  const key = format(month, "yyyy-MM");
  const meta = MONTHS[month.getMonth()];
  const nature = SEASON_META[seasonFor(new Date(month.getFullYear(), month.getMonth(), 15))];
  const zodiac = useMemo(() => seasonsInMonth(month), [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const moons = useMemo(() => monthRhythmMoments(month).filter(m => m.phase === "plan" || m.phase === "care"), [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const el = zodiac[zodiac.length - 1]?.season.element ?? "earth";

  return (
    <section aria-label={`${format(month, "MMMM yyyy")} season`} className={cn("relative overflow-hidden rounded-[2rem] border border-border/50 shadow-sm", className)}>
      <AnimatePresence initial={false}>
        <motion.img key={key} src={meta.img} alt="" aria-hidden width={1536} height={640}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }}
          className="absolute inset-0 h-full w-full object-cover" />
      </AnimatePresence>
      <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-card/90 via-card/70 to-card/10" />
      <div aria-hidden className="absolute inset-0 mix-blend-soft-light" style={{ background: `hsl(var(--element-${el}) / 0.18)` }} />
      <div className="relative max-w-xl p-5 sm:p-7">
        <p className="text-[10px] uppercase tracking-[0.3em] text-foreground/70 sm:text-xs">{nature.emoji} {nature.label} · {meta.theme}</p>
        <h2 className="mt-1 font-display text-4xl leading-none text-foreground sm:text-5xl">{format(month, "MMMM")} <span className="text-foreground/60">{format(month, "yyyy")}</span></h2>
        <ul className="mt-3 space-y-1.5">
          {zodiac.map(({ season, from, to }) => (
            <li key={season.key} className="text-sm leading-snug text-foreground">
              <span className="font-semibold" style={{ color: `hsl(var(--element-${season.element}))` }}>{season.glyph}</span>{" "}
              <span className="font-medium">{season.sign} season</span>
              <span className="text-foreground/70"> · {format(from, "MMM d")}–{format(to, "d")}</span>
              <span className="block text-[13px] text-foreground/75">{season.theme}</span>
            </li>
          ))}
        </ul>
        {moons.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {moons.map(m => (
              <span key={m.id} className="rounded-full bg-card/80 px-2.5 py-1 text-xs text-foreground shadow-sm"
                style={{ boxShadow: `inset 0 0 0 1px hsl(var(--rhythm-${m.phase}-deep) / 0.3)` }}>
                {m.phase === "plan" ? "🌑 New moon" : "🌕 Full moon"} · {format(m.date, "MMM d")}{m.eclipseSeason ? " · eclipse" : ""}
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
