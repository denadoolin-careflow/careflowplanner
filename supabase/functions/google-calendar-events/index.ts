import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";
import { authedUserId, getValidAccessToken } from "../_shared/google-token.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const uid = await authedUserId(req);
  if (!uid) return json({ connected: false, events: [] });

  const url = new URL(req.url);
  const timeMin = url.searchParams.get("timeMin") ?? new Date(Date.now() - 7 * 86400000).toISOString();
  const timeMax = url.searchParams.get("timeMax") ?? new Date(Date.now() + 60 * 86400000).toISOString();

  const token = await getValidAccessToken(uid);
  if (!token) return json({ connected: false, events: [] });

  const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: selected } = await supa.from("google_calendar_selected").select("*").eq("user_id", uid).eq("enabled", true);
  const cals = selected ?? [];
  if (cals.length === 0) return json({ connected: true, events: [] });

  const all: any[] = [];
  await Promise.all(cals.map(async (c: any) => {
    const u = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(c.calendar_id)}/events`);
    u.searchParams.set("timeMin", timeMin);
    u.searchParams.set("timeMax", timeMax);
    u.searchParams.set("singleEvents", "true");
    u.searchParams.set("orderBy", "startTime");
    u.searchParams.set("maxResults", "250");
    const r = await fetch(u, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) return;
    const d = await r.json();
    for (const ev of d.items ?? []) {
      const startStr = ev.start?.dateTime ?? ev.start?.date;
      const endStr = ev.end?.dateTime ?? ev.end?.date;
      if (!startStr) continue;
      const allDay = !ev.start?.dateTime;
      const date = (ev.start?.dateTime ?? ev.start?.date ?? "").slice(0, 10);
      const time = ev.start?.dateTime ? new Date(ev.start.dateTime).toISOString().slice(11, 16) : null;
      all.push({
        id: ev.id,
        calendar_id: c.calendar_id,
        calendar_name: c.summary,
        color: c.color,
        title: ev.summary ?? "(no title)",
        location: ev.location ?? null,
        date, time, allDay,
        start: startStr, end: endStr,
        htmlLink: ev.htmlLink,
      });
    }
  }));

  all.sort((a, b) => (a.start ?? "").localeCompare(b.start ?? ""));
  return json({ connected: true, events: all });
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}