import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const LOVABLE_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    if (!apiKey) {
      return json({ error: "LOVABLE_API_KEY not configured" }, 500);
    }
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);

    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (!isAdmin) return json({ error: "Admin role required" }, 403);

    const body = await req.json().catch(() => ({})) as {
      commits?: { sha?: string; message: string }[];
      text?: string;
    };

    const source = body.commits?.length
      ? body.commits.map((c) => `- ${c.message}`).join("\n")
      : (body.text ?? "").trim();
    if (!source) return json({ error: "Provide commits[] or text" }, 400);

    const system = [
      "You write user-facing changelog entries for the CareFlow productivity app.",
      "Read the raw developer commits and produce ONE friendly entry the user will see.",
      "Be concise, plainspoken, benefit-focused. Skip internal/infra changes.",
      "Return strict JSON: { \"title\": string, \"summary\": string, \"category\": \"new\"|\"improved\"|\"fixed\"|\"announcement\" }.",
      "title: <=60 chars, no emoji. summary: 1-3 short sentences in markdown, no bullet lists, no headings.",
      "Pick category by the dominant change.",
    ].join(" ");

    const resp = await fetch(LOVABLE_GATEWAY, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: `Commits:\n${source}` },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (resp.status === 429) return json({ error: "Rate limited. Try again shortly." }, 429);
    if (resp.status === 402) return json({ error: "AI credits exhausted." }, 402);
    if (!resp.ok) return json({ error: `AI gateway ${resp.status}: ${await resp.text()}` }, 502);
    const data = await resp.json();
    const content = data?.choices?.[0]?.message?.content ?? "{}";
    let parsed: { title?: string; summary?: string; category?: string } = {};
    try { parsed = JSON.parse(content); } catch { /* keep empty */ }
    return json({
      title: parsed.title ?? "Update",
      summary: parsed.summary ?? "",
      category: ["new","improved","fixed","announcement"].includes(parsed.category ?? "")
        ? parsed.category
        : "improved",
    }, 200);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}