import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { meterRequest, WEIGHTS } from "../_shared/ai-meter.ts";

interface DayDatum {
  date: string;
  focusMinutes: number;
  tasksDone: number;
  cyclePhase?: string | null;
  cycleDay?: number | null;
  moonPhase?: string | null;
  energy?: string | null;
  mood?: string | null;
}

interface ReqBody {
  days: DayDatum[];
  topTemplates?: { label: string; minutes: number }[];
  topTasks?: { label: string; minutes: number }[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const __gate = await meterRequest(req, WEIGHTS.medium, corsHeaders);
    if ("response" in __gate) return __gate.response;
    const body = (await req.json()) as ReqBody;
    if (!body?.days?.length) {
      return new Response(JSON.stringify({ error: "days[] required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = (Deno.env.get("OPENAI_API_KEY") ?? Deno.env.get("LOVABLE_API_KEY"));
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const system = `You are a gentle, evidence-aware rhythm coach. Look at the user's last 28 days of focus minutes, completed tasks, menstrual cycle phase, and moon phase. Find 2–4 short, kind, specific patterns. Frame everything as observations and invitations — never prescriptions. Avoid medical claims. Honor cycle and lunar rhythms without mysticism. Return strict JSON.`;

    const userPrompt = `Here is the data (JSON):\n${JSON.stringify(body, null, 2)}\n\nReturn JSON with this exact shape:\n{\n  "insights": [\n    { "title": "string", "body": "string (1-2 sentences)", "tag": "focus|cycle|moon|rest|pattern" }\n  ],\n  "summary": "string (one warm sentence)"\n}`;

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5-mini",
        messages: [
          { role: "system", content: system },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit — try again in a minute." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Settings → Workspace → Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI gateway error", detail: errText }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const content = data?.choices?.[0]?.message?.content ?? "{}";
    let parsed: unknown;
    try { parsed = JSON.parse(content); } catch { parsed = { insights: [], summary: content }; }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
