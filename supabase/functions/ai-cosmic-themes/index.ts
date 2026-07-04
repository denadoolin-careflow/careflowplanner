// deno-lint-ignore-file no-explicit-any
import { corsHeaders } from "../_shared/cors.ts";
import { meterRequest, WEIGHTS } from "../_shared/ai-meter.ts";

const LOVABLE_API_KEY = (Deno.env.get("OPENAI_API_KEY") ?? Deno.env.get("LOVABLE_API_KEY"));

interface Body {
  date?: string;                  // yyyy-mm-dd
  atmosphere?: string;
  active?: Array<{ kind: string; planet?: string; sign?: string; detail?: string }>;
  moon?: { phase?: string; sign?: string; element?: string; illumination?: number };
  natal?: { sun?: string; moon?: string; ascendant?: string };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: "missing_lovable_api_key" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const gate = await meterRequest(req, WEIGHTS.light, corsHeaders);
  if ("response" in gate) return gate.response;

  let body: Body = {};
  try { body = await req.json(); } catch { /* ignore */ }

  const date = String(body.date || new Date().toISOString().slice(0, 10));
  const atmosphere = String(body.atmosphere || "cozy").slice(0, 40);
  const active = (body.active ?? []).slice(0, 10);
  const moon = body.moon ?? {};
  const natal = body.natal ?? {};

  const activeLine = active.length
    ? active.map(a => `${a.kind}${a.planet ? `:${a.planet}` : ""}${a.sign ? `→${a.sign}` : ""}${a.detail ? ` (${a.detail})` : ""}`).join("; ")
    : "no major transits";

  const moonLine = moon.phase
    ? `Moon ${moon.phase}${moon.sign ? ` in ${moon.sign}` : ""}${moon.element ? ` (${moon.element})` : ""}${moon.illumination != null ? ` ${moon.illumination}% lit` : ""}`
    : "Moon phase unknown";

  const natalLine = natal.sun
    ? `User natal: Sun ${natal.sun}, Moon ${natal.moon ?? "—"}${natal.ascendant ? `, ${natal.ascendant} rising` : ""}.`
    : "";

  const system = `You are CareFlow's gentle Cosmic Flow companion. Generate a daily astrology snapshot that is compassionate, practical, and never fear-based. Retrogrades are review seasons, not catastrophes. Keep language warm, plain, and short.`;
  const user = [
    `Date: ${date}. Atmosphere: ${atmosphere}.`,
    moonLine,
    `Active transits today: ${activeLine}.`,
    natalLine,
    "",
    "Return JSON with this exact shape:",
    `{"theme":string,"good_for":string[],"gentle_reminder":string,"journal_prompt":string,"alignment_tip":string,"suggested_action":string}`,
    "`good_for` is 3-5 short verbs/phrases. Theme is a 4-8 word headline. Reminder is one warm sentence. Prompt is one open question. Tip is one practical sentence. Action is one concrete tiny thing the user can do today.",
  ].filter(Boolean).join("\n");

  try {
    const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-5-mini",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (upstream.status === 429) {
      return new Response(JSON.stringify({ error: "rate_limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (upstream.status === 402) {
      return new Response(JSON.stringify({ error: "ai_quota_exceeded" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!upstream.ok) {
      const text = await upstream.text();
      return new Response(JSON.stringify({ error: "upstream_error", detail: text.slice(0, 500) }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await upstream.json();
    const content: string = data?.choices?.[0]?.message?.content ?? "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch { parsed = {}; }
    return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: "exception", message: String(e?.message ?? e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});