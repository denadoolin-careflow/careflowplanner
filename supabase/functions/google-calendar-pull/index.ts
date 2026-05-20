import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";
import { authedUserId, getValidAccessToken } from "../_shared/google-token.ts";

/**
 * Pulls events from each enabled Google calendar into CareFlow appointments.
 * Uses syncToken (Google Calendar incremental sync) where available.
 *
 * Auth modes:
 *  - If called with a user bearer token: pulls for that user.
 *  - If called with the SUPABASE_SERVICE_ROLE_KEY in the Authorization header
 *    (cron / server-to-server) and no `user_id` query param, pulls for every
 *    connected user.
 *  - Or `?user_id=<uuid>` with service-role to pull for a specific user.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const url = new URL(req.url);
    const serviceRoleHeader = req.headers.get("Authorization") === `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`;

    let targetUsers: string[] = [];
    if (serviceRoleHeader) {
      const explicit = url.searchParams.get("user_id");
      if (explicit) targetUsers = [explicit];
      else {
        const { data } = await supa.from("google_calendar_tokens").select("user_id");
        targetUsers = (data ?? []).map((r: any) => r.user_id);
      }
    } else {
      const uid = await authedUserId(req);
      if (!uid) return json({ error: "Unauthorized" }, 401);
      targetUsers = [uid];
    }

    const results: Record<string, unknown> = {};
    for (const uid of targetUsers) {
      try { results[uid] = await pullForUser(supa, uid); }
      catch (e) { results[uid] = { error: String(e) }; }
    }
    return json({ ok: true, users: results });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

async function pullForUser(supa: ReturnType<typeof createClient>, uid: string) {
  const token = await getValidAccessToken(uid);
  if (!token) return { skipped: "not_connected" };

  const { data: enabled } = await supa
    .from("google_calendar_selected").select("*").eq("user_id", uid).eq("enabled", true);
  const cals = enabled ?? [];
  if (cals.length === 0) return { skipped: "no_calendars" };

  const out: Record<string, { upserted: number; deleted: number; reset?: boolean }> = {};
  for (const c of cals) {
    out[c.calendar_id] = await pullCalendar(supa, uid, token, c.calendar_id);
  }
  return out;
}

async function pullCalendar(
  supa: ReturnType<typeof createClient>, uid: string, token: string, calendarId: string,
) {
  let upserted = 0, deleted = 0, reset = false;

  const { data: state } = await supa
    .from("google_calendar_sync_state").select("*")
    .eq("user_id", uid).eq("calendar_id", calendarId).maybeSingle();

  let syncToken: string | null = state?.sync_token ?? null;
  let pageToken: string | null = null;
  let nextSyncToken: string | null = null;

  // Reasonable initial window so first sync doesn't pull years of history.
  const initialTimeMin = new Date(Date.now() - 30 * 86400000).toISOString();
  const initialTimeMax = new Date(Date.now() + 180 * 86400000).toISOString();

  for (let i = 0; i < 25; i++) { // safety cap on pagination
    const u = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`);
    u.searchParams.set("singleEvents", "true");
    u.searchParams.set("maxResults", "250");
    if (syncToken) {
      u.searchParams.set("syncToken", syncToken);
    } else {
      u.searchParams.set("timeMin", initialTimeMin);
      u.searchParams.set("timeMax", initialTimeMax);
      u.searchParams.set("orderBy", "startTime");
    }
    if (pageToken) u.searchParams.set("pageToken", pageToken);

    const r = await fetch(u, { headers: { Authorization: `Bearer ${token}` } });
    if (r.status === 410) {
      // syncToken invalidated — fall back to initial sync next iteration.
      syncToken = null; pageToken = null; reset = true;
      continue;
    }
    if (!r.ok) {
      const txt = await r.text();
      throw new Error(`events.list ${calendarId} [${r.status}]: ${txt}`);
    }
    const d = await r.json();

    for (const ev of (d.items ?? []) as any[]) {
      const isDeleted = ev.status === "cancelled";
      if (isDeleted) {
        const { error } = await supa.from("appointments")
          .delete()
          .eq("user_id", uid)
          .eq("google_calendar_id", calendarId)
          .eq("google_event_id", ev.id);
        if (!error) deleted++;
        continue;
      }
      const startStr = ev.start?.dateTime ?? ev.start?.date;
      if (!startStr) continue;
      const allDay = !ev.start?.dateTime;
      const date = startStr.slice(0, 10);
      const time = ev.start?.dateTime ? new Date(ev.start.dateTime).toISOString().slice(11, 16) : null;
      const endTime = ev.end?.dateTime ? new Date(ev.end.dateTime).toISOString().slice(11, 16) : null;
      const row = {
        user_id: uid,
        title: ev.summary ?? "(no title)",
        date,
        time,
        end_time: endTime,
        all_day: allDay,
        location: ev.location ?? null,
        notes: ev.description ?? null,
        type: "other",
        google_event_id: ev.id,
        google_calendar_id: calendarId,
        google_last_synced_at: new Date().toISOString(),
        sync_to_google: true, // mark as already-in-sync so subsequent edits push back
      };
      const { error } = await supa.from("appointments").upsert(row, {
        onConflict: "user_id,google_calendar_id,google_event_id",
      });
      if (!error) upserted++;
    }

    pageToken = d.nextPageToken ?? null;
    if (d.nextSyncToken) nextSyncToken = d.nextSyncToken;
    if (!pageToken) break;
  }

  await supa.from("google_calendar_sync_state").upsert({
    user_id: uid, calendar_id: calendarId,
    sync_token: nextSyncToken ?? syncToken,
    last_pulled_at: new Date().toISOString(),
  }, { onConflict: "user_id,calendar_id" });

  return { upserted, deleted, reset };
}

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}