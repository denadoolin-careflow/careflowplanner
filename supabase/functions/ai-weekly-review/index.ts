import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `You are CareFlow's gentle weekly review coach for a busy caregiver.
Tone: warm, concise, validating. Celebrate effort first. Never shame.
Return STRICT JSON only — no prose around it.`;

function isoDaysAgo(n: number) {
  return new Date(Date.now() - n * 86400_000).toISOString().slice(0, 10);
}
function isoIn(n: number) {
  return new Date(Date.now() + n * 86400_000).toISOString().slice(0, 10);
}

async function loadContext(supabase: any, userId: string) {
  const sevenAgo = isoDaysAgo(7);
  const today = new Date().toISOString().slice(0, 10);
  const inSeven = isoIn(7);

  const [completed, openTasks, projects, inbox] = await Promise.all([
    supabase.from("tasks")
      .select("title,area,priority,project_id,last_completed_at")
      .eq("user_id", userId).eq("done", true)
      .gte("last_completed_at", sevenAgo).limit(80),
    supabase.from("tasks")
      .select("id,title,area,priority,due_date,project_id,inbox,status")
      .eq("user_id", userId).eq("done", false).limit(120),
    supabase.from("projects")
      .select("id,name,status,area_name,deadline,updated_at")
      .eq("user_id", userId).order("updated_at", { ascending: false }).limit(40),
    supabase.from("tasks")
      .select("id,title,area,priority,due_date")
      .eq("user_id", userId).eq("inbox", true).eq("done", false).limit(40),
  ]);

  const overdue = (openTasks.data ?? []).filter((t: any) => t.due_date && t.due_date < today);
  const dueSoon = (openTasks.data ?? []).filter((t: any) => t.due_date && t.due_date >= today && t.due_date <= inSeven);
  const staleProjects = (projects.data ?? []).filter((p: any) => {
    const updated = p.updated_at ? new Date(p.updated_at).getTime() : 0;
    return p.status === "active" && updated < Date.now() - 14 * 86400_000;
  });

  return {
    today,
    completed_last_7d: completed.data ?? [],
    inbox: inbox.data ?? [],
    overdue, due_next_7d: dueSoon,
    stale_projects: staleProjects,
  };
}

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

    const ctx = await loadContext(supabase, u.user.id);

    const userPrompt = `Produce this user's weekly review. Be warm and brief.
Return JSON with keys:
  "summary": 2-3 sentence celebratory summary of the past week,
  "wins": up to 5 short bullet strings of notable completions,
  "stale": up to 3 short notes about projects that have stalled,
  "next_top_3": exactly 3 items the user should focus on next week — pick from inbox/overdue/due_soon. Each: { "task_id": <id from input>, "title": <copy>, "why": <one short sentence> }.

Context:
${JSON.stringify(ctx)}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (aiRes.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limited — please try again shortly." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (aiRes.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!aiRes.ok) {
      const text = await aiRes.text();
      return new Response(JSON.stringify({ error: "AI call failed", detail: text }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const json = await aiRes.json();
    const content = json.choices?.[0]?.message?.content ?? "{}";
    let parsed: unknown = {};
    try { parsed = JSON.parse(content); } catch { parsed = { summary: content }; }

    return new Response(JSON.stringify({ review: parsed, context: ctx }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});