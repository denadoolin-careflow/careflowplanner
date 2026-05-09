import { useEffect, useState } from "react";
import { Cloud, CloudDrizzle, CloudFog, CloudRain, CloudSnow, CloudSun, Loader2, MapPin, Sun, Zap } from "lucide-react";
import { loadSavedPlace, mapWmoCode, reverseLabel, savePlace, type GeoPlace, type WeatherCondition } from "@/lib/weather";
import { useTempUnit, cToF } from "@/lib/weather-store";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";

interface DailyForecast {
  date: string;
  highC: number;
  lowC: number;
  condition: WeatherCondition;
  label: string;
  precip: number;
}

function CondIcon({ c, className }: { c: WeatherCondition; className?: string }) {
  const cls = cn("h-4 w-4", className);
  if (c === "clear") return <Sun className={cls} />;
  if (c === "partly-cloudy") return <CloudSun className={cls} />;
  if (c === "cloudy") return <Cloud className={cls} />;
  if (c === "fog") return <CloudFog className={cls} />;
  if (c === "drizzle") return <CloudDrizzle className={cls} />;
  if (c === "rain") return <CloudRain className={cls} />;
  if (c === "snow") return <CloudSnow className={cls} />;
  if (c === "thunderstorm") return <Zap className={cls} />;
  return <Cloud className={cls} />;
}

export function WeeklyWeather() {
  const [days, setDays] = useState<DailyForecast[] | null>(null);
  const [place, setPlace] = useState<GeoPlace | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "needs-location">("loading");
  const [unit] = useTempUnit();

  useEffect(() => {
    const saved = loadSavedPlace();
    if (saved) { void load(saved); return; }
    if (!("geolocation" in navigator)) { setStatus("needs-location"); return; }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const label = await reverseLabel(pos.coords.latitude, pos.coords.longitude);
          const p = { name: label, lat: pos.coords.latitude, lon: pos.coords.longitude };
          savePlace(p);
          await load(p);
        } catch { setStatus("needs-location"); }
      },
      () => setStatus("needs-location"),
      { timeout: 6000, maximumAge: 5 * 60 * 1000 },
    );
  }, []);

  async function load(p: GeoPlace) {
    setStatus("loading"); setPlace(p);
    try {
      const url = new URL("https://api.open-meteo.com/v1/forecast");
      url.searchParams.set("latitude", String(p.lat));
      url.searchParams.set("longitude", String(p.lon));
      url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max");
      url.searchParams.set("timezone", "auto");
      url.searchParams.set("forecast_days", "7");
      const res = await fetch(url.toString());
      const data = await res.json();
      const times: string[] = data?.daily?.time ?? [];
      const out: DailyForecast[] = times.map((t, i) => {
        const code = data.daily.weather_code[i];
        const m = mapWmoCode(code);
        return {
          date: t,
          highC: Math.round(data.daily.temperature_2m_max[i]),
          lowC: Math.round(data.daily.temperature_2m_min[i]),
          condition: m.condition,
          label: m.label,
          precip: Math.round(data.daily.precipitation_probability_max[i] ?? 0),
        };
      });
      setDays(out);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }

  const fmt = (c: number) => `${unit === "F" ? cToF(c) : c}°`;

  return (
    <section className="cozy-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">7-day forecast</div>
          {place && (
            <div className="mt-0.5 flex items-center gap-1 text-sm font-medium">
              <MapPin className="h-3 w-3 text-muted-foreground" /> {place.name}
            </div>
          )}
        </div>
      </div>
      {status === "loading" && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading week…</div>
      )}
      {status === "needs-location" && (
        <p className="text-sm text-muted-foreground">Allow location or set a place in the daily weather widget to see the week.</p>
      )}
      {status === "error" && (
        <p className="text-sm text-muted-foreground">Couldn't load the forecast.</p>
      )}
      {days && (
        <div className="grid grid-cols-7 gap-1.5">
          {days.map(d => (
            <div key={d.date} className="flex flex-col items-center gap-1 rounded-xl bg-muted/40 p-2 text-center">
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{format(parseISO(d.date), "EEE")}</div>
              <CondIcon c={d.condition} className="text-secondary-foreground" />
              <div className="text-xs font-semibold tabular-nums">{fmt(d.highC)}</div>
              <div className="text-[10px] tabular-nums text-muted-foreground">{fmt(d.lowC)}</div>
              {d.precip > 20 && <div className="text-[9px] text-primary">{d.precip}%</div>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}