import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { authedUserId, startAppUserOAuth } from "../_shared/app-user-connector.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const userId = await authedUserId(req);
    if (!userId) return json({ error: "Unauthorized" }, 401);

    const { return_url } = await req.json().catch(() => ({ return_url: "" }));
    if (typeof return_url !== "string" || !/^https?:\/\//.test(return_url)) {
      return json({ error: "A valid return_url is required" }, 400);
    }

    const { authorization_url } = await startAppUserOAuth(userId, return_url);
    return json({ url: authorization_url });
  } catch (e) {
    console.error("gmail-connect failed:", e);
    return json({ error: String(e) }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
