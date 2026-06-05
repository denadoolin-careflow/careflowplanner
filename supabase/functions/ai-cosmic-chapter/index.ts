// deno-lint-ignore-file no-explicit-any
import { corsHeaders } from "../_shared/cors.ts";
import { meterRequest, WEIGHTS } from "../_shared/ai-meter.ts";
import { COSMIC_SYSTEM_PROMPT, COSMIC_TONE_REMINDER } from "../_shared/cosmic-tone.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

interface Body {
  natal?: { sun?: string; moon?: string; ascendant?: string; chartRuler?: string; dominantElement?: string; dominantModality?: string };
  transits?: Array<{ label: string; detail?: string }>;
  progressed?: { moonSign?: string; moonPhase?: string; sunSign?: string; solarArc?: number };
  profection?: { house?: number; sign?: string; timeLord?: string; topics?: string };
  returns?: { nextSolarReturn?: string; nextSaturnReturn?: string; nextJupiterReturn?: string };
  eclipses?: Array<{ date: string; type: string; sign: string; degree: number; nature: string }>;
  journalThemes?: string[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (!LOVABLE_API_KEY) return new Response(JSON.stringify({ error: "missing_lovable_api_key" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  const gate = await meterRequest(req, WEIGHTS.medium, corsHeaders);
  if ("response" in gate) return gate.response;

  const body: Body = await req.json().catch(() => ({} as any));
  const natal = body.natal ?? {};
  const transits = (body.transits ?? []).slice(0, 12).map(t => `- ${t.label}${t.detail ? ` (${t.detail})` : ""}`).join("\n");
  const prog = body.progressed ?? {};
  const prof = body.profection ?? {};
  const ret = body.returns ?? {};
  const eclipses = (body.eclipses ?? []).slice(0, 6).map(e => `- ${e.date} ${e.nature} ${e.type} ${e.degree}° ${e.sign}`).join("\n");
  const journal = (body.journalThemes ?? []).slice(0, 8).map(t => `- ${t}`).join("\n");

  const user = `Synthesize the user's CURRENT CHAPTER — the meaningful life-season they're moving through right now.

NATAL: Sun ${natal.sun ?? "?"}, Moon ${natal.moon ?? "?"}${natal.ascendant ? `, ${natal.ascendant} rising` : ""}${natal.chartRuler ? `, chart ruler ${natal.chartRuler}` : ""}. Dominants: ${natal.dominantElement ?? "?"} / ${natal.dominantModality ?? "?"}.

ACTIVE TRANSITS:
${transits || "(quiet)"}

PROGRESSED: Moon in ${prog.moonSign ?? "?"} (${prog.moonPhase ?? ""}). Sun in ${prog.sunSign ?? "?"}.
PROFECTION: house ${prof.house ?? "?"} (${prof.sign ?? ""}); time-lord ${prof.timeLord ?? "?"}; topics: ${prof.topics ?? ""}.
RETURNS: next solar return ${ret.nextSolarReturn ?? "?"}; next Saturn return ${ret.nextSaturnReturn ?? "?"}; next Jupiter return ${ret.nextJupiterReturn ?? "?"}.
ECLIPSES NEARBY:
${eclipses || "(none)"}

RECENT JOURNAL THEMES:
${journal || "(none provided)"}

Synthesize ALL of the above into ONE chapter narrative. Identify the meta-theme. Don't list events.

Return JSON with EXACTLY these keys:
{"chapter_theme":string,"summary":string,"characters":string[],"lessons":string[],"practices":string[],"reflection_prompt":string}

- chapter_theme: 2-5 words (e.g. "Rebuilding Foundations").
- summary: 2-4 short paragraphs in second person ("you"), warm + grounded.
- characters: 2-4 planetary energies in plain language (e.g. "Saturn — boundaries").
- lessons: 3-5 short phrases.
- practices: 4-6 concrete CareFlow-aligned practices (meal planning, journaling, simplifying commitments, etc.).
- reflection_prompt: one open question.

${COSMIC_TONE_REMINDER}`;

  try {
    const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
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