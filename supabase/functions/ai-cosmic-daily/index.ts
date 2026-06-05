// deno-lint-ignore-file no-explicit-any
import { corsHeaders } from "../_shared/cors.ts";
import { meterRequest, WEIGHTS } from "../_shared/ai-meter.ts";
import { COSMIC_SYSTEM_PROMPT, COSMIC_TONE_REMINDER } from "../_shared/cosmic-tone.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

interface Body {
  date?: string;
  active?: Array<{ kind: string; planet?: string; sign?: string; detail?: string }>;
  moon?: { phase?: string; sign?: string; element?: string; illumination?: number };
  natal?: { sun?: string; moon?: string; ascendant?: string; chartRuler?: string };
  progressed?: { moonSign?: string; moonPhase?: string; sunSign?: string };
  profection?: { house?: number; sign?: string; timeLord?: string; topics?: string };
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
  const active = (body.active ?? []).slice(0, 12);
  const activeLine = active.length
    ? active.map(a => `${a.kind}${a.planet ? `:${a.planet}` : ""}${a.sign ? `→${a.sign}` : ""}${a.detail ? ` (${a.detail})` : ""}`).join("; ")
    : "no major transits";
  const moonLine = body.moon?.phase
    ? `Moon ${body.moon.phase}${body.moon.sign ? ` in ${body.moon.sign}` : ""}${body.moon.illumination != null ? ` ${body.moon.illumination}% lit` : ""}`
    : "Moon phase unknown";
  const natalLine = body.natal?.sun
    ? `User natal: Sun ${body.natal.sun}, Moon ${body.natal.moon ?? "—"}${body.natal.ascendant ? `, ${body.natal.ascendant} rising` : ""}${body.natal.chartRuler ? `, chart ruler ${body.natal.chartRuler}` : ""}.`
    : "";
  const progLine = body.progressed?.moonSign
    ? `Progressed Moon in ${body.progressed.moonSign} (${body.progressed.moonPhase ?? ""}); progressed Sun ${body.progressed.sunSign ?? "—"}.`
    : "";
  const profLine = body.profection?.house
    ? `Profected house ${body.profection.house} (${body.profection.sign}); time-lord ${body.profection.timeLord}. Topics: ${body.profection.topics}.`
    : "";

  const user = [
    `Date: ${date}.`,
    moonLine, `Active today: ${activeLine}.`,
    natalLine, progLine, profLine,
    "",
    "Return JSON with this exact shape:",
    `{"headline":string,"body":string,"suggested_actions":string[],"gentle_reminder":string,"journal_prompt":string,"mood_tags":string[]}`,
    "`headline` 4-8 words, plain language not jargon. `body` 2-3 short paragraphs of compassionate guidance. `suggested_actions` 3-5 short concrete CareFlow-style tiny tasks (e.g. 'Complete one overdue task', 'Take a short walk'). `mood_tags` 2-4 single-word tags. " + COSMIC_TONE_REMINDER,
  ].filter(Boolean).join("\n");

  try {
    const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: COSMIC_SYSTEM_PROMPT },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (upstream.status === 429) return new Response(JSON.stringify({ error: "rate_limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (upstream.status === 402) return new Response(JSON.stringify({ error: "ai_quota_exceeded" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!upstream.ok) {
      const text = await upstream.text();
      return new Response(JSON.stringify({ error: "upstream_error", detail: text.slice(0, 500) }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const data = await upstream.json();
    let parsed: any = {};
    try { parsed = JSON.parse(data?.choices?.[0]?.message?.content ?? "{}"); } catch { parsed = {}; }
    return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: "exception", message: String(e?.message ?? e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});