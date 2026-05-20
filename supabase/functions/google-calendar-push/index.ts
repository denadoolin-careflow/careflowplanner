import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";
import { authedUserId, getValidAccessToken } from "../_shared/google-token.ts";

/**
 * Pushes a single CareFlow appointment to Google Calendar.
 *
 * Body: { appointment_id: string, action: "upsert" | "delete" }
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const uid = await authedUserId(req);
    if (!uid) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const appointment_id = String(body?.appointment_id ?? "");
    const action = body?.action === "delete" ? "delete" : "upsert";
    if (!appointment_id) return json({ error: "appointment_id required" }, 400);

    const token = await getValidAccessToken(uid);
    if (!token) return json({ error: "Google Calendar not connected" }, 412);

    const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Load the appointment (must belong to user).
    const { data: appt, error: apptErr } = await supa
      .from("appointments").select("*")
      .eq("id", appointment_id).eq("user_id", uid).maybeSingle();
    if (apptErr) return json({ error: apptErr.message }, 500);
    if (!appt && action !== "delete") return json({ error: "Appointment not found" }, 404);

    // Resolve the calendar we write into.
    const { data: tokRow } = await supa
      .from("google_calendar_tokens").select("write_calendar_id").eq("user_id", uid).maybeSingle();
    const writeCal = (appt?.google_calendar_id || tokRow?.write_calendar_id || "primary") as string;

    // DELETE flow
    if (action === "delete") {
      if (!appt?.google_event_id) return json({ ok: true, skipped: "no_event_id" });
      const delUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(appt.google_calendar_id || writeCal)}/events/${encodeURIComponent(appt.google_event_id)}`;
      const r = await fetch(delUrl, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok && r.status !== 404 && r.status !== 410) {
        const txt = await r.text();
        return json({ error: `Google delete failed [${r.status}]: ${txt}` }, 502);
      }
      return json({ ok: true });
    }

    // UPSERT flow
    const eventBody = buildEventBody(appt!);
    let url: string;
    let method: "POST" | "PATCH";
    if (appt!.google_event_id) {
      url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(appt!.google_calendar_id || writeCal)}/events/${encodeURIComponent(appt!.google_event_id)}`;
      method = "PATCH";
    } else {
      url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(writeCal)}/events`;
      method = "POST";
    }
    const r = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(eventBody),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return json({ error: `Google upsert failed [${r.status}]: ${JSON.stringify(data)}` }, 502);

    await supa.from("appointments").update({
      google_event_id: data.id,
      google_calendar_id: appt!.google_calendar_id || writeCal,
      google_last_synced_at: new Date().toISOString(),
    }).eq("id", appointment_id);

    return json({ ok: true, event_id: data.id });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function buildEventBody(appt: Record<string, unknown>): Record<string, unknown> {
  const date = String(appt.date);
  const time = appt.time ? String(appt.time) : null;
  const endTime = appt.end_time ? String(appt.end_time) : null;
  const allDay = !!appt.all_day || !time;

  const summary = String(appt.title ?? "(no title)");
  const location = appt.location ? String(appt.location) : undefined;
  const description = appt.notes ? String(appt.notes) : undefined;

  if (allDay) {
    // Google all-day end date is exclusive — add one day if no end given.
    const start = date;
    const end = (() => {
      if (endTime) return date; // fallback
      const d = new Date(date + "T00:00:00Z");
      d.setUTCDate(d.getUTCDate() + 1);
      return d.toISOString().slice(0, 10);
    })();
    return { summary, location, description, start: { date: start }, end: { date: end } };
  }

  // Timed event — assume local time and let Google interpret via timeZone.
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const startISO = `${date}T${time}:00`;
  const endISO = endTime ? `${date}T${endTime}:00` : (() => {
    // default 60min duration
    const [h, m] = time!.split(":").map(Number);
    const end = new Date(Date.UTC(2000, 0, 1, h, m));
    end.setUTCHours(end.getUTCHours() + 1);
    const eh = String(end.getUTCHours()).padStart(2, "0");
    const em = String(end.getUTCMinutes()).padStart(2, "0");
    return `${date}T${eh}:${em}:00`;
  })();
  return {
    summary, location, description,
    start: { dateTime: startISO, timeZone: tz },
    end: { dateTime: endISO, timeZone: tz },
  };
}

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}