import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return json({ error: "unauthorized" }, 401);

    const body = await req.json();
    const { kind = "weekly", homeSize = "medium", familySize = 2, energy = "medium", minutes = 60, caregiving = "moderate", weekStart = null } = body || {};

    const KIND_LABEL: Record<string, string> = {
      weekly: "Weekly Reset",
      deep: "Deep Clean",
      quick: "Quick Reset",
      low_energy: "Low-Energy Reset",
    };
    const sys = `You are a kind, practical home-management assistant for caregivers. Generate a cleaning/reset checklist organized by room/zone. Keep tasks tiny, scannable, and emotionally gentle. Match the requested type, energy, and time budget.`;
    const user = `Create a "${KIND_LABEL[kind] ?? kind}" checklist.
- Home size: ${homeSize}
- Family size: ${familySize}
- Available energy: ${energy}
- Time budget: ${minutes} minutes total
- Caregiving load: ${caregiving}

Group items by room/zone (Kitchen, Bathroom, Living, Bedrooms, Laundry, Entryway, Whole home, Outdoor). Each zone has 2-5 short subtasks. Suggest a time block (morning/afternoon/evening) and estimated minutes per group.`;

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "LOVABLE_API_KEY missing" }, 500);

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: sys }, { role: "user", content: user }],
        tools: [{
          type: "function",
          function: {
            name: "make_checklist",
            description: "Return a structured cleaning checklist.",
            parameters: {
              type: "object",
              properties: {
                name: { type: "string" },
                groups: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      category: { type: "string" },
                      time_block: { type: "string", enum: ["morning","afternoon","evening"] },
                      est_minutes: { type: "number" },
                      subtasks: { type: "array", items: { type: "string" } },
                    },
                    required: ["title","subtasks"],
                  },
                },
              },
              required: ["name","groups"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "make_checklist" } },
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
    if (!args?.groups) return json({ error: "No checklist returned" }, 500);

    // Insert checklist + items
    const { data: cl, error: clErr } = await supabase.from("reset_checklists").insert({
      user_id: u.user.id,
      name: args.name ?? KIND_LABEL[kind] ?? "Reset",
      kind,
      week_start: weekStart,
      is_template: false,
      sort_order: 0,
    }).select("*").single();
    if (clErr || !cl) return json({ error: clErr?.message ?? "insert failed" }, 500);

    let order = 0;
    for (const g of args.groups) {
      const { data: parent } = await supabase.from("reset_items").insert({
        user_id: u.user.id,
        checklist_id: cl.id,
        title: g.title,
        category: g.category ?? g.title,
        time_block: g.time_block ?? null,
        est_minutes: g.est_minutes ?? null,
        sort_order: order++,
      }).select("*").single();
      if (!parent) continue;
      let subOrder = 0;
      for (const s of (g.subtasks || [])) {
        await supabase.from("reset_items").insert({
          user_id: u.user.id,
          checklist_id: cl.id,
          parent_id: parent.id,
          title: typeof s === "string" ? s : (s.title ?? String(s)),
          category: g.category ?? g.title,
          time_block: g.time_block ?? null,
          sort_order: subOrder++,
        });
      }
    }

    return json({ checklist_id: cl.id });
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