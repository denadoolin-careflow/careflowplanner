import { useCallback, useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { getWeatherSnapshot } from "./weather-store";
import { moonPhaseFor } from "./moon-phase";
import { getIllumination } from "./moon";

/** Placeholders the daily-note template understands. */
export const DAILY_NOTE_PLACEHOLDERS = [
  "{{date}}", "{{weekday}}", "{{weather}}", "{{moon}}", "{{illumination}}", "{{cycle}}",
] as const;

export const DEFAULT_DAILY_NOTE_TEMPLATE = [
  "# {{date}}",
  "",
  "**Mood:** ",
  "**Weather:** {{weather}}",
  "**Moon phase:** {{moon}} · {{illumination}}% lit",
  "",
  "## Journal",
  "",
  "",
  "## Wins",
  "- ",
  "",
  "## Gratitude",
  "- ",
  "",
  "## Tasks",
  "- [ ] ",
  "",
].join("\n");

const TEMPLATE_KEY = "careflow:notes:daily-template";

export function readDailyNoteTemplate(): string {
  if (typeof window === "undefined") return DEFAULT_DAILY_NOTE_TEMPLATE;
  try {
    const raw = window.localStorage.getItem(TEMPLATE_KEY);
    return raw && raw.trim() ? raw : DEFAULT_DAILY_NOTE_TEMPLATE;
  } catch { return DEFAULT_DAILY_NOTE_TEMPLATE; }
}

export function saveDailyNoteTemplate(body: string) {
  try {
    if (!body.trim()) window.localStorage.removeItem(TEMPLATE_KEY);
    else window.localStorage.setItem(TEMPLATE_KEY, body);
    window.dispatchEvent(new CustomEvent("careflow:daily-template-changed"));
  } catch { /* noop */ }
}

/** Reactive access to the stored daily-note template. */
export function useDailyNoteTemplate(): [string, (body: string) => void, () => void] {
  const [tpl, setTpl] = useState<string>(readDailyNoteTemplate);
  useEffect(() => {
    const sync = () => setTpl(readDailyNoteTemplate());
    window.addEventListener("careflow:daily-template-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("careflow:daily-template-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  const save = useCallback((body: string) => { saveDailyNoteTemplate(body); setTpl(readDailyNoteTemplate()); }, []);
  const reset = useCallback(() => { saveDailyNoteTemplate(""); setTpl(DEFAULT_DAILY_NOTE_TEMPLATE); }, []);
  return [tpl, save, reset];
}

/** Fill a template's placeholders for a given day. */
export function renderDailyNoteTemplate(
  dateISO: string,
  template: string = readDailyNoteTemplate(),
  extras?: { cycle?: string },
): string {
  let date: Date;
  try { date = parseISO(dateISO); } catch { date = new Date(); }

  const w = getWeatherSnapshot();
  const weather = w && w.conditionLabel !== "—"
    ? `${w.conditionLabel} · ${Math.round(w.tempC)}°C · ${w.locationLabel}`
    : "";
  const m = moonPhaseFor(date);

  const map: Record<string, string> = {
    "{{date}}": format(date, "EEEE, MMMM d, yyyy"),
    "{{weekday}}": format(date, "EEEE"),
    "{{weather}}": weather,
    "{{moon}}": m ? `${m.emoji} ${m.label}` : "",
    "{{illumination}}": String(getIllumination(date)),
    "{{cycle}}": extras?.cycle ?? "",
  };
  return Object.entries(map).reduce(
    (out, [token, value]) => out.split(token).join(value),
    template,
  );
}

/**
 * Build the structured Daily Note skeleton from the user's saved template,
 * auto-filling weather + moon phase when those snapshots are available.
 */
export function buildDailyNoteTemplate(dateISO: string): string {
  return renderDailyNoteTemplate(dateISO);
}

/** True when a note body is empty / placeholder. */
export function isEmptyBody(body: string | null | undefined): boolean {
  return !body || !body.trim();
}