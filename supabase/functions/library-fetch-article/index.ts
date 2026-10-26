import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

const headers = { ...corsHeaders, "Access-Control-Allow-Methods": "POST, OPTIONS", "Content-Type": "application/json" };
const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers });

const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).trim();
function meta(html: string, keys: string[]): string | null {
  for (const k of keys) {
    const re1 = new RegExp(`<meta[^>]+(?:property|name)=["']${k}["'][^>]*content=["']([^"']*)["']`, "i");
    const re2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${k}["']`, "i");
    const m = html.match(re1) ?? html.match(re2);
    if (m?.[1]) return decode(m[1]);
  }
  return null;
}

const SCHEMA = {
  type: "object", additionalProperties: false,
  required: ["summary", "takeaways", "reading_minutes", "tags"],
  properties: {
    summary: { type: "string" },
    takeaways: { type: "array", items: { type: "string" } },
    reading_minutes: { type: "integer" },
    tags: { type: "array", items: { type: "string" } },
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
    let url: URL;
    try { url = new URL(String(body?.url ?? "")); } catch { return reply(400, { message: "That doesn't look like a link" }); }
    if (!/^https?:$/.test(url.protocol) || /^(localhost|127\.|10\.|192\.168\.|169\.254\.)/.test(url.hostname)) return reply(400, { message: "That link can't be read" });

    let html = "";
    try {
      const page = await fetch(url.toString(), { headers: { "User-Agent": "Mozilla/5.0 (compatible; CareFlowLibrary/1.0)", Accept: "text/html" }, redirect: "follow" });
      if (!page.ok) return reply(422, { message: `The page couldn't be opened (${page.status}). You can type the details yourself.` });
      html = (await page.text()).slice(0, 1_500_000);
    } catch { return reply(422, { message: "The page couldn't be reached. You can type the details yourself." }); }

    const title = meta(html, ["og:title", "twitter:title"]) ?? (html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ? decode(html.match(/<title[^>]*>([^<]*)<\/title>/i)![1]) : null);
    const site = meta(html, ["og:site_name", "application-name"]) ?? url.hostname.replace(/^www\./, "");
    const author = meta(html, ["author", "article:author", "twitter:creator"]);
    const description = meta(html, ["og:description", "description", "twitter:description"]);
    let image = meta(html, ["og:image", "og:image:url", "twitter:image", "twitter:image:src"]);
    if (image) { try { image = new URL(image, url).toString(); } catch { image = null; } }

    const text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<nav[\s\S]*?<\/nav>|<footer[\s\S]*?<\/footer>/gi, " ")
      .replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const words = text.split(" ").length;
    const base = { title, site, author, description, image, url: url.toString(), reading_minutes: Math.max(1, Math.round(words / 230)) };

    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key || text.length < 200) return reply(200, { ...base, summary: description ?? "", takeaways: [], tags: [] });

    const upstream = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { "Lovable-API-Key": key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra", stream: true, store: false, reasoning: { effort: "low" },
        instructions: "You summarize clipped web articles for a calm personal library. Write a warm 2-3 sentence summary, 3-5 short concrete takeaways, an estimated reading time in minutes, and up to 4 lowercase topic tags.",
        text: { format: { type: "json_schema", name: "article", strict: true, schema: SCHEMA } },
        input: [{ role: "user", content: `Title: ${title ?? ""}\nSite: ${site}\n\n${text.slice(0, 24000)}` }],
      }),
    });
    if (!upstream.ok || !upstream.body) {
      const message = upstream.status === 402 ? "AI credits have run out — details were filled without a summary."
        : upstream.status === 429 ? "AI is busy right now — details were filled without a summary." : "Summary unavailable right now.";
      return reply(200, { ...base, summary: description ?? "", takeaways: [], tags: [], warning: message });
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
    let ai: any = {};
    try { ai = JSON.parse(out); } catch { /* fall back */ }
    return reply(200, {
      ...base,
      summary: ai.summary || description || "",
      takeaways: Array.isArray(ai.takeaways) ? ai.takeaways.slice(0, 5) : [],
      tags: Array.isArray(ai.tags) ? ai.tags.slice(0, 4) : [],
      reading_minutes: ai.reading_minutes || base.reading_minutes,
    });
  } catch (e) {
    console.error("library-fetch-article failed", e);
    return reply(500, { message: "Couldn't read this article" });
  }
});
