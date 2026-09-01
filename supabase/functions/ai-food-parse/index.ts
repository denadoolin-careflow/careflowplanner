// deno-lint-ignore-file no-explicit-any
/**
 * Plain-language food parsing for WellFlow quick capture.
 * "2 eggs and toast" -> a list of estimated food items the user can review
 * and edit before saving. Estimates only; never presented as exact.
 */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") ?? Deno.env.get("OPENAI_API_KEY");
const MODEL = "google/gemini-3.6-flash";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: "AI is not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { text?: string } = {};
  try { body = await req.json(); } catch { /* empty */ }
  const text = typeof body.text === "string" ? body.text.trim().slice(0, 300) : "";
  if (!text) {
    return new Response(JSON.stringify({ error: "Tell me what you ate" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const payload = {
    model: MODEL,
    messages: [
      {
        role: "system",
        content:
          "You estimate nutrition for foods described in plain language. Return each distinct food as its own item, "
          + "with a typical serving size and per-entry totals for the quantity described. Values are rough estimates. "
          + "Never give medical or dietary advice. Use grams for macros and kcal for calories.",
      },
      { role: "user", content: text },
    ],
    tools: [{
      type: "function",
      function: {
        name: "log_foods",
        description: "Return the estimated foods.",
        parameters: {
          type: "object",
          properties: {
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  servingSize: { type: "string" },
                  servings: { type: "number" },
                  calories: { type: "number" },
                  protein: { type: "number" },
                  carbs: { type: "number" },
                  fat: { type: "number" },
                  fiber: { type: "number" },
                },
                required: ["name", "calories", "protein", "carbs", "fat", "fiber"],
                additionalProperties: false,
              },
            },
          },
          required: ["items"],
          additionalProperties: false,
        },
      },
    }],
    tool_choice: { type: "function", function: { name: "log_foods" } },
  };

  for (let attempt = 0; attempt < 3; attempt++) {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (r.status === 429 || r.status === 503) {
      const wait = Number(r.headers.get("retry-after")) * 1000 || 800 * (attempt + 1);
      if (attempt < 2) { await new Promise(res => setTimeout(res, Math.min(wait, 4000))); continue; }
      return new Response(JSON.stringify({ error: "Busy right now — try again in a moment." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (r.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits are exhausted." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!r.ok) {
      return new Response(JSON.stringify({ error: "Couldn't estimate that food." }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const j = await r.json();
    const call = j?.choices?.[0]?.message?.tool_calls?.[0];
    let items: any[] = [];
    try { items = JSON.parse(call?.function?.arguments ?? "{}").items ?? []; } catch { /* noop */ }
    const clean = items.slice(0, 8).map((it: any, i: number) => ({
      id: `ai:${i}`,
      name: String(it.name ?? "Food").slice(0, 120),
      brand: null,
      servingSize: it.servingSize ? String(it.servingSize).slice(0, 60) : "1 serving",
      servings: Number(it.servings) > 0 ? Number(it.servings) : 1,
      calories: Math.max(0, Math.round(Number(it.calories) || 0)),
      protein: Math.max(0, Math.round(Number(it.protein) || 0)),
      carbs: Math.max(0, Math.round(Number(it.carbs) || 0)),
      fat: Math.max(0, Math.round(Number(it.fat) || 0)),
      fiber: Math.max(0, Math.round(Number(it.fiber) || 0)),
      source: "ai",
    }));

    return new Response(JSON.stringify({ items: clean }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ error: "Couldn't estimate that food." }), {
    status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
