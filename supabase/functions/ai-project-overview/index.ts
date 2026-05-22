import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userRes?.user) return json({ error: "Unauthorized" }, 401);
    const userId = userRes.user.id;

    const body = await req.json().catch(() => ({}));
    const projectId: string | undefined = body?.project_id;
    const mode: "overview" | "update" = body?.mode === "update" ? "update" : "overview";
    if (!projectId) return json({ error: "project_id is required" }, 400);

    // Load project + related tasks/notes
    const { data: project } = await supabase
      .from("projects").select("*").eq("id", projectId).eq("user_id", userId).single();
    if (!project) return json({ error: "Project not found" }, 404);

    const { data: tasks = [] } = await supabase
      .from("tasks").select("title, done, due_date, priority, status")
      .eq("project_id", projectId).eq("user_id", userId).order("created_at", { ascending: false }).limit(60);

    const totalTasks = tasks?.length ?? 0;
    const doneTasks = (tasks ?? []).filter((t: any) => t.done).length;
    const recentDone = (tasks ?? []).filter((t: any) => t.done).slice(0, 8).map((t: any) => `- ${t.title}`).join("\n");
    const openTasks = (tasks ?? []).filter((t: any) => !t.done).slice(0, 10).map((t: any) => `- ${t.title}${t.due_date ? ` (due ${t.due_date})` : ""}`).join("\n");

    const goals = Array.isArray(project.linked_goal_ids) && project.linked_goal_ids.length
      ? (await supabase.from("goals").select("title").in("id", project.linked_goal_ids).eq("user_id", userId)).data ?? []
      : [];
    const habits = Array.isArray(project.linked_habit_ids) && project.linked_habit_ids.length
      ? (await supabase.from("habits").select("title").in("id", project.linked_habit_ids).eq("user_id", userId)).data ?? []
      : [];

    const systemOverview = `You are a warm, encouraging planning coach. Write a short markdown project overview (3-5 sentences max + a 'Next steps' list of up to 4 bullet points). Tone: gentle, grounded, specific. Never invent facts not in the input.`;
    const systemUpdate = `You are a warm planning coach. Write a brief markdown status update for the project. Start with a single-sentence headline, then 2-4 bullet points of recent wins and 1-2 gentle suggestions for what to focus on next. Use present-tense, warm language. Never invent facts not in the input.`;

    const userPrompt = `Project: ${project.name}
Area: ${project.area_name ?? "—"}
Status: ${project.status}
Project notes: ${project.notes ?? "(none)"}
Linked goals: ${goals.map((g: any) => g.title).join(", ") || "(none)"}
Linked habits: ${habits.map((h: any) => h.title).join(", ") || "(none)"}
Tasks: ${doneTasks}/${totalTasks} done
Recent completed:
${recentDone || "(none)"}
Open tasks:
${openTasks || "(none)"}`;

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "LOVABLE_API_KEY not configured" }, 500);

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: mode === "update" ? systemUpdate : systemOverview },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (aiResp.status === 429) return json({ error: "Rate limited. Try again in a minute." }, 429);
    if (aiResp.status === 402) return json({ error: "AI credits exhausted. Add funds in Settings → Workspace → Usage." }, 402);
    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("ai gateway error", aiResp.status, t);
      return json({ error: "AI service error" }, 500);
    }
    const aiJson = await aiResp.json();
    const content: string = aiJson?.choices?.[0]?.message?.content ?? "";
    if (!content) return json({ error: "AI returned no content" }, 500);

    // Compose the new overview: either replace or append dated update.
    const now = new Date().toISOString();
    let nextOverview = content.trim();
    if (mode === "update") {
      const stamp = new Date().toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
      const previous = project.ai_overview ? `${project.ai_overview}\n\n---\n` : "";
      nextOverview = `${previous}### Update — ${stamp}\n\n${content.trim()}`;
    }

    await supabase.from("projects")
      .update({ ai_overview: nextOverview, ai_overview_updated_at: now })
      .eq("id", projectId).eq("user_id", userId);

    return json({ overview: nextOverview, updated_at: now });
  } catch (e: any) {
    console.error("ai-project-overview error", e);
    return json({ error: e?.message ?? String(e) }, 500);
  }
});