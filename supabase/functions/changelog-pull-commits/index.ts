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
    const admin = createClient(supabaseUrl, serviceKey);
    const cronSecretHeader = req.headers.get("x-changelog-cron-secret") ?? "";
    let isCron = false;
    if (cronSecretHeader) {
      const { data: settings } = await admin
        .from("changelog_settings")
        .select("cron_secret")
        .eq("id", true)
        .maybeSingle();
      if (settings?.cron_secret && settings.cron_secret === cronSecretHeader) {
        isCron = true;
      }
    }

    if (!isCron) {
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
    }

    const body = await req.json().catch(() => ({})) as {
      perPage?: number;
      since?: string; // ISO date
      maxCommits?: number; // hard cap
      all?: boolean; // paginate until done
      fromLastPull?: boolean; // use settings.last_pulled_at as since
    };

    if (body.fromLastPull && !body.since) {
      const { data: s } = await admin
        .from("changelog_settings")
        .select("last_pulled_at")
        .eq("id", true)
        .maybeSingle();
      if (s?.last_pulled_at) body.since = s.last_pulled_at as unknown as string;
    }

    const perPage = Math.min(100, body.perPage ?? 100);
    const maxCommits = body.all ? 5000 : Math.min(5000, body.maxCommits ?? perPage);
    const sinceParam = body.since ? `&since=${encodeURIComponent(new Date(body.since).toISOString())}` : "";

    let fetched = 0;
    let inserted = 0;
    let page = 1;

    while (fetched < maxCommits) {
      const url = `https://api.github.com/repos/${ghRepo}/commits?per_page=${perPage}&page=${page}${sinceParam}`;
      const ghResp = await fetch(url, {
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
      if (!commits.length) break;

      const slice = commits.slice(0, maxCommits - fetched);
      const rows = slice.map((c) => ({
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

      fetched += slice.length;
      inserted += count ?? 0;
      if (commits.length < perPage) break;
      page += 1;
    }

    await admin.from("changelog_settings").update({ last_pulled_at: new Date().toISOString() }).eq("id", true);
    return json({ ok: true, fetched, inserted, isCron }, 200);
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