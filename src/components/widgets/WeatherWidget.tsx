import { useEffect, useRef, useState } from "react";
import {
  Cloud, CloudDrizzle, CloudFog, CloudRain, CloudSnow, CloudSun,
  Loader2, MapPin, Moon, MoonStar, Search, Sun, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  fetchWeather, geocodeCity, loadSavedPlace, reverseLabel, savePlace, weatherNudge,
  type DayPartForecast, type GeoPlace, type WeatherCondition, type WeatherSnapshot,
} from "@/lib/weather";
import { setWeatherSnapshot } from "@/lib/weather-store";

type TempUnit = "C" | "F";
const cToF = (c: number) => Math.round((c * 9) / 5 + 32);
const fmtTemp = (c: number, u: TempUnit) => `${u === "F" ? cToF(c) : c}°`;

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

const PART_ICON = {
  Morning: Sun, Afternoon: CloudSun, Evening: Moon, "Late Night": MoonStar,
} as const;

export interface WeatherWidgetProps {
  compact?: boolean;
  showDayParts?: boolean;
}

export function WeatherWidget({ compact = false, showDayParts = true }: WeatherWidgetProps) {
  const [snap, setSnap] = useState<WeatherSnapshot | null>(null);
  const [unit, setUnit] = useState<TempUnit>(() => (localStorage.getItem("careflow:weather:unit") as TempUnit) ?? "F");
  const [status, setStatus] = useState<"idle" | "loading" | "needs-location" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const triedRef = useRef(false);

  useEffect(() => { localStorage.setItem("careflow:weather:unit", unit); }, [unit]);

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

  return (
    <section aria-label="Today's weather" className="cozy-card overflow-hidden p-4">
      <div className="flex items-center gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-b from-secondary-soft to-secondary/40 text-foreground border border-border/60">
          {status === "loading" ? <Loader2 className="h-5 w-5 animate-spin" />
            : snap ? <ConditionIcon condition={snap.condition} isNight={snap.isNight} />
            : <Cloud className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span className="truncate">{snap?.locationLabel ?? (status === "needs-location" ? "Set your location" : status === "error" ? "Weather unavailable" : "Finding your weather…")}</span>
          </div>
          {snap ? (
            <div className="mt-0.5 flex items-baseline gap-2 flex-wrap">
              <span className="font-display text-2xl leading-none tabular-nums">{fmtTemp(snap.tempC, unit)}</span>
              <span className="text-[13px] truncate">{snap.conditionLabel}</span>
              <span className="text-[11px] text-muted-foreground tabular-nums">· H {fmtTemp(snap.highC, unit)} / L {fmtTemp(snap.lowC, unit)}</span>
            </div>
          ) : status === "error" ? (
            <p className="mt-0.5 text-[12px] text-destructive">{errorMsg ?? "Could not load weather."}</p>
          ) : (
            <p className="mt-0.5 text-[12px] text-muted-foreground">Reading the sky…</p>
          )}
        </div>
        <div role="group" aria-label="Temperature unit" className="inline-flex shrink-0 rounded-full border border-border/60 bg-muted/40 p-0.5">
          {(["C","F"] as const).map(u => {
            const active = unit === u;
            return (
              <button key={u} type="button" onClick={() => setUnit(u)} aria-pressed={active}
                className={cn("h-7 min-w-[28px] px-2 rounded-full text-[11px] font-semibold transition-colors", active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>°{u}</button>
            );
          })}
        </div>
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-full px-3 text-[11px] uppercase tracking-[0.16em] shrink-0">
              <Search className="h-3.5 w-3.5" /> City
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 p-2">
            <CitySearch onPick={async (p) => { setPickerOpen(false); await loadFor(p, true); }} />
          </PopoverContent>
        </Popover>
      </div>

      {snap && !compact && (
        <p className="mt-3 border-t border-border/50 pt-2.5 text-[12.5px] italic text-foreground/80">{weatherNudge(snap)}</p>
      )}

      {snap && showDayParts && snap.dayParts.some(p => p.conditionLabel !== "—") && (
        <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {snap.dayParts.map(p => (
            <DayPartCard key={p.part} dp={p} unit={unit} />
          ))}
        </ul>
      )}
    </section>
  );
}

function DayPartCard({ dp, unit }: { dp: DayPartForecast; unit: TempUnit }) {
  const Icon = PART_ICON[dp.part];
  if (dp.conditionLabel === "—") return null;
  return (
    <li className="rounded-xl bg-muted/40 p-2.5 text-center">
      <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" /> {dp.part}
      </div>
      <div className="mt-1 grid place-items-center">
        <ConditionIcon condition={dp.condition} isNight={dp.isNight} className="h-5 w-5" />
      </div>
      <div className="mt-1 text-sm font-medium tabular-nums">{fmtTemp(dp.avgTempC, unit)}</div>
      <div className="text-[10px] text-muted-foreground tabular-nums">H {fmtTemp(dp.highC, unit)} · L {fmtTemp(dp.lowC, unit)}</div>
      {dp.precipChance >= 30 && <div className="mt-0.5 text-[10px] text-primary">💧 {dp.precipChance}%</div>}
    </li>
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