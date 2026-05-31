import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

interface Body {
  prompt: string;
  /** Optional contextual hint shown as a chip ("low_stock", "this_week_meals", etc.) */
  hint?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI key missing" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const auth = req.headers.get("Authorization") ?? "";
    const supa = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: auth } },
    });
    const { data: u } = await supa.auth.getUser();
    const uid = u.user?.id;
    if (!uid) {
      return new Response(JSON.stringify({ error: "unauthenticated" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as Body;
    if (!body?.prompt || typeof body.prompt !== "string") {
      return new Response(JSON.stringify({ error: "prompt required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pull a compact pantry + grocery context.
    const [{ data: pantry }, { data: grocery }, { data: meals }] = await Promise.all([
      supa.from("pantry_items").select("name,category,in_stock").eq("user_id", uid).limit(80),
      supa.from("grocery_items").select("name,category,bought,stock_status").eq("user_id", uid).eq("bought", false).limit(80),
      supa.from("meals").select("name,slot,date").eq("user_id", uid).gte("date", new Date().toISOString().slice(0, 10)).order("date").limit(20),
    ]);

    const sys = `You are a calm grocery & meal-planning assistant for a busy caregiver.
Be concise. Return short markdown with bullet lists.
You can suggest meals from what's in the pantry, list missing staples, and propose a shopping list.
Never invent allergies or dietary rules the user hasn't stated.`;

    const context = [
      `Pantry (${pantry?.length ?? 0}):`,
      ...(pantry ?? []).map((p: any) => `- ${p.name}${p.in_stock ? "" : " (out)"}`),
      ``,
      `Grocery list (${grocery?.length ?? 0}):`,
      ...(grocery ?? []).map((g: any) => `- ${g.name} [${g.stock_status}]`),
      ``,
      `Upcoming meals (${meals?.length ?? 0}):`,
      ...(meals ?? []).map((m: any) => `- ${m.date} ${m.slot}: ${m.name}`),
    ].join("\n");

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: `${body.hint ? `Hint: ${body.hint}\n\n` : ""}${body.prompt}\n\nContext:\n${context}` },
        ],
      }),
    });

    if (r.status === 402) {
      return new Response(JSON.stringify({ error: "credits_exhausted" }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (r.status === 429) {
      return new Response(JSON.stringify({ error: "rate_limited" }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!r.ok) {
      const t = await r.text();
      return new Response(JSON.stringify({ error: t.slice(0, 400) }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const j = await r.json();
    const answer = j.choices?.[0]?.message?.content ?? "";
    return new Response(JSON.stringify({ answer }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});