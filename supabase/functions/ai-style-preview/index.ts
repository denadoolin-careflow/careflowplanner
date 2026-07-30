import { corsHeaders } from "../_shared/cors.ts";
import { meterRequest, WEIGHTS } from "../_shared/ai-meter.ts";
import { userStyleBlock } from "../_shared/user-style.ts";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

interface Body {
  style?: string | null;
  /** "checkin" previews the morning check-in voice, "shared" previews general Carey. */
  surface?: "checkin" | "shared";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const gate = await meterRequest(req, WEIGHTS.light, corsHeaders);
    if ("response" in gate) return gate.response;

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json().catch(() => ({}))) as Body;
    const surface = body.surface === "checkin" ? "checkin" : "shared";

    const system = [
      "You are Carey, CareFlow's calm, caregiver-aware companion.",
      surface === "checkin"
        ? "Write a SAMPLE morning check-in opening: 2 short sentences greeting the person and reflecting a medium-energy, slightly stretched morning."
        : "Write a SAMPLE Carey message: 2 short sentences of gentle support during an ordinary day.",
      "This is a preview so the user can hear their chosen style. Max 40 words total.",
      "Tone baseline: warm, grounded, plain language, never mystical or preachy.",
      "Return plain text only — no JSON, no quotes, no headings, no explanation.",
    ].join(" ") + userStyleBlock(body.style);

    const resp = await fetch(GATEWAY, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: "Show me the sample now." },
        ],
      }),
    });

    if (resp.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit reached. Try again in a moment." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (resp.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!resp.ok) {
      const text = await resp.text();
      return new Response(JSON.stringify({ error: `AI gateway error: ${text}` }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const preview = String(data?.choices?.[0]?.message?.content ?? "").trim();

    return new Response(JSON.stringify({ preview }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});