import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { meterRequest, WEIGHTS } from "../_shared/ai-meter.ts";

const SYSTEM = `You write one cozy, realistic family recipe for a busy caregiver.
Keep it doable on a tired evening. 4-8 short imperative steps, common concrete ingredients.
Respect the caregiver's dietary notes. Pick one matching food emoji as the icon.`;

const tool = {
  type: "function",
  function: {
    name: "return_recipe",
    description: "Return a single recipe for the given meal name.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        prep_minutes: { type: "number" },
        cook_minutes: { type: "number" },
        servings: { type: "number" },
        ingredients: { type: "array", items: { type: "string" } },
        steps: { type: "array", items: { type: "string" } },
        tags: { type: "array", items: { type: "string" } },
        energy_level: { type: "string", enum: ["low", "medium", "high"] },
        icon: { type: "string", description: "single food emoji" },
      },
      required: [
        "title", "description", "prep_minutes", "cook_minutes", "servings",
        "ingredients", "steps", "tags", "energy_level", "icon",
      ],
      additionalProperties: false,
    },
  },
} as const;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const gate = await meterRequest(req, WEIGHTS.light, corsHeaders);
    if ("response" in gate) return gate.response;

    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) return json({ error: "Missing auth" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY not configured" }, 500);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } } });
    const { data: u, error: uErr } = await userClient.auth.getUser();
    if (uErr || !u.user) return json({ error: "Not authenticated" }, 401);

    const body = await req.json().catch(() => ({}));
    const name = String(body?.name ?? "").trim().slice(0, 120);
    if (!name) return json({ error: "A meal name is required" }, 400);
    const slot = ["Breakfast", "Lunch", "Dinner", "Snack"].includes(String(body?.slot))
      ? String(body.slot) : null;

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: prefRow } = await admin
      .from("meal_preferences").select("*").eq("user_id", u.user.id).maybeSingle();
    const prefs = prefRow ?? {};

    const userMsg = `Write the recipe for: "${name}".
${slot ? `Meal slot: ${slot}.` : ""}
Family size: ${prefs.family_size ?? 2}.
Diets: ${(prefs.diets ?? []).join(", ") || "none"}.
Allergies: ${(prefs.allergies ?? []).join(", ") || "none"}.
Dislikes: ${(prefs.dislikes ?? []).join(", ") || "none"}.
Max prep minutes: ${prefs.max_prep_minutes ?? 30}. Low energy mode: ${prefs.low_energy ?? false}.`;

    let last = "";
    for (let attempt = 0; attempt < 3; attempt++) {
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3.6-flash",
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: userMsg },
          ],
          tools: [tool],
          tool_choice: { type: "function", function: { name: "return_recipe" } },
        }),
      });

      if (resp.status === 429 || resp.status >= 500) {
        last = await resp.text();
        await new Promise(r => setTimeout(r, 600 * 2 ** attempt));
        continue;
      }
      if (resp.status === 402) {
        return json({ error: "AI credits exhausted. Add credits in your workspace settings." }, 402);
      }
      if (!resp.ok) {
        const t = await resp.text();
        console.error("AI gateway error", resp.status, t);
        return json({ error: "AI gateway error" }, 500);
      }

      const data = await resp.json();
      const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
      if (!args) return json({ error: "AI returned no recipe" }, 500);
      let recipe: any;
      try { recipe = JSON.parse(args); } catch { return json({ error: "AI returned invalid JSON" }, 500); }
      recipe.title = recipe.title || name;
      return json({ recipe });
    }

    console.error("AI retries exhausted", last);
    return json({ error: "Rate limited — please try again shortly." }, 429);
  } catch (e) {
    console.error("ai-meal-recipe failed", e);
    return json({ error: "Unexpected error" }, 500);
  }
});
