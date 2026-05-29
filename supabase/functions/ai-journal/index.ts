import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { meterRequest, WEIGHTS } from "../_shared/ai-meter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TEMPLATE_HINTS: Record<string, string> = {
  gratitude: "gratitude — what felt good, who/what to appreciate, small wins",
  "brain-dump": "brain dump — clear the head, surface what's loud, unfiltered",
  "caregiver-reflection": "caregiver reflection — capacity, recipient changes, what's full/empty",
  "emotional-checkin": "emotional check-in — feelings named, body sensations, what's underneath",
  "daily-reset": "daily reset — close the day softly, what to release, what to carry forward",
  productivity: "productivity reflection — focus, friction, energy spent, lessons",
  "habit-reflection": "habit reflection — what stuck, what slipped, why, gentle adjustments",
  daily: "general daily reflection",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const __gate = await meterRequest(req, WEIGHTS.medium, corsHeaders);
    if ("response" in __gate) return __gate.response;
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { template = "daily", mood = "", energy = "", context = "" } = await req.json();
    const hint = TEMPLATE_HINTS[template] ?? TEMPLATE_HINTS.daily;

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return new Response(JSON.stringify({ error: "AI not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const system = "You generate gentle, caregiver-aware journaling prompts. Return exactly 4 short, open-ended prompts as a JSON array of strings. No markdown, no preamble, no numbering — just the JSON array.";
    const userMsg = `Template: ${hint}\nMood: ${mood || "(unspecified)"}\nEnergy: ${energy || "(unspecified)"}\nContext: ${context || "(none)"}\n\nReturn ONLY a JSON array like [\"prompt one\", \"prompt two\", \"prompt three\", \"prompt four\"].`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: system },
          { role: "user", content: userMsg },
        ],
      }),
    });

    if (resp.status === 429) return new Response(JSON.stringify({ error: "Rate limit reached. Please try again in a moment." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (resp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Settings." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI gateway error", resp.status, t);
      return new Response(JSON.stringify({ error: "AI request failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const data = await resp.json();
    const text = (data.choices?.[0]?.message?.content ?? "").trim();
    let prompts: string[] = [];
    try {
      const match = text.match(/\[[\s\S]*\]/);
      prompts = JSON.parse(match ? match[0] : text);
    } catch {
      prompts = text.split("\n").map((l: string) => l.replace(/^[-*\d.\s]+/, "").trim()).filter(Boolean).slice(0, 4);
    }
    return new Response(JSON.stringify({ prompts }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("ai-journal error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});