import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { meterRequest, WEIGHTS } from "../_shared/ai-meter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const __gate = await meterRequest(req, WEIGHTS.light, corsHeaders);
    if ("response" in __gate) return __gate.response;
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return json({ error: "unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const zone = String(body?.zone ?? "").trim();
    if (!zone) return json({ error: "zone required" }, 400);
    const focus = String(body?.focus ?? "").trim();
    const energy = String(body?.energy ?? "medium");
    const minutes = Number(body?.minutes ?? 30);

    const sys = `You are a kind, practical home-management assistant. Generate short, scannable cleaning tasks for a single zone of the home. Keep each task under 8 words. Be gentle and concrete.`;
    const user = `Generate 5-8 cleaning tasks for the "${zone}" zone.
- Available energy: ${energy}
- Time budget: ${minutes} minutes
${focus ? `- Focus: ${focus}` : ""}

For each task choose a cadence: daily, weekly, monthly, or quarterly.`;

    const apiKey = (Deno.env.get("OPENAI_API_KEY") ?? Deno.env.get("LOVABLE_API_KEY"));
    if (!apiKey) return json({ error: "LOVABLE_API_KEY missing" }, 500);

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-5-mini",
        messages: [{ role: "system", content: sys }, { role: "user", content: user }],
        tools: [{
          type: "function",
          function: {
            name: "make_zone_tasks",
            description: "Return cleaning tasks for one zone.",
            parameters: {
              type: "object",
              properties: {
                tasks: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      cadence: { type: "string", enum: ["daily","weekly","monthly","quarterly"] },
                    },
                    required: ["title"],
                  },
                },
              },
              required: ["tasks"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "make_zone_tasks" } },
      }),
    });

    if (resp.status === 429) return json({ error: "Rate limited (429). Try again shortly." }, 429);
    if (resp.status === 402) return json({ error: "AI credits exhausted (402)." }, 402);
    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI error", resp.status, t);
      return json({ error: "AI gateway error" }, 500);
    }

    const data = await resp.json();
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    const args = call?.function?.arguments ? JSON.parse(call.function.arguments) : null;
    const tasks: Array<{ title: string; cadence?: string }> = args?.tasks ?? [];
    if (!tasks.length) return json({ error: "No tasks returned" }, 500);

    const rows = tasks.slice(0, 12).map((t, i) => ({
      user_id: u.user.id,
      title: String(t.title).slice(0, 200),
      zone,
      cadence: ["daily","weekly","monthly","quarterly"].includes(String(t.cadence)) ? t.cadence : "weekly",
      sort_order: i,
    }));
    const { error: insErr, data: inserted } = await supabase.from("cleaning_tasks").insert(rows).select("id");
    if (insErr) return json({ error: insErr.message }, 500);

    return json({ inserted: inserted?.length ?? 0 });
  } catch (e: any) {
    console.error(e);
    return json({ error: e?.message ?? "unknown" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}