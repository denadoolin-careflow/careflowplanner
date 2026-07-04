import { corsHeaders } from "../_shared/cors.ts";
import { meterRequest, WEIGHTS } from "../_shared/ai-meter.ts";

const LOVABLE_GATEWAY = "https://api.openai.com/v1/chat/completions";

interface ExhaleContext {
  date?: string;
  atmosphere?: string | null;
  completedTasks?: { title: string; anchorKey?: string | null }[];
  remainingTasks?: { title: string; anchorKey?: string | null }[];
  topAnchors?: { key: string; label: string; flow: number }[];
  energy?: "low" | "medium" | "high" | null;
  release?: string; // user's tiny release note
}

const FALLBACK = {
  summary: "You showed up today. That's enough.",
  highlights: ["A small act of care"],
  release_reflection: "Let today rest now. It did its work.",
  tomorrow_kind_step: "One small kindness for yourself, first thing.",
  closing_blessing: "Soft breath in. Soft breath out. You're done for today.",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const gate = await meterRequest(req, WEIGHTS.medium, corsHeaders);
    if ("response" in gate) return gate.response;

    const apiKey = (Deno.env.get("OPENAI_API_KEY") ?? Deno.env.get("LOVABLE_API_KEY"));
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ctx = (await req.json().catch(() => ({}))) as ExhaleContext;

    const system = [
      "You are the Exhale companion inside CareFlow.",
      "Your job is to help the user close their day with calm, not productivity.",
      "Tone: tender, grounded, never performative or scolding. Caregiver-aware.",
      "Honor the user's 'release note' if present — reflect it back gently.",
      "Return STRICT JSON only with this exact shape:",
      `{`,
      `  "summary": string,             // 1-2 warm sentences naming what today held`,
      `  "highlights": string[],        // 2-3 short noticings, max 8 words each`,
      `  "release_reflection": string,  // 1 sentence honoring what they're letting go`,
      `  "tomorrow_kind_step": string,  // 1 small, kind, concrete invitation for tomorrow`,
      `  "closing_blessing": string     // 1 soft closing line, like a goodnight`,
      `}`,
    ].join("\n");

    const userPrompt = `Today's context (JSON):\n${JSON.stringify(ctx, null, 2)}\n\nReturn the JSON now.`;

    const resp = await fetch(LOVABLE_GATEWAY, {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-5-mini",
        messages: [
          { role: "system", content: system },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (resp.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit — try again shortly.", exhale: FALLBACK }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (resp.status === 402) {
      return new Response(JSON.stringify({ error: "ai_quota_exceeded", message: "AI credits exhausted.", exhale: FALLBACK }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!resp.ok) {
      const text = await resp.text();
      return new Response(JSON.stringify({ error: `AI gateway error: ${text}`, exhale: FALLBACK }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const content = data?.choices?.[0]?.message?.content ?? "{}";
    let parsed: any;
    try { parsed = JSON.parse(content); } catch { parsed = FALLBACK; }

    const exhale = {
      summary: String(parsed?.summary ?? FALLBACK.summary),
      highlights: Array.isArray(parsed?.highlights)
        ? parsed.highlights.slice(0, 3).map((h: any) => String(h))
        : FALLBACK.highlights,
      release_reflection: String(parsed?.release_reflection ?? FALLBACK.release_reflection),
      tomorrow_kind_step: String(parsed?.tomorrow_kind_step ?? FALLBACK.tomorrow_kind_step),
      closing_blessing: String(parsed?.closing_blessing ?? FALLBACK.closing_blessing),
    };

    return new Response(JSON.stringify({ exhale }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message, exhale: FALLBACK }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});