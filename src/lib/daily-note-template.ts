import { format, parseISO } from "date-fns";
import { getWeatherSnapshot } from "./weather-store";
import { moonPhaseFor } from "./moon-phase";

/**
 * Build the structured Daily Note skeleton. Auto-fills weather + moon phase
 * when those snapshots are available; otherwise leaves the fields blank.
 */
export function buildDailyNoteTemplate(dateISO: string): string {
  let date: Date;
  try { date = parseISO(dateISO); } catch { date = new Date(); }
  const heading = format(date, "EEEE, MMMM d, yyyy");

  const w = getWeatherSnapshot();
  const weatherLine = w
    ? `${w.conditionLabel} · ${Math.round(w.tempC)}°C · ${w.locationLabel}`
    : "";

  const m = moonPhaseFor(date);
  const moonLine = m ? `${m.emoji} ${m.label}` : "";

  return [
    `# ${heading}`,
    "",
    `**Mood:** `,
    `**Weather:** ${weatherLine}`,
    `**Moon phase:** ${moonLine}`,
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
}

/** True when a note body is empty / placeholder. */
export function isEmptyBody(body: string | null | undefined): boolean {
  return !body || !body.trim();
}