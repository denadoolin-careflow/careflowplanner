import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `You triage a user's inbox tasks. For each input task, suggest:
- area: one of the user's existing areas (best fit) — strings only.
- project_id: id of an existing project that fits, or null.
- status: "active" (do soon), "this_week", "someday", or "waiting".
- priority: "low" | "medium" | "high".
- suggested_due_date: ISO date YYYY-MM-DD if there's a clear hint in the title, else null.
Return STRICT JSON only.`;

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

    const [tasks, projects, areas] = await Promise.all([
      supabase.from("tasks")
        .select("id,title,area,priority,due_date,project_id")
        .eq("user_id", u.user.id).eq("inbox", true).eq("done", false).limit(40),
      supabase.from("projects")
        .select("id,name,area_name,status")
        .eq("user_id", u.user.id).neq("status", "done").limit(80),
      supabase.from("areas")
        .select("name").eq("user_id", u.user.id).eq("is_archived", false).limit(40),
    ]);

    const items = tasks.data ?? [];
    if (items.length === 0) {
      return new Response(JSON.stringify({ suggestions: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const todayISO = new Date().toISOString().slice(0, 10);
    const userPrompt = `Today: ${todayISO}.
Available areas: ${JSON.stringify((areas.data ?? []).map((a: any) => a.name))}
Available projects: ${JSON.stringify((projects.data ?? []).map((p: any) => ({ id: p.id, name: p.name, area: p.area_name })))}

Inbox tasks (${items.length}):
${JSON.stringify(items.map((t: any) => ({ id: t.id, title: t.title })))}

Return JSON: { "suggestions": [ { "task_id": "...", "area": "...", "project_id": null|"<id>", "status": "...", "priority": "...", "suggested_due_date": null|"YYYY-MM-DD" } ] }
Only include task_ids from the input list.`;

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
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch { parsed = { suggestions: [] }; }

    return new Response(JSON.stringify(parsed),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});