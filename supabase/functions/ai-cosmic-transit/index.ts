// deno-lint-ignore-file no-explicit-any
import { corsHeaders } from "../_shared/cors.ts";
import { meterRequest, WEIGHTS } from "../_shared/ai-meter.ts";
import { COSMIC_SYSTEM_PROMPT, COSMIC_TONE_REMINDER } from "../_shared/cosmic-tone.ts";

const LOVABLE_API_KEY = (Deno.env.get("OPENAI_API_KEY") ?? Deno.env.get("LOVABLE_API_KEY"));

interface Body {
  event: { id: string; kind: string; planet?: string; sign?: string; aspect?: string; detail?: string; date?: string; };
  natal?: { sun?: string; moon?: string; ascendant?: string; chartRuler?: string };
  house?: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (!LOVABLE_API_KEY) return new Response(JSON.stringify({ error: "missing_lovable_api_key" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  const gate = await meterRequest(req, WEIGHTS.light, corsHeaders);
  if ("response" in gate) return gate.response;

  const body: Body = await req.json().catch(() => ({} as any));
  const e = body.event ?? { id: "?", kind: "?" };
  const natalLine = body.natal?.sun
    ? `User natal: Sun ${body.natal.sun}, Moon ${body.natal.moon ?? "—"}${body.natal.ascendant ? `, ${body.natal.ascendant} rising` : ""}.`
    : "";
  const houseLine = body.house ? `Affecting natal house ${body.house}.` : "";
  const user = [
    `Astrological event: ${e.kind}${e.planet ? ` ${e.planet}` : ""}${e.sign ? ` in ${e.sign}` : ""}${e.aspect ? ` (${e.aspect})` : ""}${e.detail ? ` — ${e.detail}` : ""}.`,
    e.date ? `Date: ${e.date}.` : "",
    natalLine, houseLine,
    "",
    "Return JSON with EXACTLY these keys:",
    `{"why_matters":string,"growth":string,"challenges":string,"action":string,"affirmation":string,"reflection":string,"technical":string,"meaning":string,"emotional":string,"practical":string,"careflow":{"tasks":string[],"habits":string[],"routines":string[],"journaling":string[]}}`,
    "Field guide:",
    "- why_matters: 2 sentences on why this transit matters for THIS person right now (use natal/house context if given).",
    "- growth: 1-2 sentences naming the growth opportunity this energy invites.",
    "- challenges: 1-2 sentences naming a real, compassionate potential challenge to watch for.",
    "- action: ONE concrete, specific thing they can actually do today (start with a verb).",
    "- affirmation: a short first-person 'I am / I trust / I allow' affirmation, max 14 words.",
    "- reflection: a single open journaling question, max 20 words.",
    "- technical/meaning/emotional/practical: 1-2 sentences each (kept for backwards compatibility).",
    "- careflow arrays: 1-3 short concrete suggestions each.",
    COSMIC_TONE_REMINDER,
  ].filter(Boolean).join("\n");

  try {
    const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-5-mini",
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