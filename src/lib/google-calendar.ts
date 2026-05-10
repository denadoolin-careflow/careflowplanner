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

export async function gcalListCalendars(): Promise<{ connected: boolean; calendars: GCalCalendar[] }> {
  const { data, error } = await supabase.functions.invoke("google-calendar-calendars", { method: "GET" });
  if (error) throw error;
  return data as { connected: boolean; calendars: GCalCalendar[] };
}

export async function gcalSaveSelections(selections: Array<Pick<GCalCalendar, "id" | "summary" | "color" | "enabled">>) {
  const payload = {
    selections: selections.map(s => ({ calendar_id: s.id, summary: s.summary, color: s.color, enabled: s.enabled })),
  };
  const { error } = await supabase.functions.invoke("google-calendar-calendars", { body: payload });
  if (error) throw error;
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