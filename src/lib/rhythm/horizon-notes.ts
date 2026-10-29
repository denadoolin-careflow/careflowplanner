import { useCallback, useEffect, useState } from "react";
import { getOrCreatePeriodNote, updateNote, type Note, type PeriodKind } from "@/lib/notes";
import { HORIZON_NOTE_KIND, horizonKey, horizonTitle, readSection, upsertSection, type Horizon } from "./horizons";

/**
 * Horizon answers live in ordinary period-style notes (kind daily/weekly/monthly,
 * plus quarterly/yearly) under per-phase "## " headings.
 */
export async function getHorizonNote(horizon: Horizon, date: Date): Promise<Note> {
  const kind = HORIZON_NOTE_KIND[horizon] as PeriodKind;
  return getOrCreatePeriodNote(kind, horizonKey(horizon, date), horizonTitle(horizon, date));
}

export function useHorizonNote(horizon: Horizon, date: Date) {
  const key = horizonKey(horizon, date);
  const [note, setNote] = useState<Note | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let live = true;
    setNote(null); setError(false);
    getHorizonNote(horizon, date).then(n => live && setNote(n)).catch(() => live && setError(true));
    return () => { live = false; };
  }, [horizon, key]); // eslint-disable-line react-hooks/exhaustive-deps

  const read = useCallback((heading: string) => (note ? readSection(note.body, heading) : ""), [note]);
  const save = useCallback(async (heading: string, text: string) => {
    const n = note ?? await getHorizonNote(horizon, date);
    const body = upsertSection(n.body, heading, text);
    await updateNote(n.id, { body });
    setNote({ ...n, body });
  }, [note, horizon, date]);
  return { note, error, read, save };
}
