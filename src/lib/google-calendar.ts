import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface GCalCalendar {
  id: string;
  summary: string;
  color?: string;
  primary?: boolean;
  enabled: boolean;
}

export interface GCalEvent {
  id: string;
  calendar_id: string;
  calendar_name?: string;
  color?: string;
  title: string;
  location?: string | null;
  date: string;
  time?: string | null;
  allDay: boolean;
  start: string;
  end?: string;
  htmlLink?: string;
}

export async function gcalConnect(): Promise<string> {
  const { data, error } = await supabase.functions.invoke("google-calendar-connect", {
    body: { redirect_back: window.location.href },
  });
  if (error) throw error;
  return (data as { url: string }).url;
}

export interface GCalSettings {
  connected: boolean;
  calendars: GCalCalendar[];
  scope?: string;
  writeCalendarId?: string;
  /** True when the granted scope only allows reading — two-way sync needs reconnect. */
  readOnly?: boolean;
}
export async function gcalListCalendars(): Promise<GCalSettings> {
  const { data, error } = await supabase.functions.invoke("google-calendar-calendars", { method: "GET" });
  if (error) throw error;
  const d = data as any;
  const scope: string | undefined = d?.scope;
  const readOnly = !!scope && !scope.includes("calendar.events");
  return {
    connected: !!d?.connected,
    calendars: d?.calendars ?? [],
    scope, writeCalendarId: d?.write_calendar_id, readOnly,
  };
}

export async function gcalSaveSelections(
  selections: Array<Pick<GCalCalendar, "id" | "summary" | "color" | "enabled">>,
  writeCalendarId?: string,
) {
  const payload: Record<string, unknown> = {
    selections: selections.map(s => ({ calendar_id: s.id, summary: s.summary, color: s.color, enabled: s.enabled })),
  };
  if (writeCalendarId) payload.write_calendar_id = writeCalendarId;
  const { error } = await supabase.functions.invoke("google-calendar-calendars", { body: payload });
  if (error) throw error;
}

export async function gcalPullNow() {
  await supabase.functions.invoke("google-calendar-pull", { body: {} });
}

export async function gcalFetchEvents(timeMin?: string, timeMax?: string): Promise<{ connected: boolean; events: GCalEvent[] }> {
  const params = new URLSearchParams();
  if (timeMin) params.set("timeMin", timeMin);
  if (timeMax) params.set("timeMax", timeMax);
  const path = `google-calendar-events${params.toString() ? `?${params}` : ""}`;
  const { data, error } = await supabase.functions.invoke(path, { method: "GET" });
  if (error) throw error;
  return data as { connected: boolean; events: GCalEvent[] };
}

export async function gcalDisconnect() {
  const { error } = await supabase.functions.invoke("google-calendar-disconnect", { body: {} });
  if (error) throw error;
}

/**
 * Subscribe to Google Calendar events for a time window. Auto-refreshes on
 * tab focus and every `pollMs` (default 5min) while the tab is visible. Pass
 * `enabled = false` to pause (e.g. user navigated away).
 */
export function useGCalEvents(
  timeMin?: string, timeMax?: string,
  opts: { enabled?: boolean; pollMs?: number } = {},
) {
  const { enabled = true, pollMs = 5 * 60 * 1000 } = opts;
  const [events, setEvents] = useState<GCalEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const inflight = useRef(false);

  const refresh = useCallback(async () => {
    if (inflight.current) return;
    inflight.current = true;
    try {
      const r = await gcalFetchEvents(timeMin, timeMax);
      setConnected(r.connected);
      setEvents(r.events ?? []);
    } catch { /* ignore — keep last good state */ }
    finally { inflight.current = false; }
  }, [timeMin, timeMax]);

  useEffect(() => {
    if (!enabled) return;
    refresh();
    const onFocus = () => { if (document.visibilityState === "visible") refresh(); };
    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener("focus", onFocus);
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, pollMs);
    const onLocal = () => refresh();
    window.addEventListener("gcal:refresh", onLocal);
    return () => {
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("gcal:refresh", onLocal);
      window.clearInterval(id);
    };
  }, [enabled, refresh, pollMs]);

  return { events, connected, refresh };
}

/** Trigger any mounted `useGCalEvents` instances to refetch immediately. */
export function gcalNotifyChange() {
  window.dispatchEvent(new CustomEvent("gcal:refresh"));
}