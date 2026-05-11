import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `You plan cozy, realistic family meals for a busy caregiver.
Output JSON via the provided tool. Respect dietary restrictions, allergies, dislikes, family size, budget, and max prep time.
If "low_energy" is true, prefer no-cook, sheet-pan, or 15-minute meals and reuse leftovers.
Keep names short and friendly. Steps should be concise (4-7 short steps). Ingredients use common units.
Always include all 4 slots (Breakfast, Lunch, Dinner, Snack) for each requested day unless slots is provided.`;

const planTool = {
  type: "function",
  function: {
    name: "return_meal_plan",
    description: "Return a weekly meal plan plus a consolidated grocery list.",
    parameters: {
      type: "object",
      properties: {
        meals: {
          type: "array",
          items: {
            type: "object",
            properties: {
              date: { type: "string", description: "ISO date YYYY-MM-DD" },
              slot: { type: "string", enum: ["Breakfast", "Lunch", "Dinner", "Snack"] },
              name: { type: "string" },
              prep_minutes: { type: "number" },
              ingredients: { type: "array", items: { type: "string" } },
              steps: { type: "array", items: { type: "string" } },
              tags: { type: "array", items: { type: "string" }, description: "e.g. low-energy, kid-safe, vegetarian, sheet-pan" },
              kid_safe: { type: "boolean" },
            },
            required: ["date", "slot", "name", "ingredients", "steps"],
            additionalProperties: false,
          },
        },
        grocery: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              qty: { type: "string" },
              category: { type: "string", enum: ["Produce", "Protein", "Dairy", "Pantry", "Frozen", "Bakery", "Other"] },
            },
            required: ["name", "category"],
            additionalProperties: false,
          },
        },
      },
      required: ["meals", "grocery"],
      additionalProperties: false,
    },
  },
} as const;

const singleMealTool = {
  type: "function",
  function: {
    name: "return_single_meal",
    description: "Return one meal recipe.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string" },
        prep_minutes: { type: "number" },
        ingredients: { type: "array", items: { type: "string" } },
        steps: { type: "array", items: { type: "string" } },
        tags: { type: "array", items: { type: "string" } },
        kid_safe: { type: "boolean" },
      },
      required: ["name", "ingredients", "steps"],
      additionalProperties: false,
    },
  },
} as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) {
      return json({ error: "Missing auth" }, 401);
    }
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY not configured" }, 500);

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: u, error: uErr } = await userClient.auth.getUser();
    if (uErr || !u.user) return json({ error: "Not authenticated" }, 401);
    const userId = u.user.id;

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const body = await req.json().catch(() => ({}));
    const action: "plan_week" | "regenerate_meal" = body.action ?? "plan_week";

    // Load preferences
    const { data: prefRow } = await admin
      .from("meal_preferences")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    const prefs = prefRow ?? {
      family_size: 2, diets: [], allergies: [], dislikes: [], cuisines: [],
      budget_level: "medium", max_prep_minutes: 30, low_energy: false, picky_notes: null,
    };

    // Load pantry
    const { data: pantry } = await admin
      .from("pantry_items")
      .select("name")
      .eq("user_id", userId)
      .eq("in_stock", true);
    const pantryNames = (pantry ?? []).map((p: any) => p.name);

    if (action === "regenerate_meal") {
      const { date, slot, avoid } = body as { date: string; slot: string; avoid?: string };
      const userMsg = `Regenerate one ${slot} for ${date}.
Avoid: ${avoid ?? "none"}.
Preferences: ${JSON.stringify(prefs)}.
Pantry already has: ${pantryNames.join(", ") || "nothing notable"}.`;

      const ai = await callAI(LOVABLE_API_KEY, userMsg, singleMealTool);
      if (ai.error) return json(ai, ai.status ?? 500);
      const meal = ai.args as any;
      // Replace existing meal at that slot/date
      await admin.from("meals").delete().eq("user_id", userId).eq("date", date).eq("slot", slot);
      const { data: inserted, error } = await admin
        .from("meals")
        .insert({
          user_id: userId,
          date, slot,
          name: meal.name,
          prep_minutes: meal.prep_minutes ?? null,
          ingredients: meal.ingredients ?? [],
          steps: meal.steps ?? [],
          tags: meal.tags ?? [],
          kid_safe: meal.kid_safe ?? false,
        })
        .select()
        .single();
      if (error) return json({ error: error.message }, 500);
      return json({ meal: inserted });
    }

    // plan_week
    const startDate: string = body.start_date;
    const slots: string[] = body.slots ?? ["Breakfast", "Lunch", "Dinner", "Snack"];
    const replace: boolean = body.replace ?? true;
    const mode: string | null = body.mode ?? null;
    if (!startDate) return json({ error: "start_date required" }, 400);

    const dates: string[] = [];
    const start = new Date(startDate + "T00:00:00");
    for (let i = 0; i < 7; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i);
      dates.push(d.toISOString().slice(0, 10));
    }

    const modeHints: Record<string, string> = {
      use_pantry: "Heavily prioritize meals that can be made primarily from pantry items already in stock. Add as few new grocery items as possible.",
      low_budget: "Generate budget-friendly meals using inexpensive proteins, beans, lentils, eggs, rice, pasta, seasonal produce. Avoid premium ingredients.",
      sensory_safe: "Generate sensory-safe meals: mild flavors, soft textures, no strong smells, simple ingredients separated when possible. Avoid mixed textures.",
      low_energy: "Force low_energy mode: prefer no-cook, sheet-pan, or 15-minute meals. Reuse leftovers across days.",
    };
    const modeNote = mode && modeHints[mode] ? `\nSpecial mode: ${modeHints[mode]}` : "";

    const userMsg = `Plan meals for these 7 dates: ${dates.join(", ")}.
Slots per day: ${slots.join(", ")}.
Family size: ${prefs.family_size}.
Diets: ${(prefs.diets ?? []).join(", ") || "none"}.
Allergies: ${(prefs.allergies ?? []).join(", ") || "none"}.
Dislikes: ${(prefs.dislikes ?? []).join(", ") || "none"}.
Cuisines preferred: ${(prefs.cuisines ?? []).join(", ") || "any"}.
Budget level: ${prefs.budget_level}.
Max prep minutes: ${prefs.max_prep_minutes}.
Low energy mode: ${prefs.low_energy}.
Picky-eater notes: ${prefs.picky_notes ?? "none"}.
Pantry already has: ${pantryNames.join(", ") || "nothing notable"} (don't add these to grocery list).${modeNote}
Generate meals and a consolidated grocery list grouped by category.`;

    const ai = await callAI(LOVABLE_API_KEY, userMsg, planTool);
    if (ai.error) return json(ai, ai.status ?? 500);
    const plan = ai.args as { meals: any[]; grocery: any[] };

    if (replace) {
      await admin.from("meals").delete().eq("user_id", userId).in("date", dates);
    }

    if (plan.meals?.length) {
      const dateRe = /^\d{4}-\d{2}-\d{2}$/;
      const validSlots = new Set(["Breakfast", "Lunch", "Dinner", "Snack"]);
      const rows = plan.meals
        .filter((m: any) => m && typeof m.date === "string" && dateRe.test(m.date) && validSlots.has(m.slot) && typeof m.name === "string" && m.name.trim())
        .map((m: any) => ({
          user_id: userId,
          date: m.date,
          slot: m.slot,
          name: String(m.name).slice(0, 200),
          prep_minutes: typeof m.prep_minutes === "number" ? m.prep_minutes : null,
          ingredients: Array.isArray(m.ingredients) ? m.ingredients.map(String) : [],
          steps: Array.isArray(m.steps) ? m.steps.map(String) : [],
          tags: Array.isArray(m.tags) ? m.tags.map(String) : [],
          kid_safe: !!m.kid_safe,
        }));
      if (rows.length === 0) {
        console.error("AI returned no valid meals. Raw:", JSON.stringify(plan).slice(0, 2000));
        return json({ error: "AI returned an unusable plan. Please try again." }, 502);
      }
      const { data: insertedMeals, error: mErr } = await admin.from("meals").insert(rows).select();
      if (mErr) {
        console.error("Meal insert error:", mErr.message, "First row:", JSON.stringify(rows[0]).slice(0, 500));
        return json({ error: mErr.message }, 500);
      }

      // Build grocery list from each meal's ingredients (so each item knows its source).
      const stocked = new Set(pantryNames.map((n: string) => n.toLowerCase().trim()));
      const { data: existing } = await admin
        .from("grocery_items")
        .select("name")
        .eq("user_id", userId)
        .eq("bought", false);
      const have = new Set((existing ?? []).map((g: any) => String(g.name).toLowerCase().trim()));
      const aiCats: Record<string, string> = {};
      (plan.grocery ?? []).forEach((g: any) => {
        if (g?.name && g.category) aiCats[String(g.name).toLowerCase().trim()] = g.category;
      });
      const groceryRows: any[] = [];
      for (const meal of insertedMeals ?? []) {
        for (const ingRaw of (meal.ingredients ?? [])) {
          const ing = String(ingRaw).trim();
          if (!ing) continue;
          const key = ing.toLowerCase();
          if (stocked.has(key) || have.has(key)) continue;
          have.add(key);
          groceryRows.push({
            user_id: userId,
            name: ing.slice(0, 120),
            qty: null,
            category: aiCats[key] ?? guessCategory(ing),
            bought: false,
            source_meal_id: meal.id,
            source_meal_name: meal.name,
            source_slot: meal.slot,
            source_date: meal.date,
          });
        }
      }
      if (groceryRows.length) {
        const { error: gErr } = await admin.from("grocery_items").insert(groceryRows);
        if (gErr) return json({ error: gErr.message }, 500);
      }
      return json({ ok: true, meals: rows.length, grocery: groceryRows.length });
    }

    return json({ ok: true, meals: 0, grocery: 0 });
  } catch (e) {
    console.error("ai-meal-plan error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function guessCategory(item: string): string {
  const s = item.toLowerCase();
  if (/(chicken|beef|pork|turkey|fish|salmon|tuna|shrimp|tofu|egg|bacon|sausage)/.test(s)) return "Protein";
  if (/(milk|cheese|yogurt|butter|cream)/.test(s)) return "Dairy";
  if (/(bread|bun|tortilla|bagel|roll)/.test(s)) return "Bakery";
  if (/(frozen|ice cream)/.test(s)) return "Frozen";
  if (/(rice|pasta|flour|sugar|oil|sauce|bean|lentil|spice|salt|pepper|broth|stock|vinegar)/.test(s)) return "Pantry";
  if (/(apple|banana|berry|tomato|onion|garlic|pepper|lettuce|spinach|carrot|potato|broccoli|cucumber|lemon|lime|avocado|herb|cilantro|parsley|basil)/.test(s)) return "Produce";
  return "Other";
}

async function callAI(apiKey: string, userMsg: string, tool: any): Promise<{ args?: unknown; error?: string; status?: number }> {
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: userMsg },
      ],
      tools: [tool],
      tool_choice: { type: "function", function: { name: tool.function.name } },
    }),
  });
  if (resp.status === 429) return { error: "Rate limited. Please try again in a moment.", status: 429 };
  if (resp.status === 402) return { error: "AI credits exhausted. Add funds in Settings → Workspace → Usage.", status: 402 };
  if (!resp.ok) {
    const t = await resp.text();
    console.error("AI gateway error:", resp.status, t);
    return { error: "AI gateway error", status: 500 };
  }
  const data = await resp.json();
  const call = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!call?.function?.arguments) return { error: "AI returned no tool call", status: 500 };
  try {
    return { args: JSON.parse(call.function.arguments) };
  } catch {
    return { error: "AI returned invalid JSON", status: 500 };
  }
}