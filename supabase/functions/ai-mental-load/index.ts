import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { meterRequest, WEIGHTS } from "../_shared/ai-meter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_TONE = `You are a warm, emotionally intelligent planning companion for caregivers, stay-at-home parents, and neurodivergent users.
Your job is to reduce mental load — NEVER to add pressure.

Tone rules (strict):
- Use soft, kind, validating language. Never use "should", "must", "overdue", "behind", "lazy", "hustle", "grind".
- Acknowledge effort and limits. Offer permission to rest.
- Prefer short sentences. No bullet point lectures.
- Examples of good phrasing: "This can wait.", "Two things would be enough today.", "Protect your energy.", "Small steps still count.", "You do not have to do everything today."`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const __gate = await meterRequest(req, WEIGHTS.medium, corsHeaders);
    if ("response" in __gate) return __gate.response;
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return json({ error: "unauthorized" }, 401);
    const uid = u.user.id;

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "LOVABLE_API_KEY missing" }, 500);

    const body = await req.json();
    const action = String(body?.action ?? "");

    if (action === "categorize_dump") {
      return await categorizeDump(body, apiKey);
    }
    if (action === "prioritize") {
      return await prioritize(supabase, uid, apiKey);
    }
    if (action === "decision_support") {
      return await decisionSupport(supabase, uid, apiKey, String(body?.prompt ?? ""));
    }
    if (action === "simplify") {
      return await simplifyDay(supabase, uid, apiKey);
    }
    return json({ error: "unknown action" }, 400);
  } catch (e: any) {
    console.error("ai-mental-load error", e);
    return json({ error: e?.message ?? "unknown" }, 500);
  }
});

async function categorizeDump(body: any, apiKey: string) {
  const items: { id: string; content: string }[] = Array.isArray(body?.items) ? body.items.slice(0, 30) : [];
  if (items.length === 0) return json({ items: [] });

  const user = `Categorize each captured thought. Pick ONE category per item:
- task        (concrete to-do)
- appointment (scheduled meeting/visit)
- errand      (out-of-home short task)
- worry       (emotional concern, not actionable)
- idea        (creative or future "what if")
- someday     (low-priority wish)
- routine     (recurring rhythm)

Also produce a cleaned, short title (5-7 words, gentle phrasing).

Items:
${items.map((it, i) => `${i + 1}. [${it.id}] ${it.content}`).join("\n")}`;

  const resp = await callAI(apiKey, [
    { role: "system", content: SYSTEM_TONE },
    { role: "user", content: user },
  ], {
    name: "sort_dumps",
    description: "Return a category and cleaned title for each item.",
    parameters: {
      type: "object",
      properties: {
        items: {
          type: "array",
          minItems: items.length,
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              category: { type: "string", enum: ["task","appointment","errand","worry","idea","someday","routine"] },
              title: { type: "string" },
            },
            required: ["id", "category", "title"],
          },
        },
      },
      required: ["items"],
    },
  });
  if (!resp.ok) return resp.errResponse;
  return json({ items: resp.args.items });
}

async function loadContext(supabase: any, uid: string) {
  const today = new Date().toISOString().slice(0, 10);
  const [tasks, checkin, mvd, recipients] = await Promise.all([
    supabase.from("tasks").select("id,title,priority,energy,est_minutes,due_date,area,status,is_top_three")
      .eq("user_id", uid).neq("status", "done").or(`due_date.is.null,due_date.lte.${today}`).limit(40),
    supabase.from("mental_load_checkins").select("*").eq("user_id", uid).eq("date", today).maybeSingle(),
    supabase.from("minimum_viable_day").select("items").eq("user_id", uid).maybeSingle(),
    supabase.from("care_recipients").select("id,name,kind").eq("user_id", uid),
  ]);
  return {
    today,
    tasks: tasks.data ?? [],
    checkin: checkin.data,
    mvd: mvd.data?.items ?? [],
    recipientCount: (recipients.data ?? []).filter((r: any) => r.kind !== "self").length,
  };
}

function contextBlurb(ctx: any) {
  const c = ctx.checkin;
  return `Today is ${ctx.today}.
Energy: ${c?.energy ?? "unknown"}/5, emotional weight: ${c?.emotional ?? "unknown"}/5, caregiving load: ${c?.caregiving ?? "unknown"}/5.
Note: ${c?.note ?? "(none)"}
Caregiving recipients: ${ctx.recipientCount}.
Open tasks (${ctx.tasks.length}):
${ctx.tasks.map((t: any, i: number) => `${i + 1}. [${t.id}] ${t.title} — area:${t.area} prio:${t.priority} energy:${t.energy ?? "?"} due:${t.due_date ?? "—"}`).join("\n") || "(none)"}`;
}

async function prioritize(supabase: any, uid: string, apiKey: string) {
  const ctx = await loadContext(supabase, uid);
  if (ctx.tasks.length === 0) {
    return json({
      headline: "Your list is light today — that's allowed.",
      buckets: { most_important: [], can_wait: [], delegate: [], low_energy: [] },
    });
  }

  const user = `${contextBlurb(ctx)}

Sort these tasks into four gentle buckets and write ONE supportive sentence (≤ 14 words) for the day.
Buckets:
- most_important: the few that would feel best to finish today (max 3, often 1-2)
- can_wait: things that genuinely can wait, with permission
- delegate: things someone else could help with
- low_energy: kind, easy wins for a tired moment

Heavy caregiving day, low energy, or high emotional weight = SMALLER most_important list.
Use the task IDs exactly as given.`;

  const resp = await callAI(apiKey, [
    { role: "system", content: SYSTEM_TONE },
    { role: "user", content: user },
  ], {
    name: "prioritize_day",
    description: "Return a soft prioritization with a supportive headline.",
    parameters: {
      type: "object",
      properties: {
        headline: { type: "string" },
        buckets: {
          type: "object",
          properties: {
            most_important: { type: "array", items: bucketItem() },
            can_wait:       { type: "array", items: bucketItem() },
            delegate:       { type: "array", items: bucketItem() },
            low_energy:     { type: "array", items: bucketItem() },
          },
          required: ["most_important", "can_wait", "delegate", "low_energy"],
        },
      },
      required: ["headline", "buckets"],
    },
  });
  if (!resp.ok) return resp.errResponse;
  return json(resp.args);
}

function bucketItem() {
  return {
    type: "object",
    properties: {
      id: { type: "string" },
      title: { type: "string" },
      reason: { type: "string" },
    },
    required: ["id", "title"],
  };
}

async function decisionSupport(supabase: any, uid: string, apiKey: string, prompt: string) {
  if (!prompt.trim()) return json({ error: "prompt required" }, 400);
  const ctx = await loadContext(supabase, uid);
  const user = `${contextBlurb(ctx)}

The person is asking themselves: "${prompt}"

Answer in 3-5 short, kind sentences. Offer permission, not pressure. Name 1-3 concrete things from their list (use the task titles) where helpful, but never list more than 3.`;

  const data = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      max_tokens: 600,
      messages: [
        { role: "system", content: SYSTEM_TONE },
        { role: "user", content: user },
      ],
    }),
  });
  if (data.status === 429) return json({ error: "Rate limited (429). Try again shortly." }, 429);
  if (data.status === 402) return json({ error: "AI credits exhausted (402)." }, 402);
  if (!data.ok) return json({ error: "AI gateway error" }, 500);
  const j = await data.json();
  const text = j?.choices?.[0]?.message?.content ?? "";
  return json({ text });
}

async function simplifyDay(supabase: any, uid: string, apiKey: string) {
  const ctx = await loadContext(supabase, uid);
  const user = `${contextBlurb(ctx)}

Suggest a *gentle, simplified* version of today.
- Choose 1-3 tasks that matter most.
- Mention 1-2 things that can wait, with kind language.
- Suggest ONE recovery action (rest, water, a soft break).

Use task IDs from the list above when referring to tasks.`;

  const resp = await callAI(apiKey, [
    { role: "system", content: SYSTEM_TONE },
    { role: "user", content: user },
  ], {
    name: "simplify_day",
    description: "Return a calmer plan for today.",
    parameters: {
      type: "object",
      properties: {
        headline: { type: "string" },
        focus: { type: "array", maxItems: 3, items: bucketItem() },
        can_wait: { type: "array", maxItems: 4, items: bucketItem() },
        recovery: { type: "string" },
      },
      required: ["headline", "focus", "can_wait", "recovery"],
    },
  });
  if (!resp.ok) return resp.errResponse;
  return json(resp.args);
}

async function callAI(apiKey: string, messages: any[], tool: any): Promise<
  | { ok: true; args: any }
  | { ok: false; errResponse: Response }
> {
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      max_tokens: 4096,
      messages,
      tools: [{ type: "function", function: tool }],
      tool_choice: { type: "function", function: { name: tool.name } },
    }),
  });
  if (resp.status === 429) return { ok: false, errResponse: json({ error: "Rate limited (429). Try again shortly." }, 429) };
  if (resp.status === 402) return { ok: false, errResponse: json({ error: "AI credits exhausted (402)." }, 402) };
  if (!resp.ok) {
    const t = await resp.text();
    console.error("AI error", resp.status, t);
    return { ok: false, errResponse: json({ error: "AI gateway error" }, 500) };
  }
  const data = await resp.json();
  const call = data?.choices?.[0]?.message?.tool_calls?.[0];
  try {
    const args = call?.function?.arguments ? JSON.parse(call.function.arguments) : null;
    if (!args) return { ok: false, errResponse: json({ error: "AI returned no structured result." }, 500) };
    return { ok: true, args };
  } catch (e) {
    console.error("Parse error", e);
    return { ok: false, errResponse: json({ error: "AI response was incomplete — please try again." }, 500) };
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}