import { meterRequest, WEIGHTS } from "../_shared/ai-meter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `You are CareFlow's Capture Assistant. The user types a free-form
thought; you turn it into ONE structured action they can confirm. Pick the
most useful module for the text. Be gentle, concise, and never invent dates.

Modules and payloads:
- task:    { title, area, priority, dueDate?, status, estMinutes?, anchorKey? }
- note:    { title, body, anchorKey? }
- grocery: { items: [{ name, quantity? }] }
- idea:    { title, body?, anchorKey? }
- journal: { body, anchorKey? }

anchorKey is one of: home, family, wellness, finances, growth, reflection.
area is one of: Family, Kids, Caregiving, Home, Meals, Appointments, Holidays & Birthdays, Personal, Creative Projects, Money.
priority is one of: low, medium, high.
status is one of: active, this_week, someday, waiting.
dueDate must be YYYY-MM-DD relative to the provided today date, or omitted.
Return STRICT JSON via the supplied tool.`;

const TOOL = {
  type: "function",
  function: {
    name: "capture_action",
    description: "Convert free-form text into one structured CareFlow action.",
    parameters: {
      type: "object",
      properties: {
        module: { type: "string", enum: ["task", "note", "grocery", "idea", "journal"] },
        summary: { type: "string", description: "1-sentence gentle confirmation." },
        payload: { type: "object" },
      },
      required: ["module", "summary", "payload"],
      additionalProperties: false,
    },
  },
} as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const gate = await meterRequest(req, WEIGHTS.light, corsHeaders);
    if ("response" in gate) return gate.response;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "Server not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { text } = await req.json().catch(() => ({ text: "" }));
    const trimmed = (text ?? "").toString().trim();
    if (!trimmed) {
      return new Response(JSON.stringify({ error: "Provide text" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const todayISO = new Date().toISOString().slice(0, 10);
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: `Today is ${todayISO}.\nText:\n"""${trimmed}"""\n\nReturn the structured action.` },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "capture_action" } },
      }),
    });

    if (res.status === 429) {
      return new Response(JSON.stringify({ error: "rate_limited" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (res.status === 402) {
      return new Response(JSON.stringify({ error: "credits_exhausted" }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!res.ok) {
      const detail = await res.text();
      return new Response(JSON.stringify({ error: "ai_failed", detail: detail.slice(0, 300) }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const json = await res.json();
    const call = json.choices?.[0]?.message?.tool_calls?.[0];
    const args = call?.function?.arguments ? JSON.parse(call.function.arguments) : null;
    if (!args) {
      return new Response(JSON.stringify({ error: "no_output" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify(args),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});