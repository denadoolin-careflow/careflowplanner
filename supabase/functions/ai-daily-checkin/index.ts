import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { meterRequest, WEIGHTS } from "../_shared/ai-meter.ts";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

interface Body {
  date?: string;
  name?: string;
  weather?: { location?: string; tempC?: number; condition?: string; highC?: number; lowC?: number; rainChance?: number } | null;
  moon?: { phase?: string; sign?: string; element?: string; illumination?: number; house?: string | number } | null;
  cycle?: { phase?: string; day?: number } | null;
  transits?: string[];
  taskLoad?: { total?: number; topThree?: string[]; overdue?: number };
  goals?: string[];
  habits?: string[];
  recentJournal?: string[];
  season?: string | null;
  energy?: "low" | "medium" | "high" | null;
  mood?: string | null;
  caregivingLoad?: "light" | "normal" | "heavy" | null;
}

const SCHEMA = {
  type: "object",
  properties: {
    energy: {
      type: "object",
      properties: {
        meter: { type: "string", enum: ["calm", "active", "intense"] },
        overall: { type: "string" },
        moodTheme: { type: "string" },
        focusTheme: { type: "string" },
        challenge: { type: "string" },
        opportunity: { type: "string" },
      },
      required: ["meter", "overall", "moodTheme", "focusTheme", "challenge", "opportunity"],
      additionalProperties: false,
    },
    moonGuidance: {
      type: "object",
      properties: {
        summary: { type: "string" },
        houseMeaning: { type: "string" },
        lifeAreas: {
          type: "object",
          properties: {
            relationships: { type: "string" },
            work: { type: "string" },
            family: { type: "string" },
            health: { type: "string" },
            creativity: { type: "string" },
            spiritual: { type: "string" },
            financial: { type: "string" },
          },
          required: ["relationships", "work", "family", "health", "creativity", "spiritual", "financial"],
          additionalProperties: false,
        },
      },
      required: ["summary", "houseMeaning", "lifeAreas"],
      additionalProperties: false,
    },
    method: {
      type: "object",
      properties: {
        capture: { type: "object", properties: { question: { type: "string" }, tags: { type: "array", items: { type: "string" } } }, required: ["question", "tags"], additionalProperties: false },
        anchor: { type: "object", properties: { intention: { type: "string" }, why: { type: "string" } }, required: ["intention", "why"], additionalProperties: false },
        rhythm: {
          type: "object",
          properties: {
            priorities: { type: "array", items: { type: "string" } },
            blocks: { type: "array", items: { type: "object", properties: { time: { type: "string" }, label: { type: "string" }, kind: { type: "string" } }, required: ["time", "label", "kind"], additionalProperties: false } },
          },
          required: ["priorities", "blocks"],
          additionalProperties: false,
        },
        exhale: {
          type: "object",
          properties: {
            release: { type: "string" },
            boundary: { type: "string" },
            selfCare: { type: "string" },
            breathing: { type: "string" },
          },
          required: ["release", "boundary", "selfCare", "breathing"],
          additionalProperties: false,
        },
      },
      required: ["capture", "anchor", "rhythm", "exhale"],
      additionalProperties: false,
    },
    insight: { type: "string" },
    mantra: { type: "string" },
    recommendations: { type: "array", items: { type: "string" } },
  },
  required: ["energy", "moonGuidance", "method", "insight", "mantra", "recommendations"],
  additionalProperties: false,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const gate = await meterRequest(req, WEIGHTS.medium ?? WEIGHTS.light, corsHeaders);
    if ("response" in gate) return gate.response;
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json().catch(() => ({}))) as Body;
    const ctx = [
      body.date && `Date: ${body.date}`,
      body.name && `Name: ${body.name}`,
      body.season && `Life season: ${body.season}`,
      body.weather && `Weather: ${body.weather.condition ?? "?"} ${body.weather.tempC ?? "?"}°C in ${body.weather.location ?? "your area"} (H${body.weather.highC ?? "?"}/L${body.weather.lowC ?? "?"}, ${body.weather.rainChance ?? 0}% rain).`,
      body.moon && `Moon: ${body.moon.phase ?? "?"} in ${body.moon.sign ?? "?"} (${body.moon.illumination ?? 0}% lit)${body.moon.house ? `, activating house ${body.moon.house}` : ""}.`,
      body.cycle && `Cycle: day ${body.cycle.day ?? "?"} ${body.cycle.phase ?? ""}.`,
      body.transits?.length && `Transits: ${body.transits.join("; ")}`,
      body.taskLoad && `Tasks today: ${body.taskLoad.total ?? 0}${body.taskLoad.overdue ? `, ${body.taskLoad.overdue} overdue` : ""}${body.taskLoad.topThree?.length ? `. Top: ${body.taskLoad.topThree.join(" · ")}` : ""}.`,
      body.goals?.length && `Active goals: ${body.goals.join("; ")}`,
      body.habits?.length && `Habits: ${body.habits.join("; ")}`,
      body.recentJournal?.length && `Recent journal snippets: ${body.recentJournal.join(" | ")}`,
      body.energy && `Reported energy: ${body.energy}.`,
      body.mood && `Reported mood: ${body.mood}.`,
      body.caregivingLoad && `Caregiving load: ${body.caregivingLoad}.`,
    ].filter(Boolean).join("\n");

    const system = [
      "You are Carey, CareFlow's calm, thoughtful morning planner.",
      "Return a personalized Daily Check-In as structured JSON matching the provided schema.",
      "Tone: warm, grounded, supportive, never mystical or preachy. Plain, gentle language.",
      "Weave moon, transits, weather, and life context lightly and practically.",
      "Keep every string 1-2 sentences (max ~30 words). Priorities: 3 short verbs+object phrases.",
      "Rhythm.blocks: 4-6 items like {time:'8:30a', label:'Morning walk', kind:'movement'} covering work/rest/meal/water/med/movement.",
      "Mantra: one short affirmation, first-person, present-tense.",
      "Recommendations: 4-6 short actionable suggestions adapted to the day.",
    ].join(" ");

    const resp = await fetch(GATEWAY, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: ctx || "Give a gentle morning check-in for today." },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: "daily_checkin", strict: true, schema: SCHEMA },
        },
      }),
    });

    if (resp.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit reached. Try again in a moment." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (resp.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
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
    const raw = data?.choices?.[0]?.message?.content ?? "{}";
    let payload: unknown;
    try { payload = JSON.parse(raw); } catch { payload = { error: "parse_failed", raw }; }

    return new Response(JSON.stringify({ payload }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});