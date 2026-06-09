import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ghToken = Deno.env.get("GITHUB_TOKEN");
    const ghRepo = Deno.env.get("GITHUB_REPO"); // "owner/repo"
    if (!ghToken || !ghRepo) {
      return json({ error: "GITHUB_TOKEN and GITHUB_REPO must be configured in project secrets." }, 500);
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

    const { perPage = 30 } = await req.json().catch(() => ({}));
    const ghResp = await fetch(`https://api.github.com/repos/${ghRepo}/commits?per_page=${Math.min(100, perPage)}`, {
      headers: {
        Authorization: `Bearer ${ghToken}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
    if (!ghResp.ok) {
      return json({ error: `GitHub API ${ghResp.status}: ${await ghResp.text()}` }, 502);
    }
    const commits = await ghResp.json() as Array<{
      sha: string;
      html_url: string;
      commit: { message: string; author: { name?: string; date?: string } };
    }>;

    const admin = createClient(supabaseUrl, serviceKey);
    const rows = commits.map((c) => ({
      sha: c.sha,
      message: c.commit.message,
      author: c.commit.author?.name ?? null,
      committed_at: c.commit.author?.date ?? null,
      url: c.html_url,
    }));
    const { error: upErr, count } = await admin
      .from("changelog_raw_commits")
      .upsert(rows, { onConflict: "sha", count: "exact", ignoreDuplicates: true });
    if (upErr) return json({ error: upErr.message }, 500);

    return json({ ok: true, fetched: commits.length, inserted: count ?? 0 }, 200);
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