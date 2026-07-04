import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { meterRequest, WEIGHTS } from "../_shared/ai-meter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const __gate = await meterRequest(req, WEIGHTS.light, corsHeaders);
    if ("response" in __gate) return __gate.response;
    const LOVABLE_API_KEY = (Deno.env.get("OPENAI_API_KEY") ?? Deno.env.get("LOVABLE_API_KEY"));
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return new Response(JSON.stringify({ error: "Server not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.toLowerCase().startsWith("bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: auth } } });
    const { data: u } = await supabase.auth.getUser();
    if (!u?.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json().catch(() => ({}));
    const title = String(body.title || "").trim();
    const notes = String(body.notes || "").trim();
    const area = String(body.area || "").trim();
    if (!title) {
      return new Response(JSON.stringify({ error: "title required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const sys = `You are a calm, supportive planning assistant for a busy caregiver using CareFlow.
Given a task, produce four lightweight suggestions to help them refine it.
- titleRewrite: a clearer, action-first version of the title (max ~10 words). Keep their original intent. Return empty string if the title is already perfect.
- estMinutes: a realistic time estimate in minutes (5, 10, 15, 20, 30, 45, 60, 90, 120). Be honest, not optimistic.
- subtasks: 3-5 short imperative steps (max ~8 words each) to make starting easy. No numbering, no emojis.
- tags: 2-4 lowercase single-word or hyphenated tags (no leading #). Useful for grouping/filtering.
Return ONLY via the task_assist tool.`;
    const userMsg = `Task: ${title}${notes ? `\nNotes: ${notes}` : ""}${area ? `\nArea: ${area}` : ""}`;

    const tools = [{
      type: "function",
      function: {
        name: "task_assist",
        description: "Return refinement suggestions for the task",
        parameters: {
          type: "object",
          properties: {
            titleRewrite: { type: "string" },
            estMinutes: { type: "number" },
            subtasks: { type: "array", items: { type: "string" }, minItems: 0, maxItems: 6 },
            tags: { type: "array", items: { type: "string" }, minItems: 0, maxItems: 6 },
          },
          required: ["titleRewrite", "estMinutes", "subtasks", "tags"],
        },
      },
    }];

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5-mini",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: userMsg },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "task_assist" } },
      }),
    });

    if (resp.status === 429) return new Response(JSON.stringify({ error: "Rate limited, please try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (resp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in workspace settings." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!resp.ok) {
      const t = await resp.text();
      return new Response(JSON.stringify({ error: `AI error: ${t}` }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const data = await resp.json();
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    let titleRewrite = "";
    let estMinutes: number | null = null;
    let subtasks: string[] = [];
    let tags: string[] = [];
    try {
      const args = JSON.parse(call?.function?.arguments ?? "{}");
      titleRewrite = String(args.titleRewrite ?? "").trim();
      if (titleRewrite.toLowerCase() === title.toLowerCase()) titleRewrite = "";
      const m = Number(args.estMinutes);
      if (Number.isFinite(m) && m > 0) estMinutes = Math.round(m);
      subtasks = Array.isArray(args.subtasks) ? args.subtasks.map((s: any) => String(s).trim()).filter(Boolean).slice(0, 6) : [];
      tags = Array.isArray(args.tags)
        ? args.tags.map((s: any) => String(s).trim().replace(/^#/, "").toLowerCase()).filter(Boolean).slice(0, 6)
        : [];
    } catch {}
    return new Response(JSON.stringify({ titleRewrite, estMinutes, subtasks, tags }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});