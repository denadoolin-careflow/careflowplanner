/**
 * Local (per-device) daily wellness check-in.
 * Sleep, water, energy, medicine, movement — one snapshot per day.
 */
export interface DailyCheckIn {
  sleepHours?: number;
  waterCups?: number;
  energy?: number;      // 1-10
  medicineDone?: boolean;
  movementMinutes?: number;
  note?: string;
}

const KEY = (iso: string) => `careflow:checkin:${iso}`;

export function getCheckIn(iso: string): DailyCheckIn {
  try {
    const raw = localStorage.getItem(KEY(iso));
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export function setCheckIn(iso: string, patch: Partial<DailyCheckIn>) {
  const merged = { ...getCheckIn(iso), ...patch };
  try {
    localStorage.setItem(KEY(iso), JSON.stringify(merged));
    window.dispatchEvent(new CustomEvent("careflow:checkin", { detail: { iso } }));
  } catch {/* noop */}
  return merged;
}