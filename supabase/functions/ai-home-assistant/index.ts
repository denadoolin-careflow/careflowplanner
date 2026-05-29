import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { meterRequest, WEIGHTS } from "../_shared/ai-meter.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

type Mode = "maintenance" | "rhythm" | "zone_checklist";

interface Body {
  mode: Mode;
  context?: {
    existing?: string[];
    slotsSummary?: Record<string, string[]>;
    season?: string;
    notes?: string;
    zone?: string;
    energy?: "low" | "medium" | "deep";
  };
}

const MAINTENANCE_TOOL = {
  type: "function",
  function: {
    name: "suggest_maintenance",
    description: "Suggest 4-6 home maintenance tasks the user likely hasn't tracked yet.",
    parameters: {
      type: "object",
      properties: {
        suggestions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              category: { type: "string", description: "e.g. HVAC, Plumbing, Lawn, Safety, Appliance" },
              interval_months: { type: "number", description: "Recurrence in months, 0 for one-off" },
              reason: { type: "string", description: "One short calm sentence explaining why" },
            },
            required: ["title", "category", "interval_months", "reason"],
            additionalProperties: false,
          },
        },
      },
      required: ["suggestions"],
      additionalProperties: false,
    },
  },
};

const RHYTHM_TOOL = {
  type: "function",
  function: {
    name: "suggest_rhythm",
    description: "Suggest a gentle, low-overwhelm daily home rhythm split across morning, afternoon, evening, and night.",
    parameters: {
      type: "object",
      properties: {
        morning: { type: "array", items: { type: "string" }, description: "2-4 gentle items" },
        afternoon: { type: "array", items: { type: "string" } },
        evening: { type: "array", items: { type: "string" } },
        night: { type: "array", items: { type: "string" } },
        encouragement: { type: "string", description: "One warm, calm sentence for the caregiver" },
      },
      required: ["morning", "afternoon", "evening", "night", "encouragement"],
      additionalProperties: false,
    },
  },
};

const ZONE_CHECKLIST_TOOL = {
  type: "function",
  function: {
    name: "suggest_zone_checklist",
    description: "Build a calm, ordered cleaning checklist for a single home zone.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Short title for the checklist, e.g. 'Kitchen reset'" },
        items: {
          type: "array",
          description: "6-12 ordered tasks, short and actionable",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              category: { type: "string", description: "e.g. Surfaces, Floors, Declutter, Deep" },
              est_minutes: { type: "number" },
            },
            required: ["title", "est_minutes"],
            additionalProperties: false,
          },
        },
      },
      required: ["name", "items"],
      additionalProperties: false,
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const __gate = await meterRequest(req, WEIGHTS.medium, corsHeaders);
    if ("response" in __gate) return __gate.response;
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
    const { mode, context = {} } = (await req.json()) as Body;
    if (mode !== "maintenance" && mode !== "rhythm" && mode !== "zone_checklist") {
      return new Response(JSON.stringify({ error: "Invalid mode" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const season = context.season ?? inferSeason();
    const existing = (context.existing ?? []).slice(0, 40).join(", ") || "(none)";

    const systemBase = "You are a calm, emotionally supportive home assistant for stay-at-home parents and caregivers. Favor low-overwhelm, practical, kind suggestions. Avoid jargon. Never shame or pressure.";

    let userPrompt = "";
    let tool;
    if (mode === "maintenance") {
      tool = MAINTENANCE_TOOL;
      userPrompt = `Season: ${season}.\nAlready tracked: ${existing}.\nSuggest 4-6 maintenance tasks the household likely needs but hasn't tracked. Avoid duplicates of the tracked list. Mix seasonal + always-relevant. Use realistic recurrence intervals.`;
    } else if (mode === "rhythm") {
      tool = RHYTHM_TOOL;
      const slots = context.slotsSummary ?? {};
      const slotsText = Object.entries(slots).map(([k, v]) => `${k}: ${(v ?? []).join(", ") || "(empty)"}`).join("\n");
      userPrompt = `Today's planned rhythm so far:\n${slotsText || "(empty)"}\n${context.notes ? `Notes: ${context.notes}\n` : ""}Fill in gentle additions for each time slot. Keep items short (2-6 words). Mix tiny resets, self-care, family, and home tasks. Don't repeat what's already planned.`;
    } else {
      tool = ZONE_CHECKLIST_TOOL;
      const zone = context.zone ?? "Whole home";
      const energy = context.energy ?? "medium";
      userPrompt = `Build a ${energy}-energy cleaning checklist for the ${zone}.\nAlready tracked tasks (avoid duplicates): ${existing}.\nKeep items short, ordered top-to-bottom, and realistic to finish in one session. Include estimated minutes per task.`;
    }

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemBase },
          { role: "user", content: userPrompt },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: tool.function.name } },
      }),
    });

    if (resp.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit reached — please try again in a moment." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (resp.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Settings → Workspace → Usage." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI gateway error", resp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    const args = call?.function?.arguments ? JSON.parse(call.function.arguments) : {};
    return new Response(JSON.stringify(args), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function inferSeason() {
  const m = new Date().getMonth();
  if (m <= 1 || m === 11) return "winter";
  if (m <= 4) return "spring";
  if (m <= 7) return "summer";
  return "fall";
}