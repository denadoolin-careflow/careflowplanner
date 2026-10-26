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
    const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } });
    const { data: { user } } = await client.auth.getUser(authorization.slice(7));
    if (!user) return reply(401, { message: "Invalid authentication" });

    let body: any;
    try { body = await req.json(); } catch { return reply(400, { message: "Invalid JSON" }); }
    const title = String(body?.title ?? "").trim().slice(0, 300);
    const summary = String(body?.summary ?? "").trim().slice(0, 800);
    if (!title) return reply(400, { message: "Add a title first" });

    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return reply(500, { message: "AI is not configured" });
    const prompt = `A soft, painterly editorial cover illustration for an article titled "${title}". ${summary ? `Theme: ${summary}.` : ""} Warm cream paper background, muted burgundy, olive and harvest-gold accents, gentle botanical details, calm and grounded mood. Portrait composition. No text, no letters, no logos.`;
    const upstream = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
      method: "POST",
      headers: { "Lovable-API-Key": key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({ model: "openai/gpt-image-2.5-sunburst", prompt, size: "1024x1536", quality: "medium", stream: true, partial_images: 0 }),
    });
    if (!upstream.ok || !upstream.body) {
      const message = upstream.status === 402 ? "AI credits have run out. Add credits to generate covers."
        : upstream.status === 429 ? "Too many requests right now — please try again in a minute." : `Cover generation failed (${upstream.status})`;
      return reply(upstream.status || 502, { message });
    }
    let b64 = ""; let errMsg = "";
    const chunks: string[] = [];
    const reader = upstream.body.getReader(); const dec = new TextDecoder();
    const handle = (line: string) => {
      if (!line.startsWith("data:")) return;
      if (line.includes("partial_image")) return;
      const d = line.slice(5).trim();
      if (!d || d === "[DONE]") return;
      try {
        const ev = JSON.parse(d);
        if (ev.error) errMsg = ev.error.message ?? "Cover generation failed";
        const img = ev.b64_json ?? ev.data?.[0]?.b64_json;
        if (img) b64 = img;
      } catch { /* noop */ }
    };
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = dec.decode(value, { stream: true });
      let start = 0; let nl = text.indexOf("\n");
      while (nl !== -1) {
        chunks.push(text.slice(start, nl));
        handle(chunks.join("")); chunks.length = 0;
        start = nl + 1; nl = text.indexOf("\n", start);
      }
      if (start < text.length) chunks.push(text.slice(start));
    }
    if (chunks.length) handle(chunks.join(""));
    if (!b64) return reply(502, { message: errMsg || "No cover was returned" });
    const bin = atob(b64); b64 = "";
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const path = `${user.id}/${crypto.randomUUID()}.png`;
    const up = await client.storage.from("library-covers").upload(path, bytes, { contentType: "image/png" });
    if (up.error) return reply(500, { message: "Couldn't save the cover" });
    const signed = await client.storage.from("library-covers").createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
    if (signed.error || !signed.data) return reply(500, { message: "Couldn't save the cover" });
    return reply(200, { cover_url: signed.data.signedUrl, path });
  } catch (e) {
    console.error("library-generate-cover failed", e);
    return reply(500, { message: "Unable to generate a cover" });
  }
});
