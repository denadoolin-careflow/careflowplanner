import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, verifyState } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const err = url.searchParams.get("error");
  if (err) return htmlClose(`Google sign-in cancelled: ${err}`);
  if (!code || !state) return htmlClose("Missing code/state");

  const payload = await verifyState(state, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  if (!payload) return htmlClose("Invalid state");
  const { uid, rb } = JSON.parse(payload) as { uid: string; rb: string };

  const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/google-calendar-callback`;
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: Deno.env.get("GOOGLE_CALENDAR_CLIENT_ID")!,
      client_secret: Deno.env.get("GOOGLE_CALENDAR_CLIENT_SECRET")!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const tok = await tokenRes.json();
  if (!tokenRes.ok) return htmlClose(`Google token exchange failed: ${tok.error_description ?? tok.error ?? "unknown"}`);

  const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const expiresAt = new Date(Date.now() + (tok.expires_in ?? 3600) * 1000).toISOString();
  const { error: upErr } = await supa.from("google_calendar_tokens").upsert({
    user_id: uid,
    access_token: tok.access_token,
    refresh_token: tok.refresh_token,
    expires_at: expiresAt,
    scope: tok.scope ?? null,
  }, { onConflict: "user_id" });
  if (upErr) return htmlClose(`Save failed: ${upErr.message}`);

  // auto-seed primary calendar selection
  try {
    const calRes = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
      headers: { Authorization: `Bearer ${tok.access_token}` },
    });
    const calData = await calRes.json();
    if (calRes.ok && Array.isArray(calData.items)) {
      const rows = calData.items
        .filter((c: any) => c.primary)
        .map((c: any) => ({ user_id: uid, calendar_id: c.id, summary: c.summary, color: c.backgroundColor, enabled: true }));
      if (rows.length) await supa.from("google_calendar_selected").upsert(rows, { onConflict: "user_id,calendar_id" });
    }
  } catch (_) { /* best effort */ }

  const safeRb = rb && /^https?:\/\//.test(rb) ? rb : "";
  return htmlClose("Connected! You can close this window.", safeRb);
});

function htmlClose(msg: string, redirect = "") {
  const html = `<!doctype html><html><body style="font-family:system-ui;padding:24px;background:#faf6f0;color:#222"><h2>${msg}</h2><script>
    try { if (window.opener) { window.opener.postMessage({ type:'google-calendar-connected' }, '*'); } } catch(e){}
    ${redirect ? `setTimeout(() => location.href = ${JSON.stringify(redirect)}, 800);` : "setTimeout(() => window.close(), 800);"}
  </script></body></html>`;
  return new Response(html, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });
}