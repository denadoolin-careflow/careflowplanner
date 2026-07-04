import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { checkAndIncrementAi, quotaExceededResponse, WEIGHTS } from "../_shared/ai-meter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are CareFlow's gentle planning assistant for a busy caregiver.
Tone: warm, calm, validating, never pushy. Acknowledge effort. Avoid lists longer than 5 items.
You can recommend gentler schedules, focus blocks, recovery, low-energy alternatives,
and short reset rituals. Keep responses under 220 words. Use plain markdown (short paragraphs,
optionally a small bullet list). Never invent tasks the user did not mention.
If the user requests "organize my day" or "organize my week", call the propose_plan tool
with prioritized items grouped by Essential / Flexible / Can Wait / Recovery.`;

function todayISO(tz?: string) {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

async function loadContext(supabase: any, userId: string) {
  const today = todayISO();
  const inAWeek = new Date(Date.now() + 7 * 86400 * 1000).toISOString().slice(0, 10);

  const [tasks, appts, habits, energy, blocks, checkins, bills] = await Promise.all([
    supabase.from("tasks").select("title,priority,energy,due_date,done,is_top_three,est_minutes,tags,area")
      .eq("user_id", userId).eq("done", false).order("due_date", { ascending: true }).limit(40),
    supabase.from("appointments").select("title,date,time,with_name,location,type")
      .eq("user_id", userId).gte("date", today).lte("date", inAWeek).order("date").limit(20),
    supabase.from("habits").select("title,streak,cadence,category").eq("user_id", userId).limit(20),
    supabase.from("profiles").select("energy_today,low_energy_mode,planning_style,name").eq("id", userId).maybeSingle(),
    supabase.from("time_blocks").select("title,date,start_time,end_time,color")
      .eq("user_id", userId).gte("date", today).lte("date", inAWeek).limit(40),
    supabase.from("health_checkins").select("date,sleep_hours,water_cups,mood,stress")
      .eq("user_id", userId).order("date", { ascending: false }).limit(3),
    supabase.from("recurring_bills").select("name,amount,next_due_date")
      .eq("user_id", userId).gte("next_due_date", today).lte("next_due_date", inAWeek).limit(10),
  ]);

  return {
    today,
    profile: energy.data ?? null,
    open_tasks: tasks.data ?? [],
    upcoming_appointments: appts.data ?? [],
    habits: habits.data ?? [],
    upcoming_time_blocks: blocks.data ?? [],
    recent_health_checkins: checkins.data ?? [],
    upcoming_bills: bills.data ?? [],
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
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
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const action = typeof body.action === "string" ? body.action : "chat"; // chat | organize_day | organize_week

    // Enforce monthly AI quota. organize_* are heavier (plan generation).
    const weight = action === "chat" ? WEIGHTS.light : WEIGHTS.heavy;
    const meter = await checkAndIncrementAi(u.user.id, weight);
    if (!meter.ok) return quotaExceededResponse(meter, corsHeaders);

    const ctx = await loadContext(supabase, u.user.id);

    const tools = [
      {
        type: "function",
        function: {
          name: "propose_plan",
          description: "Return a prioritized plan grouped into buckets. Only include items that exist in open_tasks/appointments.",
          parameters: {
            type: "object",
            properties: {
              summary: { type: "string", description: "1-3 calm sentences acknowledging the day." },
              buckets: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    label: { type: "string", enum: ["Essential", "Flexible", "Can Wait", "Recovery"] },
                    items: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          title: { type: "string" },
                          why: { type: "string" },
                          suggested_time: { type: "string", description: "Optional HH:MM or natural phrase like 'morning'." },
                        },
                        required: ["title"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["label", "items"],
                  additionalProperties: false,
                },
              },
            },
            required: ["summary", "buckets"],
            additionalProperties: false,
          },
        },
      },
    ];

    const userInstruction =
      action === "organize_day" ? "Organize my day. Use the propose_plan tool." :
      action === "organize_week" ? "Organize my week. Use the propose_plan tool." :
      "";

    const finalMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "system", content: `User context (JSON):\n${JSON.stringify(ctx)}` },
      ...messages,
      ...(userInstruction ? [{ role: "user", content: userInstruction }] : []),
    ];

    const callBody: any = {
      model: "gpt-5-mini",
      messages: finalMessages,
    };
    if (action !== "chat") {
      callBody.tools = tools;
      callBody.tool_choice = { type: "function", function: { name: "propose_plan" } };
    }

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(callBody),
    });

    if (!resp.ok) {
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit reached, please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Settings → Workspace → Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const t = await resp.text();
      console.error("AI gateway error", resp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const json = await resp.json();
    const choice = json?.choices?.[0]?.message ?? {};
    const text = choice?.content ?? "";
    let plan: any = null;
    const toolArgs = choice?.tool_calls?.[0]?.function?.arguments;
    if (toolArgs) {
      try { plan = JSON.parse(toolArgs); } catch { plan = null; }
    }

    return new Response(JSON.stringify({ text, plan }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-planner error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});