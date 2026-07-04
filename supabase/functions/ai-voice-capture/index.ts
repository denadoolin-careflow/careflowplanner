import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { meterRequest, WEIGHTS } from "../_shared/ai-meter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `You convert a caregiver's voice brain-dump into a clean,
actionable list of tasks. Identify each distinct intent: tasks, errands,
appointments, ideas, worries. Extract titles, areas, priorities, due dates
(YYYY-MM-DD; "today" = the provided today, "tomorrow" = +1), and short notes.
Group related thoughts. Be gentle, concise, and never invent details.
Return STRICT JSON only via the supplied tool.`;

const TOOL = {
  type: "function",
  function: {
    name: "organize_capture",
    description: "Organize a transcript into a summary and structured tasks.",
    parameters: {
      type: "object",
      properties: {
        summary: { type: "string", description: "1–2 sentence gentle summary of what was captured." },
        tasks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              area: {
                type: "string",
                enum: [
                  "Family", "Kids", "Caregiving", "Home", "Meals",
                  "Appointments", "Holidays & Birthdays", "Personal",
                  "Creative Projects", "Money",
                ],
              },
              priority: { type: "string", enum: ["low", "medium", "high"] },
              status: { type: "string", enum: ["active", "this_week", "someday", "waiting"] },
              dueDate: { type: ["string", "null"], description: "YYYY-MM-DD or null" },
              estMinutes: { type: ["integer", "null"] },
              tags: { type: "array", items: { type: "string" } },
              notes: { type: "string" },
            },
            required: ["title", "area", "priority", "status"],
            additionalProperties: false,
          },
        },
      },
      required: ["summary", "tasks"],
      additionalProperties: false,
    },
  },
} as const;

async function transcribeAudio(apiKey: string, audioBase64: string, mimeType: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-5-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a precise transcriber. Return only the verbatim transcript of the spoken audio. No commentary.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Transcribe this voice note:" },
            { type: "input_audio", input_audio: { data: audioBase64, format: mimeType.includes("wav") ? "wav" : "webm" } },
          ],
        },
      ],
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`transcribe_failed:${res.status}:${txt.slice(0, 200)}`);
  }
  const json = await res.json();
  return (json.choices?.[0]?.message?.content ?? "").trim();
}

async function organizeTranscript(apiKey: string, transcript: string, todayISO: string) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-5-mini",
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: `Today is ${todayISO}.\nTranscript:\n"""${transcript}"""\n\nReturn the structured plan using the tool.`,
        },
      ],
      tools: [TOOL],
      tool_choice: { type: "function", function: { name: "organize_capture" } },
    }),
  });
  if (res.status === 429) throw new Error("rate_limited");
  if (res.status === 402) throw new Error("credits_exhausted");
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`organize_failed:${res.status}:${txt.slice(0, 200)}`);
  }
  const json = await res.json();
  const call = json.choices?.[0]?.message?.tool_calls?.[0];
  const args = call?.function?.arguments ? JSON.parse(call.function.arguments) : { summary: "", tasks: [] };
  return args as { summary: string; tasks: any[] };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const __gate = await meterRequest(req, WEIGHTS.medium, corsHeaders);
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
      return new Response(JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });
    const { data: u, error: uerr } = await supabase.auth.getUser();
    if (uerr || !u?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const { audioBase64, mimeType, transcript: rawTranscript } = body as {
      audioBase64?: string; mimeType?: string; transcript?: string;
    };

    const todayISO = new Date().toISOString().slice(0, 10);

    let transcript = (rawTranscript ?? "").trim();
    if (!transcript) {
      if (!audioBase64) {
        return new Response(JSON.stringify({ error: "Provide audioBase64 or transcript" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      transcript = await transcribeAudio(LOVABLE_API_KEY, audioBase64, mimeType ?? "audio/webm");
    }

    if (!transcript) {
      return new Response(JSON.stringify({ transcript: "", summary: "", tasks: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const organized = await organizeTranscript(LOVABLE_API_KEY, transcript, todayISO);

    return new Response(JSON.stringify({ transcript, ...organized }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const msg = String((e as Error).message ?? e);
    const status = msg === "rate_limited" ? 429 : msg === "credits_exhausted" ? 402 : 500;
    return new Response(JSON.stringify({ error: msg }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});