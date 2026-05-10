import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export async function getValidAccessToken(userId: string): Promise<string | null> {
  const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: row } = await supa.from("google_calendar_tokens").select("*").eq("user_id", userId).maybeSingle();
  if (!row) return null;
  if (new Date(row.expires_at).getTime() > Date.now() + 60_000) return row.access_token;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: Deno.env.get("GOOGLE_CALENDAR_CLIENT_ID")!,
      client_secret: Deno.env.get("GOOGLE_CALENDAR_CLIENT_SECRET")!,
      refresh_token: row.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  const tok = await res.json();
  if (!res.ok) return null;
  const expiresAt = new Date(Date.now() + (tok.expires_in ?? 3600) * 1000).toISOString();
  await supa.from("google_calendar_tokens").update({
    access_token: tok.access_token,
    expires_at: expiresAt,
    scope: tok.scope ?? row.scope,
  }).eq("user_id", userId);
  return tok.access_token;
}

export async function authedUserId(req: Request): Promise<string | null> {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const { data, error } = await supa.auth.getUser();
  if (error || !data?.user) return null;
  return data.user.id;
}