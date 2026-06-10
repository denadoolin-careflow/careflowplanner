import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { meterRequest, WEIGHTS } from "../_shared/ai-meter.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const gate = await meterRequest(req, WEIGHTS.medium, corsHeaders);
    if ("response" in gate) return gate.response;

    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "Missing LOVABLE_API_KEY" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({} as any));
    const { people = [], recentTasks = [], recentNotes = [], upcomingAppts = [], recentJournal = [], routines = [], chores = [] } = body || {};

    const system = `You are a warm caregiving companion. Write a SHORT JSON snapshot for a caregiving hub.
Return STRICT JSON only — no prose, no code fences — matching:
{
  "snapshot": string,        // 2-3 warm sentences summarizing recent care activity across all people (mention names + 1-2 specifics from tasks/notes/appts)
  "encouragement": string    // 1 short, sincere motivational reminder for the caregiver (no clichés)
}`;

    const userMsg = `People being cared for: ${people.map((p: any) => `${p.name} (${p.kind ?? "?"})`).join(", ") || "none"}

Recent completed tasks (last 14d):
${recentTasks.slice(0, 20).map((t: any) => `- ${t.title}${t.who ? ` [${t.who}]` : ""}`).join("\n") || "  (none)"}

Recent caregiving notes (last 14d):
${recentNotes.slice(0, 15).map((n: any) => `- ${n.who}: ${n.body}`).join("\n") || "  (none)"}

Upcoming appointments (next 14d):
${upcomingAppts.slice(0, 15).map((a: any) => `- ${a.date} ${a.title}${a.who ? ` [${a.who}]` : ""}`).join("\n") || "  (none)"}

Recent journal entries (last 14d):
${recentJournal.slice(0, 10).map((j: any) => `- ${j.title ?? "Entry"}: ${j.snippet}`).join("\n") || "  (none)"}

Active routines: ${routines.slice(0, 12).join("; ") || "(none)"}
Active chores: ${chores.slice(0, 12).join("; ") || "(none)"}`;

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
    try { payload = JSON.parse(raw); } catch { payload = { snapshot: raw, encouragement: "" }; }

    return new Response(JSON.stringify({ payload, generatedAt: new Date().toISOString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as any)?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});