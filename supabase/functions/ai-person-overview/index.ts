import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { meterRequest, WEIGHTS } from "../_shared/ai-meter.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

interface Payload {
  recipient: {
    id: string;
    name: string;
    kind?: string;
    birthDate?: string | null;
    zodiac?: string | null;
    location?: string | null;
    notes?: string | null;
    sensory?: string | null;
    loveLanguages?: string[];
    foodPreferences?: Record<string, any>;
    school?: string | null;
    educationLevel?: string | null;
    schedule?: Record<string, string>;
    meds?: { name: string; dose?: string; schedule?: string }[];
  };
  cyclePhase?: string | null;
  routineTitles?: string[];
  habitTitles?: string[];
}

function ageFrom(birth?: string | null): number | null {
  if (!birth) return null;
  const d = new Date(birth);
  if (isNaN(d.getTime())) return null;
  const diff = Date.now() - d.getTime();
  return Math.max(0, Math.floor(diff / (365.25 * 24 * 3600 * 1000)));
}

async function sha(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const gate = await meterRequest(req, WEIGHTS.heavy, corsHeaders);
    if ("response" in gate) return gate.response;
    const userId = gate.userId;

    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "Missing LOVABLE_API_KEY" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json().catch(() => ({}))) as Payload;
    const { recipient, cyclePhase = null, routineTitles = [], habitTitles = [] } = body || ({} as Payload);
    if (!recipient?.id || !recipient?.name) {
      return new Response(JSON.stringify({ error: "recipient.id and recipient.name required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const age = ageFrom(recipient.birthDate);
    const signature = await sha(JSON.stringify({
      r: { ...recipient, id: undefined }, age, cyclePhase, routineTitles, habitTitles,
      v: 1,
    }));

    const system = `You are a compassionate, evidence-aware care planning assistant who designs holistic developmental dashboards for the people a caregiver looks after. You synthesize age, diagnosis (from notes), zodiac, cycle phase, education, schedule, food preferences, sensory needs and love languages into supportive, non-clinical guidance. Return STRICT JSON only — no prose, no code fences — matching this schema:
{
  "snapshot": string,                       // 2-3 warm sentences summarizing where this person is right now
  "devPlan": [{ "area": string, "focus": string, "why": string }],  // 4-6 developmental focus areas appropriate to age
  "foods": [{ "title": string, "why": string }],                    // 4-6 foods/nutrition tips honoring preferences & allergies
  "habits": [{ "title": string, "why": string }],                   // 3-5 habits that support them
  "carePlan": [{ "title": string, "detail": string }],              // 3-5 care plan moves grounded in their diagnosis/notes
  "routines": [{ "title": string, "when": string, "why": string }], // 3-5 routine ideas tied to their schedule & energy
  "activities": [{ "title": string, "why": string }],               // 4-6 enriching activities aligned with love languages & interests
  "cycle": string | null,                                            // brief cycle-aware support note if cyclePhase given, else null
  "zodiacNote": string | null                                        // one playful line tying zodiac traits to support style, else null
}
Be specific to the context. Never diagnose. Flag when a professional should be looped in.`;

    const userMsg = [
      `Person: ${recipient.name} (${recipient.kind ?? "unknown"})`,
      age != null ? `Age: ${age}` : "",
      recipient.zodiac ? `Zodiac: ${recipient.zodiac}` : "",
      cyclePhase ? `Cycle phase: ${cyclePhase}` : "",
      recipient.educationLevel ? `Education: ${recipient.educationLevel}` : "",
      recipient.school ? `School: ${recipient.school}` : "",
      recipient.loveLanguages?.length ? `Love languages: ${recipient.loveLanguages.join(", ")}` : "",
      routineTitles.length ? `Current routines: ${routineTitles.slice(0, 12).join("; ")}` : "",
      habitTitles.length ? `Current habits: ${habitTitles.slice(0, 12).join("; ")}` : "",
      `\nFull context JSON:\n${JSON.stringify({ recipient, cyclePhase }, null, 2)}`,
    ].filter(Boolean).join("\n");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: userMsg },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      return new Response(JSON.stringify({ error: `AI gateway: ${res.status} ${t}` }), {
        status: res.status === 429 || res.status === 402 ? res.status : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    let raw = data?.choices?.[0]?.message?.content ?? "{}";
    // Strip any accidental code fences
    raw = String(raw).replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
    let payload: Record<string, unknown> = {};
    try { payload = JSON.parse(raw); } catch { payload = { snapshot: raw }; }

    // Cache it
    try {
      const svc = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      await svc.from("person_overviews").upsert({
        user_id: userId,
        recipient_id: recipient.id,
        signature,
        payload,
        generated_at: new Date().toISOString(),
      }, { onConflict: "user_id,recipient_id" });
    } catch (_) {
      // cache failure shouldn't break the response
    }

    return new Response(JSON.stringify({ payload, signature, generatedAt: new Date().toISOString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as any)?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});