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
    const { data: { user }, error: authError } = await client.auth.getUser(authorization.slice(7));
    if (authError || !user) return reply(401, { message: "Invalid authentication" });

    let body: any;
    try { body = await req.json(); } catch { return reply(400, { message: "Invalid JSON" }); }
    const path = body?.path;
    const file = typeof path === "string" ? path.split("/") : [];
    if (typeof path !== "string" || path.length > 200 || file.length !== 2 || file[0] !== user.id
      || !/^[a-zA-Z0-9_-]+\.(webm|mp4|ogg|wav|mp3|m4a)$/.test(file[1])) {
      return reply(403, { message: "You can't access this recording" });
    }

    const { data: audio, error: dlErr } = await client.storage.from("note-audio").download(path);
    if (dlErr || !audio) return reply(404, { message: "Recording not found" });
    if (!audio.size) return reply(400, { message: "The recording is empty" });
    if (audio.size > 24 * 1024 * 1024) return reply(413, { message: "The recording is too large" });

    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return reply(500, { message: "Transcription is not configured" });

    const form = new FormData();
    form.append("file", audio, file[1]);
    form.append("model", "openai/gpt-transcribe");
    form.append("response_format", "json");
    const upstream = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
      method: "POST", headers: { Authorization: `Bearer ${key}` }, body: form,
    });
    const raw = await upstream.text();
    let result: any = null;
    try { result = JSON.parse(raw); } catch { /* noop */ }
    if (!upstream.ok) {
      const message = upstream.status === 402 ? "AI credits have run out. Add credits to keep transcribing."
        : upstream.status === 429 ? "Too many requests right now — please try again in a minute."
        : result?.error?.message || result?.message || `Transcription failed (${upstream.status})`;
      return reply(upstream.status, { message });
    }
    if (typeof result?.text !== "string") return reply(502, { message: "Invalid transcription response" });
    await client.from("voice_memos").update({ transcript: result.text, transcript_edited: false }).eq("path", path);
    return reply(200, { text: result.text });
  } catch (e) {
    console.error("transcribe-voice-memo failed", e);
    return reply(500, { message: "Unable to transcribe this recording" });
  }
});
