import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { meterRequest, WEIGHTS } from "../_shared/ai-meter.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

interface Payload {
  recipient: {
    id: string;
    name: string;
    kind?: string;
    age?: number | null;
    zodiac?: string | null;
    diagnoses?: string[];
    diagnosisNotes?: string | null;
    notes?: string | null;
  };
  monthLabel: string; // e.g. "May 2026"
  rangeStart: string;
  rangeEnd: string;
  progress: {
    totals: Record<string, number>;
    recentMilestones: { label: string; date: string; notes?: string | null }[];
    moodAvg: number | null;
    healthCounts: Record<string, number>;
  };
  goals: { title: string; status: string; current?: number | null; target?: number | null; unit?: string | null }[];
  checkins: {
    count: number;
    moodAvg: number | null;
    energyAvg: number | null;
    topTags: { tag: string; count: number }[];
    notes: string[]; // up to ~20 short snippets
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const gate = await meterRequest(req, WEIGHTS.heavy, corsHeaders);
    if ("response" in gate) return gate.response;

    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "Missing LOVABLE_API_KEY" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json().catch(() => ({}))) as Payload;
    if (!body?.recipient?.name) {
      return new Response(JSON.stringify({ error: "recipient required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const system = `You are a warm, evidence-aware caregiving analyst. You write concise monthly progress reports for the people a caregiver looks after. Return STRICT JSON only (no prose, no code fences) matching this schema:
{
  "headline": string,                            // one warm sentence summarizing the month
  "summary": string,                             // 3-5 sentence narrative of how the month went
  "highlights": [{ "title": string, "detail": string }],   // 3-5 wins / breakthroughs
  "concerns": [{ "title": string, "detail": string }],     // 0-4 things to keep an eye on
  "moodInsight": string,                         // short read on emotional/energy patterns
  "checkinInsight": string,                      // short read on check-in cadence + themes
  "suggestedGoals": [{
    "title": string,
    "category": "milestone" | "skill" | "mood" | "health" | "behavior" | "custom",
    "why": string,
    "firstStep": string,
    "targetWindow": string                       // e.g. "next 2 weeks", "by end of next month"
  }],                                            // 3-5 concrete next goals
  "caregiverNote": string                        // 1-2 sentences of encouragement for the caregiver
}
Ground every recommendation in the supplied data. Never diagnose. If a domain (mood, milestones, health) has no data, say so plainly rather than inventing it.`;

    const userMsg = [
      `Monthly report for ${body.recipient.name} (${body.recipient.kind ?? "person"}) — ${body.monthLabel}`,
      body.recipient.age != null ? `Age: ${body.recipient.age}` : "",
      body.recipient.zodiac ? `Zodiac: ${body.recipient.zodiac}` : "",
      body.recipient.diagnoses?.length ? `Diagnoses: ${body.recipient.diagnoses.join(", ")}` : "",
      body.recipient.diagnosisNotes ? `Diagnosis notes: ${body.recipient.diagnosisNotes}` : "",
      body.recipient.notes ? `Profile notes: ${body.recipient.notes}` : "",
      `\nWindow: ${body.rangeStart} → ${body.rangeEnd}`,
      `\nProgress data:\n${JSON.stringify(body.progress, null, 2)}`,
      `\nActive goals:\n${JSON.stringify(body.goals, null, 2)}`,
      `\nCheck-in data:\n${JSON.stringify(body.checkins, null, 2)}`,
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
    raw = String(raw).replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
    let payload: Record<string, unknown> = {};
    try { payload = JSON.parse(raw); } catch { payload = { summary: raw }; }

    return new Response(JSON.stringify({ payload, generatedAt: new Date().toISOString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as any)?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});