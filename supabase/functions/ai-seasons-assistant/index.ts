// deno-lint-ignore-file no-explicit-any
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

interface Body {
  season?: string;
  year?: number;
  atmosphere?: string;
  family_ages?: number[];
  prior_celebrations?: string[];
  busy_days?: number; // 0-30 upcoming calendar density
  notes?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: "missing_lovable_api_key" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: Body = {};
  try { body = await req.json(); } catch { /* allow empty */ }

  const season = String(body.season || "current").slice(0, 24);
  const year = Number(body.year) || new Date().getFullYear();
  const atmosphere = String(body.atmosphere || "cozy").slice(0, 40);
  const ages = Array.isArray(body.family_ages) ? body.family_ages.slice(0, 12).map(n => Math.max(0, Math.min(110, Number(n) || 0))) : [];
  const prior = Array.isArray(body.prior_celebrations) ? body.prior_celebrations.slice(0, 20).map(s => String(s).slice(0, 60)) : [];
  const busy = Math.max(0, Math.min(30, Number(body.busy_days) || 0));
  const notes = String(body.notes || "").slice(0, 400);

  const busyLine = busy >= 18
    ? "The family's calendar is very full — propose low-effort, short, at-home ideas."
    : busy >= 8
      ? "The calendar is moderately full — favor flexible, 1-2 hour ideas."
      : "The calendar is open — a couple of bigger or all-day ideas are welcome.";

  const agesLine = ages.length
    ? `Family member ages: ${ages.join(", ")}. Tailor activities so every age can take part.`
    : "Family ages unknown — keep ideas broadly multi-generational.";

  const priorLine = prior.length
    ? `They have already celebrated: ${prior.join("; ")}. Do NOT repeat these — offer fresh ideas that complement them.`
    : "";

  const system = `You are a warm family-traditions assistant for the CareFlow Seasons & Celebrations module. Suggest meaningful, realistic celebrations a family can plan for the ${season} season of ${year}. Be inclusive and gentle. Never shame.`;
  const user = [
    "Return JSON with this exact shape:",
    `{"celebrations":[{"title":string,"kind":"family_milestone"|"special_event"|"anniversary"|"custom","icon":string,"date_hint":string,"why":string,"checklist":string[]}]}`,
    "Exactly 5 items. `icon` is a single emoji. `date_hint` is a relative phrase like \"first weekend of summer\" — no ISO date. Checklists are 3-5 short items.",
    `Season: ${season}. Year: ${year}. Atmosphere: ${atmosphere}.`,
    agesLine, priorLine, busyLine,
    notes ? `Extra notes from the family: ${notes}` : "",
  ].filter(Boolean).join("\n");

  try {
    const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
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
      return new Response(JSON.stringify({ error: "rate_limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (upstream.status === 402) {
      return new Response(JSON.stringify({ error: "ai_quota_exceeded", message: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!upstream.ok) {
      const text = await upstream.text();
      return new Response(JSON.stringify({ error: "upstream_error", detail: text.slice(0, 500) }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await upstream.json();
    const content: string = data?.choices?.[0]?.message?.content ?? "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch { parsed = {}; }
    const celebrations = Array.isArray(parsed?.celebrations) ? parsed.celebrations.slice(0, 5) : [];
    return new Response(JSON.stringify({ celebrations }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: "exception", message: String(e?.message ?? e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});