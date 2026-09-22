import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const GW = "https://connector-gateway.lovable.dev";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const body = await req.json().catch(() => ({}));
  const path = body.path ?? "/api/v1/app-users/oauth2/authorize";
  const method = body.method ?? "POST";
  const payload = body.payload ?? {};
  const res = await fetch(`${GW}${path}`, {
    method,
    headers: {
      "Authorization": `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
      "X-Connection-Api-Key": Deno.env.get("GOOGLE_MAIL_APP_USER_CONNECTOR_CLIENT_API_KEY") ?? "",
      "Content-Type": "application/json",
    },
    body: method === "GET" ? undefined : JSON.stringify(payload),
  });
  const text = await res.text();
  return new Response(JSON.stringify({ status: res.status, text }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
