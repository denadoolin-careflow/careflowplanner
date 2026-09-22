import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { admin, authedUserId, CONNECTOR_ID } from "../_shared/app-user-connector.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const userId = await authedUserId(req);
    if (!userId) return json({ error: "Unauthorized" }, 401);

    const { error } = await admin()
      .from("app_user_connections")
      .delete()
      .eq("user_id", userId)
      .eq("connector_id", CONNECTOR_ID);
    if (error) throw error;

    return json({ connected: false });
  } catch (e) {
    console.error("gmail-disconnect failed:", e);
    return json({ error: String(e) }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
