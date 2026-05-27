import { useEffect, useMemo, useRef, useState } from "react";
import {
  Cloud, CloudDrizzle, CloudFog, CloudRain, CloudSnow, CloudSun,
  Loader2, MapPin, Moon, MoonStar, Search, Sun, Wind, Zap, ChevronDown, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  fetchWeather, geocodeCity, loadSavedPlace, reverseLabel, savePlace,
  type DayPartForecast, type GeoPlace, type HourlyForecast, type WeatherCondition, type WeatherSnapshot,
} from "@/lib/weather";
import { dayPartSuggestion, setWeatherSnapshot, useTempUnit, cToF, type TempUnit } from "@/lib/weather-store";

const fmtTemp = (c: number, u: TempUnit) => `${u === "F" ? cToF(c) : Math.round(c)}°`;
const fmtHour = (h: number) => {
  const period = h >= 12 ? "PM" : "AM";
  const h12 = ((h + 11) % 12) + 1;
  return `${h12} ${period}`;
};

function ConditionIcon({ condition, isNight, className }: { condition: WeatherCondition; isNight?: boolean; className?: string }) {
  const cls = cn("h-5 w-5", className);
  if (condition === "clear") return isNight ? <Moon className={cls} /> : <Sun className={cls} />;
  if (condition === "partly-cloudy") return <CloudSun className={cls} />;
  if (condition === "cloudy") return <Cloud className={cls} />;
  if (condition === "fog") return <CloudFog className={cls} />;
  if (condition === "drizzle") return <CloudDrizzle className={cls} />;
  if (condition === "rain") return <CloudRain className={cls} />;
  if (condition === "snow") return <CloudSnow className={cls} />;
  if (condition === "thunderstorm") return <Zap className={cls} />;
  return <Cloud className={cls} />;
}

/** Soft gradient per day-part, built from existing semantic tokens. */
const PART_GRADIENT: Record<string, string> = {
  Morning: "linear-gradient(135deg, hsl(var(--accent-soft)) 0%, hsl(var(--warm-soft)) 100%)",
  Afternoon: "linear-gradient(135deg, hsl(var(--warm-soft)) 0%, hsl(var(--secondary-soft)) 100%)",
  Evening: "linear-gradient(135deg, hsl(var(--primary-soft)) 0%, hsl(var(--moon-soft)) 100%)",
  "Late Night": "linear-gradient(135deg, hsl(var(--moon-soft)) 0%, hsl(var(--primary-soft)) 100%)",
};

const PART_ICON: Record<string, typeof Sun> = {
  Morning: Sun, Afternoon: CloudSun, Evening: Moon, "Late Night": MoonStar,
};

interface Props {
  /** Receive the loaded snapshot so siblings (clothing, AI) can react. */
  onSnapshot?: (s: WeatherSnapshot | null) => void;
}

export function WeatherHeroCard({ onSnapshot }: Props) {
  const [snap, setSnap] = useState<WeatherSnapshot | null>(null);
  const [unit, setUnit] = useTempUnit();
  const [status, setStatus] = useState<"idle" | "loading" | "needs-location" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [expandedPart, setExpandedPart] = useState<string | null>(null);
  const triedRef = useRef(false);

  useEffect(() => { onSnapshot?.(snap); }, [snap, onSnapshot]);

  useEffect(() => {
    if (triedRef.current) return;
    triedRef.current = true;
    const saved = loadSavedPlace();
    if (saved) { void loadFor(saved); return; }
    if (!("geolocation" in navigator)) { setStatus("needs-location"); return; }
    setStatus("loading");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const label = await reverseLabel(latitude, longitude);
          await loadFor({ name: label, lat: latitude, lon: longitude }, true);
        } catch { setStatus("needs-location"); }
      },
      () => setStatus("needs-location"),
      { timeout: 6000, maximumAge: 5 * 60 * 1000 },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadFor(place: GeoPlace, persist = false) {
    setStatus("loading"); setErrorMsg(null);
    try {
      const s = await fetchWeather(place.lat, place.lon, place.name);
      setSnap(s); setWeatherSnapshot(s); setStatus("idle");
      if (persist) savePlace(place);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Could not load weather");
      setStatus("error");
    }
  }

  // Surface only three primary day parts in the hero (Morning / Afternoon / Evening).
  const heroParts = useMemo(
    () => (snap?.dayParts ?? []).filter(p => p.part !== "Late Night" && p.conditionLabel !== "—"),
    [snap],
  );

  return (
    <section
      aria-label="Today's weather"
      className="cozy-card relative overflow-hidden p-5"
      style={{ background: "var(--gradient-dawn)" }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(60% 70% at 85% 20%, hsl(var(--primary)/0.18), transparent 70%), radial-gradient(50% 65% at 15% 90%, hsl(var(--moon, var(--primary))/0.16), transparent 70%)",
        }}
      />
      <div className="relative">
        {/* Header row */}
        <div className="flex flex-wrap items-start gap-3">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-card/70 backdrop-blur-sm text-foreground border border-border/60 shadow-[var(--shadow-soft)]">
            {status === "loading" ? <Loader2 className="h-6 w-6 animate-spin" />
              : snap ? <ConditionIcon condition={snap.condition} isNight={snap.isNight} className="h-6 w-6" />
              : <Cloud className="h-6 w-6" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span className="truncate">
                {snap?.locationLabel ?? (status === "needs-location"
                  ? "Set your location"
                  : status === "error" ? "Weather unavailable" : "Finding your weather…")}
              </span>
            </div>
            {snap ? (
              <>
                <div className="mt-0.5 flex items-baseline gap-2 flex-wrap">
                  <span className="font-display text-4xl leading-none tabular-nums">{fmtTemp(snap.tempC, unit)}</span>
                  <span className="text-sm">{snap.conditionLabel}</span>
                </div>
                <p className="mt-0.5 text-[12px] text-muted-foreground tabular-nums">
                  H {fmtTemp(snap.highC, unit)} · L {fmtTemp(snap.lowC, unit)}
                </p>
              </>
            ) : status === "error" ? (
              <p className="mt-0.5 text-[12px] text-destructive">{errorMsg ?? "Could not load weather."}</p>
            ) : (
              <p className="mt-0.5 text-[12px] text-muted-foreground">Reading the sky…</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div role="group" aria-label="Temperature unit" className="inline-flex rounded-full border border-border/60 bg-card/60 backdrop-blur p-0.5">
              {(["C","F"] as const).map(u => {
                const active = unit === u;
                return (
                  <button key={u} type="button" onClick={() => setUnit(u)} aria-pressed={active}
                    className={cn("h-7 min-w-[28px] px-2 rounded-full text-[11px] font-semibold transition-colors",
                      active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>°{u}</button>
                );
              })}
            </div>
            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-full px-3 text-[11px] uppercase tracking-[0.16em] bg-card/60 backdrop-blur">
                  <Search className="h-3.5 w-3.5" /> City
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72 p-2">
                <CitySearch onPick={async (p) => { setPickerOpen(false); await loadFor(p, true); }} />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Day-part tiles */}
        {heroParts.length > 0 && (
          <ul className="mt-4 grid gap-2 sm:grid-cols-3">
            {heroParts.map(p => {
              const Icon = PART_ICON[p.part] ?? Sun;
              const expanded = expandedPart === p.part;
              return (
                <li key={p.part}>
                  <button
                    type="button"
                    onClick={() => setExpandedPart(expanded ? null : p.part)}
                    aria-expanded={expanded}
                    className={cn(
                      "group relative w-full rounded-2xl border border-border/60 p-3 text-left transition-all",
                      "hover:shadow-[var(--shadow-cozy)] hover:-translate-y-0.5",
                      expanded && "ring-2 ring-primary/40",
                    )}
                    style={{ background: PART_GRADIENT[p.part] }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-foreground/70">
                        <Icon className="h-3.5 w-3.5" /> {p.part}
                      </div>
                      <ConditionIcon condition={p.condition} isNight={p.isNight} className="h-4 w-4 text-foreground/80" />
                    </div>
                    <div className="mt-1.5 flex items-baseline gap-2">
                      <span className="font-display text-2xl tabular-nums">{fmtTemp(p.avgTempC, unit)}</span>
                      <span className="text-[11px] text-foreground/70 tabular-nums">H {fmtTemp(p.highC, unit)} · L {fmtTemp(p.lowC, unit)}</span>
                    </div>
                    <p className="mt-0.5 truncate text-[12px] text-foreground/80">{p.conditionLabel}</p>
                    <div className="mt-1 flex items-center gap-3 text-[11px] text-foreground/70">
                      {p.precipChance >= 10 && <span className="inline-flex items-center gap-1">💧 {p.precipChance}%</span>}
                      <ChevronDown className={cn("ml-auto h-3.5 w-3.5 transition-transform", expanded && "rotate-180")} />
                    </div>
                    <div
                      className={cn(
                        "grid overflow-hidden transition-[grid-template-rows] duration-300",
                        expanded ? "grid-rows-[1fr] mt-2" : "grid-rows-[0fr]",
                      )}
                    >
                      <div className="min-h-0">
                        <DayPartDetails dp={p} unit={unit} />
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

function DayPartDetails({ dp, unit }: { dp: DayPartForecast; unit: TempUnit }) {
  const tip = dayPartSuggestion(dp);
  return (
    <div className="border-t border-border/60 pt-2 text-[12px] text-foreground/80">
      <div className="grid grid-cols-2 gap-1.5">
        <div className="inline-flex items-center gap-1.5">
          <CloudRain className="h-3.5 w-3.5 text-foreground/60" /> {dp.precipChance}% chance
        </div>
        <div className="inline-flex items-center gap-1.5">
          <Wind className="h-3.5 w-3.5 text-foreground/60" /> {dp.isNight ? "Cooler hours" : "Mild breeze"}
        </div>
        <div className="inline-flex items-center gap-1.5 col-span-2">
          <Sun className="h-3.5 w-3.5 text-foreground/60" /> Avg {fmtTemp(dp.avgTempC, unit)} · {dp.conditionLabel}
        </div>
      </div>
      {tip && <p className="mt-1.5 italic text-foreground/75">{tip}.</p>}
    </div>
  );
}

function CitySearch({ onPick }: { onPick: (p: GeoPlace) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<GeoPlace[]>([]);
  const [searching, setSearching] = useState(false);
  useEffect(() => {
    const trimmed = q.trim();
    if (trimmed.length < 2) { setResults([]); return; }
    let cancelled = false;
    const t = setTimeout(async () => {
      setSearching(true);
      try { const r = await geocodeCity(trimmed); if (!cancelled) setResults(r); }
      catch { /* noop */ }
      finally { if (!cancelled) setSearching(false); }
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q]);

  return (
    <div className="flex flex-col gap-2">
      <label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Find a city</label>
      <Input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="e.g. Lisbon, Kyoto" className="h-9 text-sm" />
      {q.trim().length < 2 && <p className="text-[11px] text-muted-foreground">Type at least 2 characters.</p>}
      {searching && <p className="text-[11px] text-muted-foreground">Searching…</p>}
      {results.length > 0 && (
        <ul className="max-h-56 overflow-auto rounded-md border divide-y divide-border/60">
          {results.map((r,i) => (
            <li key={`${r.name}-${i}`}>
              <button type="button" onClick={() => onPick(r)} className="w-full text-left px-3 py-2 text-[13px] hover:bg-muted/60">
                <div className="font-medium leading-tight">{r.name}</div>
                <div className="text-[11px] text-muted-foreground leading-tight">{[r.admin1, r.country].filter(Boolean).join(", ")}</div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}