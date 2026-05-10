import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";
import { authedUserId } from "../_shared/google-token.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const uid = await authedUserId(req);
  if (!uid) return json({ error: "Unauthorized" }, 401);

  const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: row } = await supa.from("google_calendar_tokens").select("refresh_token,access_token").eq("user_id", uid).maybeSingle();
  if (row?.refresh_token) {
    try {
      await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(row.refresh_token)}`, { method: "POST" });
    } catch (_) { /* ignore */ }
  }
  await supa.from("google_calendar_tokens").delete().eq("user_id", uid);
  await supa.from("google_calendar_selected").delete().eq("user_id", uid);
  return json({ ok: true });
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}