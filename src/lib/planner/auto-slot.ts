/** Place unscheduled tasks into free gaps of a day, in 15-minute steps. */
export interface Busy { start: number; end: number } // minutes from midnight
export interface SlotTask { id: string; minutes: number }

export const toMin = (hhmm: string) => { const [h, m] = hhmm.split(":").map(Number); return (h || 0) * 60 + (m || 0); };
export const toHHMM = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

export function autoSlot(
  tasks: SlotTask[], busy: Busy[],
  opts: { dayStart?: number; dayEnd?: number; notBefore?: number; gap?: number } = {},
): { id: string; startTime: string }[] {
  const dayEnd = opts.dayEnd ?? 20 * 60;
  const gap = opts.gap ?? 0;
  let earliest = Math.max(opts.dayStart ?? 8 * 60, opts.notBefore ?? 0);
  earliest = Math.ceil(earliest / 15) * 15;
  const taken = busy.map(b => ({ ...b })).sort((a, b) => a.start - b.start);
  const out: { id: string; startTime: string }[] = [];
  for (const t of tasks) {
    const len = Math.max(15, t.minutes);
    let s = earliest;
    while (s + len <= dayEnd) {
      const clash = taken.find(b => s < b.end + gap && s + len + gap > b.start);
      if (!clash) break;
      s = Math.ceil((clash.end + gap) / 15) * 15;
    }
    if (s + len > dayEnd) continue;
    taken.push({ start: s, end: s + len });
    out.push({ id: t.id, startTime: toHHMM(s) });
  }
  return out;
}
