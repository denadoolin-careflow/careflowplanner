import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { authedUserId, callAsAppUser, exchangeAppUserOAuthCode, saveConnectionKey } from "../_shared/app-user-connector.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const userId = await authedUserId(req);
    if (!userId) return json({ error: "Unauthorized" }, 401);

    const { code } = await req.json().catch(() => ({ code: "" }));
    if (typeof code !== "string" || code.length < 4) return json({ error: "A valid code is required" }, 400);

    const { connectionKey } = await exchangeAppUserOAuthCode(code);

    let email: string | null = null;
    try {
      const profile = await callAsAppUser(connectionKey, "/gmail/v1/users/me/profile");
      email = profile?.emailAddress ?? null;
    } catch (e) {
      console.error("profile lookup failed:", e);
    }

    await saveConnectionKey(userId, connectionKey, email);
    return json({ connected: true, email });
  } catch (e) {
    console.error("gmail-exchange failed:", e);
    return json({ error: String(e) }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
