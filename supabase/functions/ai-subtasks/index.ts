import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
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
    const count = Math.min(Math.max(Number(body.count ?? 5), 2), 8);
    if (!title) {
      return new Response(JSON.stringify({ error: "title required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const sys = `You are a calm, supportive planning assistant for a busy caregiver. Break a task into ${count} small, concrete, sequential subtasks that make starting easy. Each subtask must be a short imperative phrase (max ~8 words), action-first, no numbering, no emojis. Return ONLY via the create_subtasks tool.`;
    const userMsg = `Task: ${title}${notes ? `\nNotes: ${notes}` : ""}${area ? `\nArea: ${area}` : ""}`;

    const tools = [{
      type: "function",
      function: {
        name: "create_subtasks",
        description: "Return the ordered list of subtasks",
        parameters: {
          type: "object",
          properties: {
            subtasks: {
              type: "array",
              items: { type: "string" },
              minItems: 2,
              maxItems: 8,
            },
          },
          required: ["subtasks"],
        },
      },
    }];

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: userMsg },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "create_subtasks" } },
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
    let subtasks: string[] = [];
    try {
      const args = JSON.parse(call?.function?.arguments ?? "{}");
      subtasks = Array.isArray(args.subtasks) ? args.subtasks.map((s: any) => String(s).trim()).filter(Boolean) : [];
    } catch {}
    if (subtasks.length === 0) {
      const txt = data?.choices?.[0]?.message?.content ?? "";
      subtasks = String(txt).split(/\n+/).map((l) => l.replace(/^[\s\-\*\d\.\)]+/, "").trim()).filter(Boolean).slice(0, count);
    }
    return new Response(JSON.stringify({ subtasks }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});