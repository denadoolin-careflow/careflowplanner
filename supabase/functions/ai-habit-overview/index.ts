import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { meterRequest, WEIGHTS } from "../_shared/ai-meter.ts";

interface ReqBody {
  days: { date: string; done: number; total: number }[];
  habits: {
    title: string;
    category: string;
    cadence: string;
    stage: string;
    ratio14d: number;
    streak: number;
    timesOfDay: string[];
    linkedProjects: string[];
    linkedRoutines: number;
  }[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const __gate = await meterRequest(req, WEIGHTS.medium, corsHeaders);
    if ("response" in __gate) return __gate.response;
    const body = (await req.json()) as ReqBody;
    if (!body?.habits?.length) {
      return new Response(JSON.stringify({ error: "habits[] required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const apiKey = (Deno.env.get("OPENAI_API_KEY") ?? Deno.env.get("LOVABLE_API_KEY"));
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const system = `You are a warm, evidence-aware behavior-change coach. Read the user's habit data (28-day rollup, per-habit 14-day completion ratios, growth stages, time-of-day, and linked projects/routines). Identify 2–4 gentle, specific patterns and one tiny invitation. Use behavior-change principles: habit stacking, smallest viable next step, identity-based habits, and self-compassion. No medical claims. No shame. Return strict JSON.`;

    const user = `Data (JSON):\n${JSON.stringify(body, null, 2)}\n\nReturn JSON with this exact shape:\n{\n  "summary": "one warm sentence",\n  "insights": [ { "title": "string", "body": "1-2 sentences", "tag": "growth|consistency|timing|linking|rest" } ]\n}`;

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-5-mini",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
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