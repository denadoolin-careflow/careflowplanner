import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Info, Sparkles } from "lucide-react";
import { MoonGlyph } from "@/components/widgets/MoonGlyph";
import { getMoonPhase, MOON_INFO, getIllumination } from "@/lib/moon";
import { getMoonSign, ELEMENT_EMOJI, SIGN_EMOJI } from "@/lib/zodiac";
import { getTransitsForDate } from "@/lib/transits";
import { aiInvoke } from "@/lib/ai-invoke";
import { useCosmicSettings } from "@/lib/cosmic/hooks";
import { isVoidOfCourse } from "@/lib/transits";

interface ThemePayload {
  theme?: string;
  good_for?: string[];
  gentle_reminder?: string;
  journal_prompt?: string;
  alignment_tip?: string;
  suggested_action?: string;
}

const CACHE_PREFIX = "careflow:cosmic:theme:";

export function CosmicWeatherCard({ date }: { date: Date }) {
  const phase = getMoonPhase(date);
  const moonInfo = MOON_INFO[phase];
  const sign = getMoonSign(date);
  const transits = useMemo(() => getTransitsForDate(date), [date]);
  const { settings } = useCosmicSettings();
  const dateKey = format(date, "yyyy-MM-dd");
  const [payload, setPayload] = useState<ThemePayload | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CACHE_PREFIX + dateKey);
      if (raw) { setPayload(JSON.parse(raw)); return; }
    } catch { /* ignore */ }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await aiInvoke<ThemePayload>("ai-cosmic-themes", {
        body: {
          date: dateKey,
          atmosphere: settings.atmosphere,
          moon: { phase, sign: sign.name, element: sign.element, illumination: getIllumination(date) },
          active: transits.map(t => ({ kind: t.kind, planet: t.planet, sign: t.sign, detail: t.label })),
        },
      });
      if (cancelled) return;
      if (data) {
        setPayload(data);
        try { localStorage.setItem(CACHE_PREFIX + dateKey, JSON.stringify(data)); } catch { /* ignore */ }
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [dateKey, phase, sign.name, sign.element, settings.atmosphere, transits, date]);

  const voc = isVoidOfCourse(date);

  return (
    <section
      className="cozy-card relative overflow-hidden p-5 sm:p-7"
      style={{
        background: "linear-gradient(135deg, hsl(258 45% 18%) 0%, hsl(280 35% 24%) 50%, hsl(220 32% 22%) 100%)",
        color: "hsl(36 30% 92%)",
      }}
      aria-label="Today's cosmic weather"
    >
      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-lg sm:text-xl flex items-center gap-1.5">
            Today's Cosmic Weather
            <Info className="h-3.5 w-3.5 opacity-60" />
          </h2>
        </div>
        <p className="text-right text-[12px] opacity-80">
          {format(date, "MMMM d, yyyy")}<br />{format(date, "EEEE")}
        </p>
      </div>

      <div className="relative mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
        <MoonGlyph date={date} size={92} className="shrink-0" />
        <div className="min-w-0">
          <p className="font-display text-2xl sm:text-3xl">
            Moon in {sign.name} <span className="opacity-80">{SIGN_EMOJI[sign.name]}</span>
          </p>
          <p className="mt-1 text-sm opacity-90">{moonInfo.label} ({getIllumination(date)}%)</p>
          <p className="mt-0.5 text-sm opacity-80">{ELEMENT_EMOJI[sign.element]} {sign.element} Element</p>
        </div>
      </div>

      <div className="relative mt-5 grid gap-4 sm:grid-cols-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] opacity-70">Theme</p>
          <p className="mt-1 font-medium">{payload?.theme ?? (loading ? "…" : moonInfo.label)}</p>
          <p className="mt-0.5 text-[12.5px] italic opacity-85">{moonInfo.invitation}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] opacity-70">Good for</p>
          <ul className="mt-1 space-y-0.5 text-[13px]">
            {(payload?.good_for ?? ["Planning", "Brainstorming", "Organizing", "Connecting"]).slice(0, 5).map(g => (
              <li key={g} className="flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 opacity-70" />{g}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] opacity-70">Gentle reminder</p>
          <p className="mt-1 max-w-[26ch] text-[13px] italic opacity-90">
            {payload?.gentle_reminder ?? moonInfo.affirmation}
          </p>
        </div>
      </div>

      {voc && (
        <p className="relative mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[12px]">
          ☾∅ Void-of-course moon — drift is allowed.
        </p>
      )}
    </section>
  );
}