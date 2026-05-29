import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { meterRequest, WEIGHTS } from "../_shared/ai-meter.ts";

const LOVABLE_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

interface Body {
  date?: string;
  weather?: {
    location?: string;
    tempC?: number;
    condition?: string;
    highC?: number;
    lowC?: number;
    rainChance?: number;
  } | null;
  moon?: { phase?: string; sign?: string; element?: string; illumination?: number } | null;
  taskLoad?: { total?: number; topThree?: string[] };
  energy?: "low" | "medium" | "high" | null;
  caregivingLoad?: "light" | "normal" | "heavy" | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const __gate = await meterRequest(req, WEIGHTS.light, corsHeaders);
    if ("response" in __gate) return __gate.response;
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json().catch(() => ({}))) as Body;
    const w = body.weather;
    const m = body.moon;
    const ctx = [
      body.date ? `Date: ${body.date}` : null,
      w ? `Weather: ${w.condition ?? "—"} at ${w.tempC ?? "?"}°C in ${w.location ?? "your area"} (H ${w.highC ?? "?"} / L ${w.lowC ?? "?"}, ${w.rainChance ?? 0}% rain).` : null,
      m ? `Moon: ${m.phase ?? "—"} in ${m.sign ?? "—"}, ${m.element ?? ""} element (${m.illumination ?? 0}% lit).` : null,
      body.taskLoad ? `Today's tasks: ${body.taskLoad.total ?? 0} planned${body.taskLoad.topThree?.length ? `, including: ${body.taskLoad.topThree.join("; ")}` : ""}.` : null,
      body.energy ? `Reported energy: ${body.energy}.` : null,
      body.caregivingLoad ? `Caregiving load: ${body.caregivingLoad}.` : null,
    ].filter(Boolean).join("\n");

    const system = [
      "You are a calm, caregiver-friendly daily planner for the CareFlow app.",
      "Write ONE short paragraph (2-3 sentences, max ~55 words) of practical guidance.",
      "Tone: warm, grounded, never mystical or pushy. Plain language, not horoscope-speak.",
      "Reference the weather and moon energy lightly, and suggest a planning style for the day (e.g. indoor organizing, gentle errands, reflection, connection).",
      "Do not use bullet points, headings, emojis, or hashtags. Just one short paragraph.",
    ].join(" ");

    const resp = await fetch(LOVABLE_GATEWAY, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: ctx || "Give a gentle, general guidance for today." },
        ],
      }),
    });

    if (resp.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit reached. Try again in a moment." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (resp.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Settings → Workspace → Usage." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!resp.ok) {
      const text = await resp.text();
      return new Response(JSON.stringify({ error: `AI gateway error [${resp.status}]: ${text}` }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const text = data?.choices?.[0]?.message?.content?.trim?.() ?? "";
    return new Response(JSON.stringify({ guidance: text }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});