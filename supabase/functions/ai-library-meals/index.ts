import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { meterRequest, WEIGHTS } from "../_shared/ai-meter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `You generate cozy, realistic family recipes for a busy caregiver's personal recipe library.
Respect dietary restrictions, allergies, dislikes, family size, and prep time.
Keep titles short (2-5 words), warm, and descriptive. Steps are 4-7 short imperatives. Ingredients are common and concrete.
Pick a single matching food emoji as the icon.`;

const tool = {
  type: "function",
  function: {
    name: "return_library_meals",
    description: "Return a batch of recipes for the user's recipe library.",
    parameters: {
      type: "object",
      properties: {
        meals: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              slot: { type: "string", enum: ["Breakfast", "Lunch", "Dinner", "Snack"] },
              prep_minutes: { type: "number" },
              cook_minutes: { type: "number" },
              servings: { type: "number" },
              ingredients: { type: "array", items: { type: "string" } },
              steps: { type: "array", items: { type: "string" } },
              tags: { type: "array", items: { type: "string" } },
              energy_level: { type: "string", enum: ["low", "medium", "high"] },
              icon: { type: "string", description: "single food emoji" },
            },
            required: ["title", "description", "ingredients", "steps", "icon"],
            additionalProperties: false,
          },
        },
      },
      required: ["meals"],
      additionalProperties: false,
    },
  },
} as const;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const __gate = await meterRequest(req, WEIGHTS.heavy, corsHeaders);
    if ("response" in __gate) return __gate.response;
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) return json({ error: "Missing auth" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY not configured" }, 500);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });
    const { data: u, error: uErr } = await userClient.auth.getUser();
    if (uErr || !u.user) return json({ error: "Not authenticated" }, 401);
    const userId = u.user.id;

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const body = await req.json().catch(() => ({}));
    const count: number = Math.max(1, Math.min(10, Number(body.count ?? 3)));
    const slot: string | null = body.slot && body.slot !== "Any" ? String(body.slot) : null;
    const vibe: string = String(body.vibe ?? "").slice(0, 500);
    const tags: string[] = Array.isArray(body.tags) ? body.tags.slice(0, 8).map(String) : [];
    const withImages: boolean = body.with_images !== false;

    const { data: prefRow } = await admin
      .from("meal_preferences").select("*").eq("user_id", userId).maybeSingle();
    const prefs = prefRow ?? {
      family_size: 2, diets: [], allergies: [], dislikes: [], cuisines: [],
      budget_level: "medium", max_prep_minutes: 30, low_energy: false, picky_notes: null,
    };

    const userMsg = `Generate exactly ${count} unique recipes for the library.
${slot ? `Slot: ${slot}.` : "Mix of slots is fine."}
${vibe ? `Vibe / focus: ${vibe}` : ""}
${tags.length ? `Required tags / qualities: ${tags.join(", ")}` : ""}
Family size: ${prefs.family_size}.
Diets: ${(prefs.diets ?? []).join(", ") || "none"}.
Allergies: ${(prefs.allergies ?? []).join(", ") || "none"}.
Dislikes: ${(prefs.dislikes ?? []).join(", ") || "none"}.
Cuisines preferred: ${(prefs.cuisines ?? []).join(", ") || "any"}.
Budget level: ${prefs.budget_level}. Max prep minutes: ${prefs.max_prep_minutes}.
Low energy mode: ${prefs.low_energy}. Picky notes: ${prefs.picky_notes ?? "none"}.
Make recipes feel cozy, doable, and varied. Description is one warm sentence.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userMsg },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "return_library_meals" } },
      }),
    });
    if (aiResp.status === 429) return json({ error: "Rate limited. Please try again in a moment." }, 429);
    if (aiResp.status === 402) return json({ error: "AI credits exhausted. Add funds in Settings → Workspace → Usage." }, 402);
    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, t);
      return json({ error: "AI gateway error" }, 500);
    }
    const aiData = await aiResp.json();
    const call = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!call?.function?.arguments) return json({ error: "AI returned no recipes" }, 500);
    let parsed: any;
    try { parsed = JSON.parse(call.function.arguments); } catch { return json({ error: "AI invalid JSON" }, 500); }
    const meals: any[] = Array.isArray(parsed.meals) ? parsed.meals : [];
    if (meals.length === 0) return json({ error: "AI returned no recipes" }, 500);

    let createdCount = 0;
    let imageCount = 0;
    let imageFails = 0;

    for (const m of meals) {
      let imageUrl: string | null = null;
      if (withImages && m.title) {
        try {
          const prompt = `Cozy overhead food photography of "${m.title}". ${m.description ?? ""}. Warm natural light, rustic linen and ceramic plate, shallow depth of field, inviting and homemade, soft shadows, no text, no watermark.`;
          const imgResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-image",
              messages: [{ role: "user", content: prompt }],
              modalities: ["image", "text"],
            }),
          });
          if (imgResp.ok) {
            const ij = await imgResp.json();
            const dataUrl: string | undefined = ij.choices?.[0]?.message?.images?.[0]?.image_url?.url;
            if (dataUrl?.startsWith("data:image")) {
              const comma = dataUrl.indexOf(",");
              const b64 = dataUrl.slice(comma + 1);
              const bytes = b64ToBytes(b64);
              const path = `${userId}/${crypto.randomUUID()}.png`;
              const { error: upErr } = await admin.storage.from("meal-images").upload(path, bytes, {
                contentType: "image/png", upsert: false,
              });
              if (!upErr) {
                const { data: pub } = admin.storage.from("meal-images").getPublicUrl(path);
                imageUrl = pub.publicUrl;
                imageCount++;
              } else {
                console.error("storage upload error:", upErr.message);
                imageFails++;
              }
            } else {
              imageFails++;
            }
          } else {
            imageFails++;
            console.error("image gen error:", imgResp.status, await imgResp.text());
          }
        } catch (e) {
          imageFails++;
          console.error("image gen exception:", e);
        }
      }

      const row: any = {
        user_id: userId,
        title: String(m.title).slice(0, 200),
        description: m.description ? String(m.description).slice(0, 500) : null,
        slot: m.slot ?? slot ?? null,
        prep_minutes: typeof m.prep_minutes === "number" ? m.prep_minutes : null,
        cook_minutes: typeof m.cook_minutes === "number" ? m.cook_minutes : null,
        servings: typeof m.servings === "number" ? m.servings : null,
        ingredients: Array.isArray(m.ingredients) ? m.ingredients.map(String) : [],
        steps: Array.isArray(m.steps) ? m.steps.map(String) : [],
        tags: Array.isArray(m.tags) ? m.tags.map(String) : [],
        energy_level: m.energy_level ?? "medium",
        icon: m.icon ?? "🍽️",
        image_url: imageUrl,
        is_favorite: false,
        is_archived: false,
      };
      const { error: insErr } = await admin.from("meals_library").insert(row);
      if (insErr) console.error("insert error:", insErr.message);
      else createdCount++;
    }

    return json({ ok: true, created: createdCount, images: imageCount, image_fails: imageFails });
  } catch (e) {
    console.error("ai-library-meals error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});