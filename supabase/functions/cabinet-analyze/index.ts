import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { encodeBase64 } from "jsr:@std/encoding@1/base64";
import { corsHeaders } from "../_shared/cors.ts";

const headers = { ...corsHeaders, "Access-Control-Allow-Methods": "POST, OPTIONS", "Content-Type": "application/json" };
const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers });

const SCHEMA = {
  type: "object", additionalProperties: false,
  required: ["summary", "key_details", "suggested_drawer", "suggested_tags", "expires_at", "suggested_title", "text"],
  properties: {
    summary: { type: "string" },
    key_details: { type: "array", items: { type: "object", additionalProperties: false, required: ["label", "value"], properties: { label: { type: "string" }, value: { type: "string" } } } },
    suggested_drawer: { type: ["string", "null"] },
    suggested_tags: { type: "array", items: { type: "string" } },
    expires_at: { type: ["string", "null"], description: "YYYY-MM-DD expiry/renewal date if the document has one" },
    suggested_title: { type: "string" },
    text: { type: "string", description: "Plain text of the document's main content, up to ~3000 words, for search" },
  },
};

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
    const id = String(body?.id ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(id)) return reply(400, { message: "Missing document" });
    const drawers: string[] = Array.isArray(body?.drawers) ? body.drawers.slice(0, 40).map(String) : [];

    const { data: doc } = await client.from("cabinet_documents").select("id,title,storage_path,mime_type").eq("id", id).maybeSingle();
    if (!doc) return reply(404, { message: "Document not found" });
    const mime = doc.mime_type ?? "";
    const isPdf = mime === "application/pdf";
    const isImage = mime.startsWith("image/");
    if (!isPdf && !isImage) return reply(422, { message: "AI can read PDFs and photos. Other file types can still be stored and searched by title and tags." });

    const { data: file, error } = await client.storage.from("filing-cabinet").download(doc.storage_path);
    if (error || !file) return reply(404, { message: "Couldn't open the file" });
    if (file.size > 20 * 1024 * 1024) return reply(413, { message: "This file is too large for AI reading (20 MB max)." });
    const b64 = encodeBase64(new Uint8Array(await file.arrayBuffer()));
    const part = isPdf
      ? { type: "input_file", filename: `${doc.title || "document"}.pdf`, file_data: `data:application/pdf;base64,${b64}` }
      : { type: "input_image", image_url: `data:${mime};base64,${b64}` };

    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return reply(500, { message: "AI is not configured" });
    const upstream = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { "Lovable-API-Key": key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra", stream: true, store: false, reasoning: { effort: "low" },
        instructions: `You file important personal documents for a calm family planner. Read the document and return: a warm, clear 2-3 sentence summary; up to 8 key details (provider, policy/account/ID numbers, names, dates, amounts) as label/value pairs; the best drawer from this list or null: ${JSON.stringify(drawers)}; up to 4 short lowercase tags; an expiry or renewal date (YYYY-MM-DD) or null; a short descriptive title; and the main text for search.`,
        text: { format: { type: "json_schema", name: "document", strict: true, schema: SCHEMA } },
        input: [{ role: "user", content: [{ type: "input_text", text: `Current title: ${doc.title}` }, part] }],
      }),
    });
    if (!upstream.ok || !upstream.body) {
      const message = upstream.status === 402 ? "AI credits have run out. Add credits in Settings → Plans & credits."
        : upstream.status === 429 ? "AI is busy right now — try again in a minute." : upstream.status === 403 ? "AI access is blocked for this workspace." : "AI couldn't read this document right now.";
      return reply(upstream.status === 402 || upstream.status === 429 || upstream.status === 403 ? upstream.status : 502, { message });
    }
    let out = ""; let buf = "";
    const reader = upstream.body.getReader(); const dec = new TextDecoder();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n"); buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const d = line.slice(5).trim();
        if (!d || d === "[DONE]") continue;
        try { const ev = JSON.parse(d); if (ev.type === "response.output_text.delta") out += ev.delta ?? ""; } catch { /* noop */ }
      }
    }
    let ai: any;
    try { ai = JSON.parse(out); } catch { return reply(502, { message: "AI couldn't read this document right now." }); }
    const expires = typeof ai.expires_at === "string" && /^\d{4}-\d{2}-\d{2}$/.test(ai.expires_at) ? ai.expires_at : null;
    const patch = { summary: String(ai.summary ?? ""), key_details: Array.isArray(ai.key_details) ? ai.key_details.slice(0, 8) : [], extracted_text: String(ai.text ?? "").slice(0, 40000) };
    await client.from("cabinet_documents").update(patch).eq("id", id);
    return reply(200, { ...patch, suggested_drawer: ai.suggested_drawer ?? null, suggested_tags: (ai.suggested_tags ?? []).slice(0, 4), expires_at: expires, suggested_title: ai.suggested_title ?? "" });
  } catch (e) {
    console.error("cabinet-analyze failed", e);
    return reply(500, { message: "Couldn't read this document" });
  }
});
