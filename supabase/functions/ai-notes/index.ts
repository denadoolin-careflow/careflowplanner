import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { meterRequest, WEIGHTS } from "../_shared/ai-meter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MD_RULES = "Format the response as clean GitHub-flavored Markdown. Always separate paragraphs, headings, lists, and blockquotes with a single blank line. Use ## or ### for section headers, `-` for bullets, `1.` for numbered lists, `**bold**`, `*italic*`, `> quotes`, and fenced ``` code blocks where helpful. Do not wrap the whole response in code fences. No preamble or sign-off.";

const ACTIONS: Record<string, { system: string; user: (body: string, title: string, extra?: string) => string }> = {
  ideas: {
    system: `You are a thoughtful brainstorming partner. Return 5-8 concise, varied ideas as a markdown bullet list. ${MD_RULES}`,
    user: (b, t) => `Generate ideas related to this note.\n\nTitle: ${t || "(untitled)"}\n\nNote:\n${b || "(empty)"}`,
  },
  prompts: {
    system: `You generate writing prompts. Return 5 open-ended prompts as a markdown bullet list, one sentence each. ${MD_RULES}`,
    user: (b, t) => `Suggest writing prompts to expand this note.\n\nTitle: ${t}\n\nNote:\n${b || "(empty)"}`,
  },
  summarize: {
    system: `You summarize notes. Return a tight 3-5 bullet summary in markdown. ${MD_RULES}`,
    user: (b) => `Summarize:\n\n${b}`,
  },
  expand: {
    system: `You expand notes by fleshing out ideas while keeping the author's voice. Return only the rewritten/expanded note. ${MD_RULES}`,
    user: (b, t) => `Expand and develop this note. Keep tone and structure.\n\nTitle: ${t}\n\nNote:\n${b}`,
  },
  polish: {
    system: `You edit notes for clarity, flow, and grammar without changing meaning or voice. Return only the edited note. ${MD_RULES}`,
    user: (b) => `Polish this note:\n\n${b}`,
  },
  continue: {
    system: `You continue notes naturally where the author left off. Return only the new continuation (1-3 short paragraphs separated by blank lines) — do not repeat the existing text. ${MD_RULES}`,
    user: (b, t) => `Continue writing this note.\n\nTitle: ${t}\n\nExisting:\n${b}`,
  },
  custom: {
    system: `You are a helpful writing assistant. Apply the user's instruction to their note. Return only the resulting note text. ${MD_RULES}`,
    user: (b, t, extra) => `Instruction: ${extra}\n\nTitle: ${t}\n\nNote:\n${b}`,
  },
  summary: {
    system: `You write a one-paragraph, neutral summary of a note (2-4 sentences). No headings, no bullets. ${MD_RULES}`,
    user: (b, t) => `Summarize this note in a single short paragraph.\n\nTitle: ${t}\n\nNote:\n${b}`,
  },
  key_decisions: {
    system: `You extract decisions made in a note. Return a markdown bullet list of decisions, each as one sentence. If none, return "_No clear decisions yet._". ${MD_RULES}`,
    user: (b, t) => `Extract key decisions.\n\nTitle: ${t}\n\nNote:\n${b}`,
  },
  action_items: {
    system: `You extract action items from a note. Return a markdown checkbox list ("- [ ] item"), one per line. Each item should start with a verb. If none, return "_No action items found._". ${MD_RULES}`,
    user: (b, t) => `Extract action items as a checkbox list.\n\nTitle: ${t}\n\nNote:\n${b}`,
  },
  follow_ups: {
    system: `You suggest follow-up questions or next steps after reading a note. Return 3-5 markdown bullets. ${MD_RULES}`,
    user: (b, t) => `Suggest follow-ups for this note.\n\nTitle: ${t}\n\nNote:\n${b}`,
  },
  auto_tags: {
    system: `You extract structured tag suggestions from a note. Reply with ONLY valid minified JSON, no prose, no code fences. Schema: {"people":string[],"projects":string[],"health":string[],"locations":string[],"tags":string[]}. Keep each array <= 6, lowercase tags.`,
    user: (b, t) => `Extract structured tag suggestions as JSON.\n\nTitle: ${t}\n\nNote:\n${b}`,
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const __gate = await meterRequest(req, WEIGHTS.light, corsHeaders);
    if ("response" in __gate) return __gate.response;
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { action, title = "", body = "", instruction = "" } = await req.json();
    const cfg = ACTIONS[action];
    if (!cfg) return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return new Response(JSON.stringify({ error: "AI not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: cfg.system },
          { role: "user", content: cfg.user(body, title, instruction) },
        ],
      }),
    });

    if (resp.status === 429) return new Response(JSON.stringify({ error: "Rate limit reached. Please try again in a moment." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (resp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Settings." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI gateway error", resp.status, t);
      return new Response(JSON.stringify({ error: "AI request failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const data = await resp.json();
    const text = data.choices?.[0]?.message?.content ?? "";
    return new Response(JSON.stringify({ text }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("ai-notes error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});