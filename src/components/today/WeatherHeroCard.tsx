import { useEffect, useMemo, useRef, useState } from "react";
import {
  Cloud, CloudDrizzle, CloudFog, CloudRain, CloudSnow, CloudSun,
  Loader2, MapPin, Moon, MoonStar, Search, Sun, Zap, ChevronDown, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  const [detailPart, setDetailPart] = useState<DayPartForecast | null>(null);
  const [showHourly, setShowHourly] = useState(false);
  const triedRef = useRef(false);
  const [mobileNowOnly, setMobileNowOnly] = useState(true);

  const currentPart = useMemo(() => {
    const h = new Date().getHours();
    if (h >= 6 && h < 12) return "Morning";
    if (h >= 12 && h < 17) return "Afternoon";
    if (h >= 17 && h < 21) return "Evening";
    return "Late Night";
  }, []);

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

  const mobileParts = useMemo(() => {
    if (!mobileNowOnly) return heroParts;
    const match = heroParts.filter(p => p.part === currentPart);
    return match.length > 0 ? match : heroParts;
  }, [heroParts, mobileNowOnly, currentPart]);

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
          <>
          <div className="mt-4 flex items-center justify-between gap-2 sm:hidden">
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {mobileNowOnly ? `Right now · ${currentPart}` : "All day parts"}
            </span>
            <div role="group" aria-label="Day part filter" className="inline-flex rounded-full border border-border/60 bg-card/60 backdrop-blur p-0.5">
              {([
                { id: "now", label: "Now" },
                { id: "all", label: "All" },
              ] as const).map(opt => {
                const active = (opt.id === "now") === mobileNowOnly;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setMobileNowOnly(opt.id === "now")}
                    aria-pressed={active}
                    className={cn(
                      "h-7 min-w-[40px] px-2.5 rounded-full text-[11px] font-semibold transition-colors",
                      active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
          {(() => {
            const renderTile = (p: DayPartForecast) => {
              const Icon = PART_ICON[p.part] ?? Sun;
              return (
                <li key={p.part}>
                  <button
                    type="button"
                    onClick={() => setDetailPart(p)}
                    aria-haspopup="dialog"
                    className={cn(
                      "group relative w-full rounded-2xl border border-border/60 p-3 text-left transition-all",
                      "hover:shadow-[var(--shadow-cozy)] hover:-translate-y-0.5",
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
                      <span className="ml-auto text-[10px] uppercase tracking-wider text-foreground/60">Tap for details</span>
                    </div>
                  </button>
                </li>
              );
            };
            return (
              <>
                <ul className="mt-2 grid gap-2 sm:hidden">
                  {mobileParts.map(renderTile)}
                </ul>
                <ul className="mt-4 hidden gap-2 sm:grid sm:grid-cols-3">
                  {heroParts.map(renderTile)}
                </ul>
              </>
            );
          })()}
          </>
        )}

        {/* Hourly forecast disclosure */}
        {snap && snap.todayHourly.length > 0 && (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setShowHourly(v => !v)}
              aria-expanded={showHourly}
              className={cn(
                "inline-flex w-full items-center justify-between rounded-full border border-border/60 bg-card/60 px-4 py-2 text-[12px] font-medium text-foreground/85 backdrop-blur transition-colors hover:bg-card/80",
                showHourly && "bg-card/80",
              )}
            >
              <span className="inline-flex items-center gap-2">
                <Clock className="h-3.5 w-3.5" />
                Hourly forecast
              </span>
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showHourly && "rotate-180")} />
            </button>
            <div
              className={cn(
                "grid overflow-hidden transition-[grid-template-rows] duration-300",
                showHourly ? "grid-rows-[1fr] mt-2" : "grid-rows-[0fr]",
              )}
            >
              <div className="min-h-0">
                <HourlyList hours={snap.todayHourly} unit={unit} />
              </div>
            </div>
          </div>
        )}
      </div>
      <DayPartDetailDialog
        part={detailPart}
        unit={unit}
        hours={snap?.todayHourly ?? []}
        onClose={() => setDetailPart(null)}
      />
    </section>
  );
}

function hoursForPart(part: string, hours: HourlyForecast[]): HourlyForecast[] {
  if (part === "Morning") return hours.filter(h => h.hour >= 6 && h.hour < 12);
  if (part === "Afternoon") return hours.filter(h => h.hour >= 12 && h.hour < 17);
  if (part === "Evening") return hours.filter(h => h.hour >= 17 && h.hour < 21);
  if (part === "Late Night") return hours.filter(h => h.hour >= 21 || h.hour < 6);
  return hours;
}

function DayPartDetails({ dp, unit, hours }: { dp: DayPartForecast; unit: TempUnit; hours: HourlyForecast[] }) {
  const tip = dayPartSuggestion(dp);
  const partHours = hoursForPart(dp.part, hours);
  return (
    <div className="border-t border-border/60 pt-2 text-[12px] text-foreground/80">
      {partHours.length > 0 ? (
        <HourlyList hours={partHours} unit={unit} compact />
      ) : (
        <p className="text-foreground/70">No hourly data.</p>
      )}
      {tip && <p className="mt-1.5 italic text-foreground/75">{tip}.</p>}
    </div>
  );
}

function DayPartDetailDialog({
  part, unit, hours, onClose,
}: { part: DayPartForecast | null; unit: TempUnit; hours: HourlyForecast[]; onClose: () => void }) {
  const open = !!part;
  const partHours = part ? hoursForPart(part.part, hours) : [];
  const tip = part ? dayPartSuggestion(part) : null;
  const Icon = part ? (PART_ICON[part.part] ?? Sun) : Sun;
  const maxPrecip = partHours.reduce((m, h) => Math.max(m, h.precipChance), 0);
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        {part && (
          <>
            <div className="p-5" style={{ background: PART_GRADIENT[part.part] }}>
              <DialogHeader>
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-foreground/70">
                  <Icon className="h-3.5 w-3.5" /> {part.part}
                </div>
                <DialogTitle className="mt-1 flex items-baseline gap-2 font-display">
                  <span className="text-3xl tabular-nums">{fmtTemp(part.avgTempC, unit)}</span>
                  <span className="text-sm font-normal text-foreground/80">{part.conditionLabel}</span>
                </DialogTitle>
              </DialogHeader>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-[12px] text-foreground/80 tabular-nums">
                <span>H {fmtTemp(part.highC, unit)} · L {fmtTemp(part.lowC, unit)}</span>
                <span className="inline-flex items-center gap-1">💧 Peak {maxPrecip}%</span>
              </div>
            </div>
            <div className="p-5 pt-3 space-y-3">
              <div>
                <h4 className="mb-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Hourly forecast</h4>
                {partHours.length > 0 ? (
                  <HourlyList hours={partHours} unit={unit} />
                ) : (
                  <p className="text-[12px] text-muted-foreground">No hourly data available.</p>
                )}
              </div>
              {tip && (
                <p className="rounded-xl bg-muted/50 px-3 py-2 text-[12px] italic text-foreground/80">{tip}.</p>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function HourlyList({ hours, unit, compact = false }: { hours: HourlyForecast[]; unit: TempUnit; compact?: boolean }) {
  const nowHour = new Date().getHours();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const nowRef = useRef<HTMLLIElement | null>(null);
  useEffect(() => {
    if (nowRef.current && scrollRef.current) {
      const el = nowRef.current;
      const container = scrollRef.current;
      const top = el.offsetTop - container.offsetTop - 8;
      container.scrollTo({ top, behavior: "smooth" });
    }
  }, [hours]);
  return (
    <div
      ref={scrollRef}
      className={cn(
        "no-scrollbar overflow-y-auto rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm",
        compact ? "max-h-44" : "max-h-72",
      )}
    >
      <ul className="divide-y divide-border/40">
        {hours.map(h => {
          const isNow = h.hour === nowHour;
          return (
            <li
              key={h.hour}
              ref={isNow ? nowRef : undefined}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 text-[12px] transition-colors",
                h.isNight && !isNow && "bg-moon-soft/40",
                isNow && "bg-primary/15 ring-1 ring-inset ring-primary/40 text-foreground",
              )}
            >
              <span className={cn("w-12 shrink-0 font-mono tabular-nums text-foreground/80", isNow && "font-semibold text-primary")}>
                {fmtHour(h.hour)}
              </span>
              <ConditionIcon condition={h.condition} isNight={h.isNight} className="h-4 w-4 shrink-0 text-foreground/70" />
              <span className="min-w-0 flex-1 truncate text-foreground/80">{h.conditionLabel}</span>
              {h.precipChance >= 10 && (
                <span className="inline-flex shrink-0 items-center gap-0.5 text-[11px] text-foreground/65 tabular-nums">
                  💧 {h.precipChance}%
                </span>
              )}
              <span className={cn("w-10 shrink-0 text-right font-medium tabular-nums", isNow && "text-primary")}>
                {fmtTemp(h.tempC, unit)}
              </span>
              {isNow && (
                <span className="ml-0.5 shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-primary-foreground">
                  Now
                </span>
              )}
            </li>
          );
        })}
      </ul>
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