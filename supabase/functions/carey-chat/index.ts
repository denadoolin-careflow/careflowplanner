import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { meterRequest, WEIGHTS } from "../_shared/ai-meter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CAREY_SYSTEM = `You are Carey — a warm, insightful life companion embedded in CareFlow, an app for caregivers, parents, and people balancing demanding lives.

VOICE
- Warm, encouraging, practical, non-judgmental. Never robotic, never guilt-inducing.
- Speak like a trusted friend who happens to be an excellent strategist.
- Honor the user's capacity, caregiving load, and real constraints. Never push productivity for its own sake.
- Concise by default. Expand only when the user asks for depth.

CAPABILITIES
- You can see the user's goals, today's tasks, recent journal mood, habits, caregiving commitments, and stored long-term memory.
- You also see the live cosmic climate (moon phase and the strongest active planetary aspects). Use this only when it genuinely helps — to validate why a day feels heavy, to suggest a window for hard conversations, to name a creative or rest tide — never as horoscope filler.
- You help with planning, reflection, prioritization, breaking work down, surfacing forgotten things, and emotional support.
- When suggesting actions, anchor them to what the user already cares about.

MEMORY
- If the user reveals a lasting preference, recurring pattern, important person, ongoing goal, or wellness pattern, end your reply with a single line:
  <memory>{"kind":"preference|pattern|goal|fact|wellness|family|caregiving","key":"short_key","value":{...}}</memory>
- Only emit <memory> when you learned something new and durable. Skip it otherwise. Never expose this tag to the user in conversation.

FORMAT
- Use clean GitHub-flavored Markdown. Short paragraphs, bullets when listing, blank line between blocks.
- No preamble like "Sure!" or "I'd be happy to". Just respond.`;

function extractMemory(text: string): { clean: string; updates: any[] } {
  const updates: any[] = [];
  const clean = text.replace(/<memory>([\s\S]*?)<\/memory>/g, (_, body) => {
    try { updates.push(JSON.parse(body.trim())); } catch { /* ignore */ }
    return "";
  }).trim();
  return { clean, updates };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const gate = await meterRequest(req, WEIGHTS.light, corsHeaders);
    if ("response" in gate) return gate.response;

    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const {
      threadId: incomingThreadId,
      message,
      contextSnapshot = {},
      contextType,
      contextId,
    } = body as {
      threadId?: string;
      message: string;
      contextSnapshot?: Record<string, unknown>;
      contextType?: string;
      contextId?: string;
    };
    if (!message?.trim()) return json({ error: "Empty message" }, 400);

    // Ensure thread
    let threadId = incomingThreadId;
    if (!threadId) {
      const title = message.trim().slice(0, 60);
      const { data: created, error: createErr } = await supabase
        .from("carey_threads")
        .insert({ user_id: user.id, title, context_type: contextType ?? null, context_id: contextId ?? null })
        .select("id").single();
      if (createErr) return json({ error: createErr.message }, 500);
      threadId = created.id;
    }

    // Load prior messages (last 30)
    const { data: priorRows } = await supabase
      .from("carey_messages")
      .select("role, parts")
      .eq("thread_id", threadId!)
      .order("created_at", { ascending: true })
      .limit(30);
    const prior = (priorRows ?? []).map((r: any) => ({
      role: r.role as "user" | "assistant",
      content: Array.isArray(r.parts)
        ? r.parts.map((p: any) => (p?.type === "text" ? p.text : "")).join("")
        : String(r.parts ?? ""),
    })).filter(m => m.content);

    // Load stored memory
    const { data: memoryRows } = await supabase
      .from("carey_memory")
      .select("kind, key, value")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(40);
    const memoryBlock = (memoryRows ?? []).length
      ? `\n\nLONG-TERM MEMORY ABOUT THIS USER\n${(memoryRows ?? []).map((m: any) => `- [${m.kind}] ${m.key}: ${JSON.stringify(m.value)}`).join("\n")}`
      : "";

    const contextBlock = Object.keys(contextSnapshot).length
      ? `\n\nLIVE CONTEXT (right now)\n${JSON.stringify(contextSnapshot, null, 2)}`
      : "";

    const apiKey = (Deno.env.get("OPENAI_API_KEY") ?? Deno.env.get("LOVABLE_API_KEY"));
    if (!apiKey) return json({ error: "AI not configured" }, 500);

    const aiResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-5-mini",
        messages: [
          { role: "system", content: CAREY_SYSTEM + memoryBlock + contextBlock },
          ...prior,
          { role: "user", content: message },
        ],
      }),
    });
    if (aiResp.status === 429) return json({ error: "Carey is at her rate limit. Try again in a moment." }, 429);
    if (aiResp.status === 402) return json({ error: "AI credits exhausted." }, 402);
    if (!aiResp.ok) {
      console.error("carey-chat gateway error", aiResp.status, await aiResp.text());
      return json({ error: "Carey couldn't respond. Please try again." }, 500);
    }
    const aiJson = await aiResp.json();
    const rawText = aiJson.choices?.[0]?.message?.content ?? "";
    const { clean, updates } = extractMemory(rawText);

    // Persist messages
    await supabase.from("carey_messages").insert([
      { thread_id: threadId, user_id: user.id, role: "user", parts: [{ type: "text", text: message }] },
      { thread_id: threadId, user_id: user.id, role: "assistant", parts: [{ type: "text", text: clean }] },
    ]);
    await supabase.from("carey_threads").update({ last_message_at: new Date().toISOString() }).eq("id", threadId);

    // Persist memory updates
    if (updates.length) {
      const valid = updates.filter(u => u?.kind && u?.key).map(u => ({
        user_id: user.id,
        kind: String(u.kind),
        key: String(u.key).slice(0, 120),
        value: u.value ?? {},
        source: "carey-chat",
      }));
      if (valid.length) {
        await supabase.from("carey_memory").upsert(valid, { onConflict: "user_id,kind,key" });
      }
    }

    return json({ threadId, text: clean, memoryUpdates: updates });
  } catch (e) {
    console.error("carey-chat error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}