import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { admin, authedUserId, callAsAppUser, CONNECTOR_ID, getConnectionKey } from "../_shared/app-user-connector.ts";

const MAX_MESSAGES = 25;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const userId = await authedUserId(req);
    if (!userId) return json({ error: "Unauthorized" }, 401);

    const key = await getConnectionKey(userId);
    if (!key) return json({ connected: false, imported: 0 });

    const list = await callAsAppUser(
      key,
      `/gmail/v1/users/me/messages?maxResults=${MAX_MESSAGES}&q=${encodeURIComponent("is:starred")}`,
    );
    const ids: string[] = (list?.messages ?? []).map((m: { id: string }) => m.id);

    const db = admin();
    let known: string[] = [];
    if (ids.length) {
      const { data } = await db.from("gmail_task_links").select("message_id").eq("user_id", userId).in("message_id", ids);
      known = (data ?? []).map((r: { message_id: string }) => r.message_id);
    }
    const fresh = ids.filter((id) => !known.includes(id));

    let imported = 0;
    for (const id of fresh) {
      try {
        const msg = await callAsAppUser(
          key,
          `/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
        );
        const headers: { name: string; value: string }[] = msg?.payload?.headers ?? [];
        const h = (n: string) => headers.find((x) => x.name.toLowerCase() === n.toLowerCase())?.value ?? "";
        const subject = h("Subject") || "(no subject)";
        const from = h("From");
        const snippet = (msg?.snippet ?? "").replace(/&#39;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"');
        const link = `https://mail.google.com/mail/u/0/#all/${id}`;
        const notes = [from ? `From: ${from}` : "", snippet, `\n${link}`].filter(Boolean).join("\n\n");

        const { data: task, error } = await db.from("tasks").insert({
          user_id: userId,
          title: subject.slice(0, 300),
          notes,
          inbox: true,
          area: "Personal",
          tags: ["email"],
        }).select("id").single();
        if (error) throw error;

        await db.from("gmail_task_links").insert({ user_id: userId, message_id: id, task_id: task.id });
        imported++;
      } catch (e) {
        console.error(`Failed importing message ${id}:`, e);
      }
    }

    await db.from("app_user_connections")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("user_id", userId).eq("connector_id", CONNECTOR_ID);

    return json({ connected: true, imported, scanned: ids.length });
  } catch (e) {
    console.error("gmail-sync-starred failed:", e);
    return json({ error: String(e) }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
