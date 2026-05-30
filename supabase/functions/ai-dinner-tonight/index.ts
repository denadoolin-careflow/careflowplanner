// deno-lint-ignore-file no-explicit-any
/**
 * AI dinner suggestion for tonight. Returns 3 ideas filtered by energy,
 * caregiver filters, and (optionally) pantry contents.
 */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

interface Body {
  energy?: number | null;
  filters?: string[];
  mode?: "smart" | "pantry_only";
  family_size?: number;
  pantry?: string[];
  avoid?: string[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: "missing_lovable_api_key" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: Body = {};
  try { body = await req.json(); } catch { /* allow empty */ }

  const filters = Array.isArray(body.filters) ? body.filters.slice(0, 10) : [];
  const pantry = Array.isArray(body.pantry) ? body.pantry.slice(0, 80) : [];
  const avoid = Array.isArray(body.avoid) ? body.avoid.slice(0, 20) : [];
  const energy = typeof body.energy === "number" ? Math.max(1, Math.min(10, body.energy)) : null;
  const familySize = Math.max(1, Math.min(12, Number(body.family_size) || 2));
  const mode = body.mode === "pantry_only" ? "pantry_only" : "smart";

  const energyLine = energy == null
    ? ""
    : energy <= 3
      ? "The caregiver has low energy. Strongly favor sheet-pan, crockpot, freezer, leftovers, or no-cook meals. Avoid recipes with many steps or active cook time over 15 minutes."
      : energy >= 8
        ? "The caregiver has spacious energy. A slightly more involved recipe is OK if it brings joy."
        : "The caregiver has steady energy. Keep total time under 45 minutes.";

  const filtersLine = filters.length
    ? `Active filters: ${filters.join(", ")}. Respect them strictly.`
    : "";

  const pantryLine = mode === "pantry_only"
    ? `Use ONLY these pantry ingredients (plus basic salt/pepper/oil): ${pantry.join(", ") || "nothing — propose 3 ultra-simple staples"}.`
    : pantry.length
      ? `Pantry on hand (prefer recipes that use these): ${pantry.join(", ")}.`
      : "";

  const avoidLine = avoid.length ? `Do NOT suggest: ${avoid.join(", ")}.` : "";

  const system = `You are a supportive caregiver-focused meal helper. Suggest 3 simple, realistic dinner ideas for a family of ${familySize}. Be warm and non-judgmental. Never shame.`;
  const user = [
    "Return JSON with this exact shape:",
    `{"suggestions":[{"name":string,"prep_minutes":number,"cook_minutes":number,"ingredients":string[],"easy_tag":"Easy"|"Prep Ahead"|"One Pot"|"Sheet Pan"|"Crockpot"|"Freezer"|"No Cook","reason":string}]}`,
    "Exactly 3 items. Keep ingredients lists short (6-10 items, common grocery names).",
    energyLine,
    filtersLine,
    pantryLine,
    avoidLine,
  ].filter(Boolean).join("\n");

  try {
    const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (upstream.status === 429) {
      return new Response(JSON.stringify({ error: "rate_limited" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (upstream.status === 402) {
      return new Response(JSON.stringify({ error: "ai_quota_exceeded", message: "AI credits exhausted." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!upstream.ok) {
      const text = await upstream.text();
      return new Response(JSON.stringify({ error: "upstream_error", detail: text.slice(0, 500) }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await upstream.json();
    const content: string = data?.choices?.[0]?.message?.content ?? "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch { parsed = {}; }
    const suggestions = Array.isArray(parsed?.suggestions) ? parsed.suggestions.slice(0, 3) : [];

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: "exception", message: String(e?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});