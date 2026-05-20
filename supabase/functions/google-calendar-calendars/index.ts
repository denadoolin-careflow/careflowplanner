import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";
import { authedUserId, getValidAccessToken } from "../_shared/google-token.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const uid = await authedUserId(req);
  if (!uid) return json({ error: "Unauthorized" }, 401);

  const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  if (req.method === "POST") {
    // bulk update selections + optional write_calendar_id:
    //   { selections: [{calendar_id, summary, color, enabled}], write_calendar_id?: string }
    const body = await req.json().catch(() => ({}));
    const selections = Array.isArray(body.selections) ? body.selections : [];
    if (selections.length) {
      const rows = selections.map((s: any) => ({
        user_id: uid,
        calendar_id: String(s.calendar_id),
        summary: s.summary ?? null,
        color: s.color ?? null,
        enabled: !!s.enabled,
      }));
      const { error } = await supa.from("google_calendar_selected").upsert(rows, { onConflict: "user_id,calendar_id" });
      if (error) return json({ error: error.message }, 500);
    }
    if (typeof body.write_calendar_id === "string" && body.write_calendar_id) {
      const { error } = await supa.from("google_calendar_tokens")
        .update({ write_calendar_id: body.write_calendar_id })
        .eq("user_id", uid);
      if (error) return json({ error: error.message }, 500);
    }
    return json({ ok: true });
  }

  const token = await getValidAccessToken(uid);
  if (!token) return json({ connected: false, calendars: [], selected: [] });

  const { data: tokRow } = await supa.from("google_calendar_tokens")
    .select("scope, write_calendar_id").eq("user_id", uid).maybeSingle();

  const res = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=reader", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) return json({ error: data.error?.message ?? "Calendar list failed" }, 500);

  const { data: selected } = await supa.from("google_calendar_selected").select("*").eq("user_id", uid);
  const selMap = new Map((selected ?? []).map((r: any) => [r.calendar_id, r.enabled]));
  const calendars = (data.items ?? []).map((c: any) => ({
    id: c.id,
    summary: c.summaryOverride ?? c.summary,
    color: c.backgroundColor,
    primary: !!c.primary,
    enabled: selMap.has(c.id) ? selMap.get(c.id) : !!c.primary,
  }));
  return json({
    connected: true,
    calendars,
    scope: tokRow?.scope ?? null,
    write_calendar_id: tokRow?.write_calendar_id ?? "primary",
  });
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}