const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { goal, person, slot } = await req.json().catch(() => ({}));
    const goalText = typeof goal === "string" && goal.trim() ? goal.trim() : "";
    if (!goalText) {
      return new Response(JSON.stringify({ error: "Missing goal" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const personName = typeof person === "string" && person.trim() ? person.trim() : "this person";
    const slotName = typeof slot === "string" ? slot : "anytime";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `Break this routine goal into 4-8 small concrete steps for ${personName} (${slotName}): "${goalText}".
Each step should be 2-6 words, action-led, calm. Pick a single relevant emoji icon and a realistic duration in minutes (1-30) for each.
Optimized for neurodivergent users: small, scannable, low cognitive load.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You break down vague routine goals into small, icon-tagged, time-boxed steps. Always respond via the provided tool." },
          { role: "user", content: prompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "emit_steps",
            description: "Return 4-8 routine steps with icon and duration.",
            parameters: {
              type: "object",
              properties: {
                steps: {
                  type: "array",
                  minItems: 3, maxItems: 10,
                  items: {
                    type: "object",
                    properties: {
                      text: { type: "string" },
                      icon: { type: "string", description: "A single relevant emoji." },
                      durationMin: { type: "integer", minimum: 1, maximum: 30 },
                    },
                    required: ["text", "icon", "durationMin"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["steps"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "emit_steps" } },
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit reached, please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Settings → Workspace → Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await resp.text();
      console.error("AI gateway error", resp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const json = await resp.json();
    const call = json?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    let steps: Array<{ text: string; icon?: string; durationMin?: number }> = [];
    try { steps = JSON.parse(call ?? "{}").steps ?? []; } catch { steps = []; }
    return new Response(JSON.stringify({ steps }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-routine-breakdown error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});