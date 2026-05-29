import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { meterRequest, WEIGHTS } from "../_shared/ai-meter.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const __gate = await meterRequest(req, WEIGHTS.medium, corsHeaders);
    if ("response" in __gate) return __gate.response;
    const { scope, memories } = await req.json();
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const system = `You write tender, calm, emotionally warm reflections about a person's preserved memories.
Write 3-5 sentences. Speak gently, in second person ("you"). Honor both joy and difficulty.
No bullet lists, no headers, no emojis. Just a soft, nostalgic prose paragraph that helps them feel seen.`;

    const user = `Scope: ${scope}\n\nMemories (JSON):\n${JSON.stringify(memories, null, 2)}\n\nWrite the gentle reflection.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      return new Response(JSON.stringify({ error: text }), { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const data = await res.json();
    const recap = data?.choices?.[0]?.message?.content ?? "";
    return new Response(JSON.stringify({ recap }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});