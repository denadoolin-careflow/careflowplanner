// deno-lint-ignore-file no-explicit-any
import { corsHeaders } from "../_shared/cors.ts";
import { meterRequest, WEIGHTS } from "../_shared/ai-meter.ts";
import { COSMIC_SYSTEM_PROMPT, COSMIC_TONE_REMINDER } from "../_shared/cosmic-tone.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

interface Body {
  entries?: Array<{ date: string; text: string }>;
  activeTransits?: string[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (!LOVABLE_API_KEY) return new Response(JSON.stringify({ error: "missing_lovable_api_key" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  const gate = await meterRequest(req, WEIGHTS.medium, corsHeaders);
  if ("response" in gate) return gate.response;

  const body: Body = await req.json().catch(() => ({} as any));
  const entries = (body.entries ?? []).slice(0, 60);
  const txt = entries.map(e => `[${e.date}] ${String(e.text).slice(0, 400)}`).join("\n");
  const transits = (body.activeTransits ?? []).join("; ");

  if (!txt) {
    return new Response(JSON.stringify({ themes: [], patterns: [], breakthroughs: [], reflection_prompt: "What feels most alive in your life this week?", entry_count: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const user = `Read the user's recent journal entries and surface meaningful themes, emotional patterns, and growth breakthroughs.

ENTRIES:
${txt}

ACTIVE COSMIC CONTEXT: ${transits || "(none)"}.

Return JSON exactly:
{"themes":string[],"patterns":string[],"breakthroughs":string[],"reflection_prompt":string,"entry_count":number}

- themes: 3-6 short recurring topics (e.g. "caregiving fatigue", "creating CareFlow").
- patterns: 2-4 emotional patterns ("oscillating between rest and overdrive").
- breakthroughs: 1-3 moments of growth or clarity from the entries.
- reflection_prompt: 1 open question grounded in current themes + cosmic context.
- entry_count: ${entries.length}.

${COSMIC_TONE_REMINDER}`;

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
    if (upstream.status === 429) return new Response(JSON.stringify({ error: "rate_limited", fallback: true, themes: [], patterns: [], breakthroughs: [], reflection_prompt: "", entry_count: entries.length }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (upstream.status === 402) return new Response(JSON.stringify({ error: "ai_quota_exceeded", fallback: true, themes: [], patterns: [], breakthroughs: [], reflection_prompt: "", entry_count: entries.length }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!upstream.ok) {
      const text = await upstream.text();
      console.error("ai-cosmic-journal-insights upstream", upstream.status, text);
      return new Response(JSON.stringify({ error: "upstream_error", detail: text.slice(0, 500), fallback: true, themes: [], patterns: [], breakthroughs: [], reflection_prompt: "", entry_count: entries.length }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const data = await upstream.json();
    let parsed: any = {};
    try { parsed = JSON.parse(data?.choices?.[0]?.message?.content ?? "{}"); } catch { parsed = {}; }
    return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("ai-cosmic-journal-insights exception", e);
    return new Response(JSON.stringify({ error: "exception", message: String(e?.message ?? e), fallback: true, themes: [], patterns: [], breakthroughs: [], reflection_prompt: "", entry_count: entries.length }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});