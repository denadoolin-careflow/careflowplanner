import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { meterRequest, WEIGHTS } from "../_shared/ai-meter.ts";

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
    const __gate = await meterRequest(req, WEIGHTS.medium, corsHeaders);
    if ("response" in __gate) return __gate.response;
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

    const { data: projects = [] } = await supabase
      .from("projects").select("id, name, area_name, status, deadline, notes")
      .eq("user_id", userId)
      .neq("status", "done")
      .order("created_at", { ascending: false })
      .limit(40);

    if (!projects || projects.length === 0) {
      return json({ overview: "No active projects yet. When you add some, I'll summarize progress here.", updated_at: new Date().toISOString() });
    }

    const projectIds = projects.map((p: any) => p.id);
    const { data: tasks = [] } = await supabase
      .from("tasks").select("title, done, due_date, project_id, last_completed_at")
      .in("project_id", projectIds).eq("user_id", userId).limit(800);

    const sinceDate = new Date(); sinceDate.setDate(sinceDate.getDate() - 14);
    const since = sinceDate.toISOString();

    const lines = projects.map((p: any) => {
      const ts = (tasks ?? []).filter((t: any) => t.project_id === p.id);
      const done = ts.filter((t: any) => t.done).length;
      const open = ts.filter((t: any) => !t.done);
      const recentDone = ts.filter((t: any) => t.done && t.last_completed_at && t.last_completed_at >= since)
        .slice(0, 5).map((t: any) => t.title);
      const nextOpen = open.slice(0, 5).map((t: any) => `${t.title}${t.due_date ? ` (due ${t.due_date})` : ""}`);
      return `### ${p.name} [${p.area_name ?? "—"} · ${p.status}${p.deadline ? ` · due ${p.deadline}` : ""}]\nProgress: ${done}/${ts.length} tasks complete\nRecent wins: ${recentDone.join("; ") || "(none in last 14d)"}\nOpen next: ${nextOpen.join("; ") || "(none)"}\nNotes: ${(p.notes ?? "").slice(0, 200) || "(none)"}`;
    }).join("\n\n");

    const system = `You are a warm, grounded planning coach. Given a snapshot of the user's active projects, write a concise markdown briefing with these sections:

## Overall momentum
1-2 warm sentences naming where energy is flowing.

## Accomplished recently
3-6 bullets calling out specific recent wins across projects (name the project).

## Outstanding & next steps
3-6 bullets of what's open and the single next step for each (name the project).

Keep it under 220 words. Be specific, never invent facts. Use present-tense, encouraging language.`;

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "LOVABLE_API_KEY not configured" }, 500);

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: lines },
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

    return json({ overview: content.trim(), updated_at: new Date().toISOString(), project_count: projects.length });
  } catch (e: any) {
    console.error("ai-projects-summary error", e);
    return json({ error: e?.message ?? String(e) }, 500);
  }
});