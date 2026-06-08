/**
 * Weather data layer — Open-Meteo (no API key).
 * Adapted from the Lunar Life app, slimmed for CareFlow Planner.
 */

export type WeatherCondition =
  | "clear" | "partly-cloudy" | "cloudy" | "fog"
  | "drizzle" | "rain" | "snow" | "thunderstorm";

export type DayPartKey = "Morning" | "Afternoon" | "Evening" | "Late Night";

export interface HourlyForecast {
  dateObj: Date;
  hour: number;
  tempC: number;
  code: number;
  condition: WeatherCondition;
  conditionLabel: string;
  isNight: boolean;
  precipChance: number;
}

export interface DayPartForecast {
  part: DayPartKey;
  avgTempC: number;
  highC: number;
  lowC: number;
  condition: WeatherCondition;
  conditionLabel: string;
  precipChance: number;
  isNight: boolean;
}

export interface DailyForecast {
  date: string;       // YYYY-MM-DD
  dateObj: Date;
  highC: number;
  lowC: number;
  code: number;
  condition: WeatherCondition;
  conditionLabel: string;
  precipChance: number;
}

export interface WeatherSnapshot {
  locationLabel: string;
  lat: number;
  lon: number;
  tempC: number;
  highC: number;
  lowC: number;
  code: number;
  condition: WeatherCondition;
  conditionLabel: string;
  isNight: boolean;
  fetchedAt: string;
  todayHourly: HourlyForecast[];
  dayParts: DayPartForecast[];
  windMaxKph: number;
  daily: DailyForecast[];
}

export interface GeoPlace {
  name: string;
  country?: string;
  countryCode?: string;
  admin1?: string;
  lat: number;
  lon: number;
  timezone?: string;
}

export function mapWmoCode(code: number): { condition: WeatherCondition; label: string } {
  if (code === 0) return { condition: "clear", label: "Clear sky" };
  if (code === 1) return { condition: "clear", label: "Mostly clear" };
  if (code === 2) return { condition: "partly-cloudy", label: "Partly cloudy" };
  if (code === 3) return { condition: "cloudy", label: "Overcast" };
  if (code === 45 || code === 48) return { condition: "fog", label: "Fog" };
  if (code >= 51 && code <= 57) return { condition: "drizzle", label: "Drizzle" };
  if (code >= 61 && code <= 67) return { condition: "rain", label: "Rain" };
  if (code >= 71 && code <= 77) return { condition: "snow", label: "Snow" };
  if (code >= 80 && code <= 82) return { condition: "rain", label: "Rain showers" };
  if (code === 85 || code === 86) return { condition: "snow", label: "Snow showers" };
  if (code >= 95 && code <= 99) return { condition: "thunderstorm", label: "Thunderstorm" };
  return { condition: "cloudy", label: "Cloudy" };
}

/** Hour ranges for day parts. */
const PART_RANGES: { part: DayPartKey; from: number; to: number }[] = [
  { part: "Morning",    from: 6,  to: 12 },
  { part: "Afternoon",  from: 12, to: 17 },
  { part: "Evening",    from: 17, to: 21 },
  { part: "Late Night", from: 21, to: 30 }, // wraps past midnight
];

function bucketHourly(hours: HourlyForecast[]): DayPartForecast[] {
  return PART_RANGES.map(({ part, from, to }) => {
    const inRange = hours.filter(h => {
      if (part === "Late Night") return h.hour >= 21 || h.hour < 6;
      return h.hour >= from && h.hour < to;
    });
    if (inRange.length === 0) {
      return { part, avgTempC: 0, highC: 0, lowC: 0, condition: "cloudy", conditionLabel: "—", precipChance: 0, isNight: part === "Late Night" };
    }
    const temps = inRange.map(h => h.tempC);
    const avg = Math.round(temps.reduce((a,b)=>a+b,0) / temps.length);
    const high = Math.max(...temps);
    const low = Math.min(...temps);
    // pick worst (most "weathery") condition: prioritize storms > snow > rain > drizzle > fog > cloudy > partly > clear
    const RANK: WeatherCondition[] = ["clear","partly-cloudy","cloudy","fog","drizzle","rain","snow","thunderstorm"];
    const worst = inRange.reduce((acc, h) => RANK.indexOf(h.condition) > RANK.indexOf(acc.condition) ? h : acc, inRange[0]);
    const precip = Math.max(...inRange.map(h => h.precipChance));
    return {
      part,
      avgTempC: avg,
      highC: high,
      lowC: low,
      condition: worst.condition,
      conditionLabel: worst.conditionLabel,
      precipChance: precip,
      isNight: part === "Late Night" || part === "Evening" ? true : worst.isNight,
    };
  });
}

export async function fetchWeather(lat: number, lon: number, locationLabel: string): Promise<WeatherSnapshot> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set("current", "temperature_2m,weather_code,is_day");
  url.searchParams.set("hourly", "temperature_2m,weather_code,is_day,precipitation_probability");
  url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min,weather_code,wind_speed_10m_max,precipitation_probability_max");
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("forecast_days", "5");

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Weather request failed (${res.status})`);
  const data = await res.json();

  const code: number = data?.current?.weather_code ?? 3;
  const { condition, label } = mapWmoCode(code);

  const times: string[] = data?.hourly?.time ?? [];
  const temps: number[] = data?.hourly?.temperature_2m ?? [];
  const codes: number[] = data?.hourly?.weather_code ?? [];
  const isDay: number[] = data?.hourly?.is_day ?? [];
  const precip: number[] = data?.hourly?.precipitation_probability ?? [];

  const todayStr = (data?.daily?.time ?? [])[0] as string | undefined;
  const todayHourly: HourlyForecast[] = [];
  for (let i = 0; i < times.length; i++) {
    const [datePart, timePart] = times[i].split("T");
    if (todayStr && datePart !== todayStr) continue;
    const [yy, mm, dd] = datePart.split("-").map(n => parseInt(n, 10));
    const hour = parseInt((timePart ?? "00:00").split(":")[0], 10);
    const c = codes[i] ?? 3;
    const m = mapWmoCode(c);
    todayHourly.push({
      dateObj: new Date(yy, (mm ?? 1) - 1, dd ?? 1, hour),
      hour,
      tempC: Math.round(temps[i] ?? 0),
      code: c,
      condition: m.condition,
      conditionLabel: m.label,
      isNight: isDay[i] === 0,
      precipChance: Math.round(precip[i] ?? 0),
    });
  }

  const dayParts = bucketHourly(todayHourly);

  const dTimes: string[] = data?.daily?.time ?? [];
  const dMax: number[] = data?.daily?.temperature_2m_max ?? [];
  const dMin: number[] = data?.daily?.temperature_2m_min ?? [];
  const dCodes: number[] = data?.daily?.weather_code ?? [];
  const dPrecip: number[] = data?.daily?.precipitation_probability_max ?? [];
  const daily: DailyForecast[] = dTimes.map((d, i) => {
    const [yy, mm, dd] = d.split("-").map(n => parseInt(n, 10));
    const m = mapWmoCode(dCodes[i] ?? 3);
    return {
      date: d,
      dateObj: new Date(yy, (mm ?? 1) - 1, dd ?? 1),
      highC: Math.round(dMax[i] ?? 0),
      lowC: Math.round(dMin[i] ?? 0),
      code: dCodes[i] ?? 3,
      condition: m.condition,
      conditionLabel: m.label,
      precipChance: Math.round(dPrecip[i] ?? 0),
    };
  });

  return {
    locationLabel,
    lat: Math.round(lat * 100) / 100,
    lon: Math.round(lon * 100) / 100,
    tempC: Math.round(data?.current?.temperature_2m ?? 0),
    highC: Math.round(data?.daily?.temperature_2m_max?.[0] ?? 0),
    lowC: Math.round(data?.daily?.temperature_2m_min?.[0] ?? 0),
    code,
    condition,
    conditionLabel: label,
    isNight: data?.current?.is_day === 0,
    fetchedAt: new Date().toISOString(),
    todayHourly,
    dayParts,
    windMaxKph: Math.round(data?.daily?.wind_speed_10m_max?.[0] ?? 0),
    daily,
  };
}

export async function geocodeCity(query: string): Promise<GeoPlace[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", trimmed);
  url.searchParams.set("count", "5");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Geocoding failed (${res.status})`);
  const data = await res.json();
  return ((data?.results ?? []) as any[]).map(r => ({
    name: r.name, country: r.country, countryCode: r.country_code, admin1: r.admin1,
    lat: r.latitude, lon: r.longitude, timezone: r.timezone,
  }));
}

export async function reverseLabel(lat: number, lon: number): Promise<string> {
  try {
    const url = new URL("https://geocoding-api.open-meteo.com/v1/reverse");
    url.searchParams.set("latitude", String(lat));
    url.searchParams.set("longitude", String(lon));
    url.searchParams.set("count", "1");
    url.searchParams.set("language", "en");
    url.searchParams.set("format", "json");
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error("reverse failed");
    const data = await res.json();
    const r = data?.results?.[0];
    if (!r) return "Your location";
    return [r.name, r.country_code].filter(Boolean).join(", ");
  } catch {
    return "Your location";
  }
}

const STORE_KEY = "careflow:weather:place";
export function loadSavedPlace(): GeoPlace | null {
  try { const raw = localStorage.getItem(STORE_KEY); return raw ? JSON.parse(raw) as GeoPlace : null; } catch { return null; }
}
export function savePlace(p: GeoPlace) { try { localStorage.setItem(STORE_KEY, JSON.stringify(p)); } catch {} }

export function weatherNudge(snap: WeatherSnapshot): string {
  const { condition, isNight, tempC } = snap;
  if (condition === "thunderstorm") return "Storms outside — stay cozy and small inside.";
  if (condition === "snow") return "A hush is falling. Wrap warm and slow your pace.";
  if (condition === "rain") return "Rainy day — light a candle, let one task wait.";
  if (condition === "drizzle") return "Soft rain. A warm drink and a long breath.";
  if (condition === "fog") return "Move gently, look close.";
  if (condition === "cloudy") return "Soft grey light — do less than you think.";
  if (condition === "partly-cloudy") return "Sun and shade — let energy come and go.";
  if (condition === "clear") {
    if (isNight) return "A clear sky tonight — one breath under the moon.";
    if (tempC >= 28) return "Bright and warm — drink water before screens.";
    return "Clear skies — a few minutes of sunlight will land.";
  }
  return "Whatever the sky is doing, you can do less than you think.";
}