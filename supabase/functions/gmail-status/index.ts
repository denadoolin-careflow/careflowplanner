import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { admin, authedUserId, CONNECTOR_ID } from "../_shared/app-user-connector.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const userId = await authedUserId(req);
    if (!userId) return json({ error: "Unauthorized" }, 401);

    const { data, error } = await admin()
      .from("app_user_connections")
      .select("account_email, last_synced_at, auto_sync")
      .eq("user_id", userId)
      .eq("connector_id", CONNECTOR_ID)
      .maybeSingle();
    if (error) throw error;

    if (req.method === "PATCH" || req.method === "PUT") {
      const { auto_sync } = await req.json().catch(() => ({}));
      if (typeof auto_sync === "boolean" && data) {
        await admin().from("app_user_connections")
          .update({ auto_sync, updated_at: new Date().toISOString() })
          .eq("user_id", userId).eq("connector_id", CONNECTOR_ID);
        return json({ connected: true, email: data.account_email, lastSyncedAt: data.last_synced_at, autoSync: auto_sync });
      }
    }

    return json({
      connected: !!data,
      email: data?.account_email ?? null,
      lastSyncedAt: data?.last_synced_at ?? null,
      autoSync: data?.auto_sync ?? true,
    });
  } catch (e) {
    console.error("gmail-status failed:", e);
    return json({ error: String(e) }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
