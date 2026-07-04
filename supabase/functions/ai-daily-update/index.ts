import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { meterRequest, WEIGHTS } from "../_shared/ai-meter.ts";

const LOVABLE_GATEWAY = "https://api.openai.com/v1/chat/completions";

interface TaskLite { title: string; dueDate?: string; isTopThree?: boolean; done?: boolean; area?: string; }
interface ApptLite { title: string; date?: string; time?: string; }
interface Body {
  date: string;
  overdue?: TaskLite[];
  today?: TaskLite[];
  tomorrow?: TaskLite[];
  upcoming?: TaskLite[];
  appointments?: ApptLite[];
  topThree?: string[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const __gate = await meterRequest(req, WEIGHTS.light, corsHeaders);
    if ("response" in __gate) return __gate.response;
    const apiKey = (Deno.env.get("OPENAI_API_KEY") ?? Deno.env.get("LOVABLE_API_KEY"));
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const b = (await req.json().catch(() => ({}))) as Body;
    const fmt = (xs?: TaskLite[]) =>
      (xs ?? []).slice(0, 8).map(t => `• ${t.title}${t.dueDate ? ` (${t.dueDate})` : ""}`).join("\n") || "—";

    const ctx = [
      `Date: ${b.date}`,
      b.topThree?.length ? `Top 3 today: ${b.topThree.join("; ")}` : null,
      `Today (${b.today?.length ?? 0}):\n${fmt(b.today)}`,
      `Overdue (${b.overdue?.length ?? 0}):\n${fmt(b.overdue)}`,
      `Tomorrow (${b.tomorrow?.length ?? 0}):\n${fmt(b.tomorrow)}`,
      `This week upcoming (${b.upcoming?.length ?? 0}):\n${fmt(b.upcoming)}`,
      b.appointments?.length
        ? `Appointments today:\n${b.appointments.slice(0, 6).map(a => `• ${a.time ?? "—"} ${a.title}`).join("\n")}`
        : null,
    ].filter(Boolean).join("\n\n");

    const system = [
      "You are a calm, caregiver-friendly daily briefing writer for the CareFlow app.",
      "Write a short narrative (3–5 sentences, ~80 words max).",
      "Open with the day's shape, name overdue items gently, highlight the top 3 if any,",
      "and close with a soft suggestion. Avoid emojis, bullets, headings, or hashtags.",
    ].join(" ");

    const resp = await fetch(LOVABLE_GATEWAY, {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-5-mini",
        messages: [
          { role: "system", content: system },
          { role: "user", content: ctx || "Give a gentle daily briefing." },
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
    const update = data?.choices?.[0]?.message?.content ?? "";
    return new Response(JSON.stringify({ update }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});