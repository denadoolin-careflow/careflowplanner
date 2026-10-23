import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

const headers = { ...corsHeaders, "Access-Control-Allow-Methods": "POST, OPTIONS", "Content-Type": "application/json" };
const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers });
  if (req.method !== "POST") return reply(405, { message: "Method not allowed" });
  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) return reply(401, { message: "Authentication required" });
    const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authorization } }, auth: { persistSession: false },
    });
    const { data: { user } } = await client.auth.getUser(authorization.slice(7));
    if (!user) return reply(401, { message: "Invalid authentication" });

    let body: any;
    try { body = await req.json(); } catch { return reply(400, { message: "Invalid JSON" }); }
    const id = body?.id;
    if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) return reply(400, { message: "Invalid memo" });
    const { data: memo } = await client.from("voice_memos").select("id, transcript").eq("id", id).maybeSingle();
    if (!memo) return reply(404, { message: "Memo not found" });
    const transcript = String(body?.transcript ?? memo.transcript ?? "").slice(0, 20000).trim();
    if (!transcript) return reply(400, { message: "Transcribe the memo first" });

    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return reply(500, { message: "AI is not configured" });
    const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Summarize the user's voice memo warmly and briefly. Return 1-3 sentences, then if any, a short 'Action items:' list with '- ' bullets. Plain text only, no markdown headings." },
          { role: "user", content: transcript },
        ],
      }),
    });
    if (!upstream.ok) {
      const message = upstream.status === 402 ? "AI credits have run out. Add credits to keep summarizing."
        : upstream.status === 429 ? "Too many requests right now — please try again in a minute."
        : `Summary failed (${upstream.status})`;
      return reply(upstream.status, { message });
    }
    const json = await upstream.json();
    const summary = String(json?.choices?.[0]?.message?.content ?? "").trim();
    if (!summary) return reply(502, { message: "No summary was returned" });
    await client.from("voice_memos").update({ summary }).eq("id", id);
    return reply(200, { summary });
  } catch (e) {
    console.error("summarize-voice-memo failed", e);
    return reply(500, { message: "Unable to summarize this memo" });
  }
});
