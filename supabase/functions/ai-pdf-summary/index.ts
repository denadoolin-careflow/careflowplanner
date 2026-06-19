import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { meterRequest, WEIGHTS } from "../_shared/ai-meter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_BYTES = 20 * 1024 * 1024;

function b64encode(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const gate = await meterRequest(req, WEIGHTS.medium, corsHeaders);
    if ("response" in gate) return gate.response;

    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { path, name = "document.pdf" } = await req.json();
    if (!path || typeof path !== "string") {
      return new Response(JSON.stringify({ error: "Missing path" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    // Path must be inside the caller's folder for safety.
    if (!path.startsWith(`${user.id}/`)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: file, error: dlErr } = await supabase.storage.from("attachments").download(path);
    if (dlErr || !file) {
      return new Response(JSON.stringify({ error: "Could not download file" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const buf = new Uint8Array(await file.arrayBuffer());
    if (buf.length > MAX_BYTES) {
      return new Response(JSON.stringify({ error: "File too large to summarize (max 20 MB)" }), { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const base64 = b64encode(buf);

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return new Response(JSON.stringify({ error: "AI not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const SYSTEM = [
      "You analyze PDF documents. Return STRICT minified JSON only, no code fences,",
      "schema: {\"summary\":string,\"keyPoints\":string[],\"text\":string}.",
      "`summary` MUST be GitHub-flavored markdown: use short `##` section headings,",
      "**bold** for key terms, bullet lists, and inline code where appropriate.",
      "Aim for ~150-300 words and structure it (Overview, Highlights, Takeaways, etc.).",
      "`keyPoints` is 4-8 concise bullet sentences (plain text, no leading dashes; inline markdown like **bold** is allowed).",
      "`text` is the plain extracted text of the document (best-effort, up to ~8000 chars). No preamble.",
    ].join(" ");

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: [
              { type: "text", text: `Analyze this PDF named "${name}" and return the JSON described.` },
              { type: "file", file: { filename: name, file_data: `data:application/pdf;base64,${base64}` } },
            ],
          },
        ],
      }),
    });

    if (resp.status === 429) {
      return new Response(
        JSON.stringify({ error: "ai_rate_limited", message: "Rate limit reached. Try again in a moment.", fallback: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (resp.status === 402) {
      return new Response(
        JSON.stringify({ error: "ai_quota_exceeded", message: "You've reached your AI limit. Upgrade for more AI actions this month.", fallback: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!resp.ok) {
      const t = await resp.text();
      console.error("ai-pdf-summary gateway error", resp.status, t);
      return new Response(JSON.stringify({ error: "AI request failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await resp.json();
    const raw = (data.choices?.[0]?.message?.content ?? "").trim();
    let parsed: { summary?: string; keyPoints?: string[]; text?: string } = {};
    try {
      const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = { summary: raw, keyPoints: [], text: "" };
    }

    return new Response(JSON.stringify({
      summary: parsed.summary ?? "",
      keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
      text: parsed.text ?? "",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("ai-pdf-summary error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});