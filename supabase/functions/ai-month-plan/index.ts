import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `You are CareFlow's seasonal planning coach for a busy caregiver.
Tone: warm, grounded, gently poetic. Be concrete and concise.
Return STRICT JSON only via the provided tool.`;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function seasonFor(month: number, hemisphere: "north" | "south" = "north") {
  // month is 1..12
  const n = ["winter","winter","spring","spring","spring","summer","summer","summer","autumn","autumn","autumn","winter"];
  const s = ["summer","summer","autumn","autumn","autumn","winter","winter","winter","spring","spring","spring","summer"];
  return (hemisphere === "south" ? s : n)[month - 1];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return json({ error: "Server not configured" }, 500);
    }
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.toLowerCase().startsWith("bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });
    const { data: u } = await supabase.auth.getUser();
    if (!u?.user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const month: string = body?.month ?? new Date().toISOString().slice(0, 10); // YYYY-MM-DD first of month
    const hemisphere = (body?.hemisphere ?? "north") as "north" | "south";
    const extraContext: string = (body?.context ?? "").toString().slice(0, 600);

    const d = new Date(month + "T00:00:00Z");
    const monthNum = d.getUTCMonth() + 1;
    const monthName = d.toLocaleString("en-US", { month: "long", timeZone: "UTC" });
    const year = d.getUTCFullYear();
    const season = seasonFor(monthNum, hemisphere);

    const user = `Plan ${monthName} ${year} (${season} in the ${hemisphere}ern hemisphere).
Caregiver context: ${extraContext || "general"}.
Tailor to the season: light, weather, energy, holidays/observances, produce, family rhythms.
Generate a warm, practical monthly plan.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: SYSTEM }, { role: "user", content: user }],
        max_tokens: 1400,
        tools: [{
          type: "function",
          function: {
            name: "monthly_plan",
            description: "Return a seasonal monthly plan.",
            parameters: {
              type: "object",
              properties: {
                word: { type: "string", description: "A single grounding word of the month." },
                theme: { type: "string", description: "A short evocative theme (max 8 words)." },
                intention: { type: "string", description: "One sentence intention for the month." },
                season_notes: { type: "string", description: "1-2 sentences on the seasonal mood." },
                priorities: { type: "array", minItems: 3, maxItems: 5, items: { type: "string" } },
                outings: {
                  type: "array", minItems: 3, maxItems: 6,
                  items: { type: "object", properties: {
                    title: { type: "string" },
                    notes: { type: "string" },
                  }, required: ["title"] },
                },
                activities: {
                  type: "array", minItems: 3, maxItems: 6,
                  items: { type: "object", properties: {
                    title: { type: "string" },
                    notes: { type: "string" },
                  }, required: ["title"] },
                },
              },
              required: ["word", "theme", "intention", "season_notes", "priorities", "outings", "activities"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "monthly_plan" } },
      }),
    });

    if (resp.status === 429) return json({ error: "Rate limited (429)." }, 429);
    if (resp.status === 402) return json({ error: "AI credits exhausted (402)." }, 402);
    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI error", resp.status, t);
      return json({ error: "AI gateway error" }, 500);
    }

    const data = await resp.json();
    const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    let parsed: any = null;
    try { parsed = args ? JSON.parse(args) : null; } catch { parsed = null; }
    if (!parsed) return json({ error: "AI returned no plan." }, 500);

    return json({ season, ...parsed });
  } catch (e: any) {
    console.error(e);
    return json({ error: e?.message ?? "unknown" }, 500);
  }
});