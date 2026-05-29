import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { meterRequest, WEIGHTS } from "../_shared/ai-meter.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

interface CareContext {
  name: string;
  kind?: string;
  age?: number | null;
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
  contacts?: { name: string; role?: string; phone?: string }[];
  providers?: { name: string; role: string; specialty?: string | null }[];
  medicalHistory?: { date: string; title: string; category?: string | null; notes?: string | null }[];
  recentNotes?: { date: string; body: string }[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const __gate = await meterRequest(req, WEIGHTS.light, corsHeaders);
    if ("response" in __gate) return __gate.response;
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "Missing LOVABLE_API_KEY" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { focus = "general", prompt = "", context } = body as { focus?: string; prompt?: string; context: CareContext };

    if (!context || typeof context !== "object" || !context.name) {
      return new Response(JSON.stringify({ error: "context.name required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const system = `You are a compassionate, evidence-aware care planning assistant. You help family caregivers think through developmental, mental, and physical support strategies for the person they care for. You write warm, practical, non-diagnostic guidance. Always: (1) acknowledge the person's strengths and needs, (2) give 3-6 specific, actionable suggestions tied to the provided context, (3) flag when professional/medical follow-up is appropriate, (4) be concise (under 300 words), (5) never present clinical advice as diagnosis. Output well-formatted markdown.`;

    const focusLine: Record<string, string> = {
      developmental: "Focus on developmental support appropriate to age and education level.",
      mental: "Focus on mental and emotional wellbeing, sensory needs, and love languages.",
      physical: "Focus on physical health, medication adherence, mobility, nutrition, and routines.",
      daily: "Focus on a calm, supportive daily plan that fits the schedule and energy.",
      general: "Give a balanced supportive note that pulls from the most relevant pieces of context.",
    };

    const userMsg = [
      `Focus: ${focusLine[focus] ?? focusLine.general}`,
      prompt ? `Caregiver's question: ${prompt}` : "",
      `\nProfile context (JSON):\n\`\`\`json\n${JSON.stringify(context, null, 2)}\n\`\`\``,
    ].filter(Boolean).join("\n\n");

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
    const text = data?.choices?.[0]?.message?.content ?? "";
    return new Response(JSON.stringify({ body: text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});