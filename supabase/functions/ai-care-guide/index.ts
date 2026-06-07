import { corsHeaders } from "../_shared/cors.ts";
import { meterRequest, WEIGHTS } from "../_shared/ai-meter.ts";

const LOVABLE_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

interface CareGuideContext {
  date?: string;
  atmosphere?: string | null;
  energy?: "low" | "medium" | "high" | null;
  caregivingLoad?: "light" | "normal" | "heavy" | null;
  topAnchors?: { key: string; label: string; flowPct: number }[];
  taskLoad?: { total?: number; topThree?: string[] };
  recentJournalThemes?: string[];
  pantryLowItems?: string[];
  weather?: { tempC?: number; condition?: string; rainChance?: number } | null;
  moon?: { phase?: string; sign?: string; element?: string } | null;
}

const FALLBACK = {
  focus: [
    { title: "One small kind thing", why: "Start gently to build momentum" },
    { title: "Tend a quiet anchor", why: "Notice which area is calling for care" },
  ],
  anchor_reminder: "Notice which anchor feels under-tended today — even one breath toward it counts.",
  rhythm_insight: "Your energy moves in waves. Match the wave rather than fight it.",
  dinner_suggestion: "Something warm, simple, and already in your pantry.",
  exhale_prompt: "What is one thing you can release before the day ends?",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const gate = await meterRequest(req, WEIGHTS.medium, corsHeaders);
    if ("response" in gate) return gate.response;

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ctx = (await req.json().catch(() => ({}))) as CareGuideContext;

    const system = [
      "You are Care Guide, a warm, calm companion inside CareFlow.",
      "The user lives by the CARE framework: Capture · Anchor · Rhythm · Exhale.",
      "Speak gently, like a trusted friend. No mysticism, no urgency, no scolding.",
      "Return STRICT JSON with this exact shape (no markdown, no commentary):",
      `{`,
      `  "focus": [{"title": string, "why": string}],`,
      `  "anchor_reminder": string,`,
      `  "rhythm_insight": string,`,
      `  "dinner_suggestion": string,`,
      `  "exhale_prompt": string`,
      `}`,
      "focus has 2–3 items. Each field is one short sentence (max ~22 words).",
    ].join("\n");

    const userPrompt = `Context (JSON):\n${JSON.stringify(ctx, null, 2)}\n\nReturn the JSON now.`;

    const resp = await fetch(LOVABLE_GATEWAY, {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (resp.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit — try again shortly.", brief: FALLBACK }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (resp.status === 402) {
      return new Response(JSON.stringify({ error: "ai_quota_exceeded", message: "AI credits exhausted.", brief: FALLBACK }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!resp.ok) {
      const text = await resp.text();
      return new Response(JSON.stringify({ error: `AI gateway error: ${text}`, brief: FALLBACK }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const content = data?.choices?.[0]?.message?.content ?? "{}";
    let brief: any;
    try { brief = JSON.parse(content); } catch { brief = FALLBACK; }

    // Defensive shape normalization
    brief = {
      focus: Array.isArray(brief?.focus) ? brief.focus.slice(0, 3).map((f: any) => ({
        title: String(f?.title ?? "Small kind thing"),
        why: String(f?.why ?? ""),
      })) : FALLBACK.focus,
      anchor_reminder: String(brief?.anchor_reminder ?? FALLBACK.anchor_reminder),
      rhythm_insight: String(brief?.rhythm_insight ?? FALLBACK.rhythm_insight),
      dinner_suggestion: String(brief?.dinner_suggestion ?? FALLBACK.dinner_suggestion),
      exhale_prompt: String(brief?.exhale_prompt ?? FALLBACK.exhale_prompt),
    };

    return new Response(JSON.stringify({ brief }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message, brief: FALLBACK }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});