import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, signState } from "../_shared/cors.ts";

const SCOPES = "https://www.googleapis.com/auth/calendar.readonly";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data, error } = await supabase.auth.getClaims(auth.replace("Bearer ", ""));
    if (error || !data?.claims) return json({ error: "Unauthorized" }, 401);
    const userId = data.claims.sub as string;

    const { redirect_back } = await req.json().catch(() => ({ redirect_back: "" }));
    const clientId = Deno.env.get("GOOGLE_CALENDAR_CLIENT_ID")!;
    const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/google-calendar-callback`;
    const state = await signState(JSON.stringify({ uid: userId, rb: redirect_back || "", t: Date.now() }), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", SCOPES);
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    url.searchParams.set("include_granted_scopes", "true");
    url.searchParams.set("state", state);

    return json({ url: url.toString() });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}