import { corsHeaders } from "@supabase/supabase-js/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { person, slot, style } = await req.json().catch(() => ({}));
    const validSlot = ["morning", "nap", "evening"].includes(slot) ? slot : "morning";
    const personName = typeof person === "string" && person.trim() ? person.trim() : "this person";
    const planningStyle = typeof style === "string" && style.trim() ? style.trim() : "gentle, calm";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const slotLabel: Record<string, string> = {
      morning: "morning routine (wake-up, breakfast, getting-ready)",
      nap: "nap-time / midday rest routine (wind-down, comfort, quiet activities)",
      evening: "evening routine (dinner wind-down, bath, bedtime)",
    };

    const prompt = `Suggest 6 short, actionable routine items for ${personName}'s ${slotLabel[validSlot]}.
Planning style preference: ${planningStyle}.
Each item should be 2-7 words, concrete, and warm. No numbering, no extra explanation.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You suggest short, gentle, practical routine ideas for caregivers and families. Always respond via the provided tool." },
          { role: "user", content: prompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "suggest_routine_items",
            description: "Return 5-8 routine item suggestions.",
            parameters: {
              type: "object",
              properties: {
                ideas: { type: "array", items: { type: "string" }, minItems: 5, maxItems: 8 },
              },
              required: ["ideas"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "suggest_routine_items" } },
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
    let ideas: string[] = [];
    try { ideas = JSON.parse(call ?? "{}").ideas ?? []; } catch { ideas = []; }
    return new Response(JSON.stringify({ ideas }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-routine-ideas error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});