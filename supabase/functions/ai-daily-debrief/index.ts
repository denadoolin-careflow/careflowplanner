import { corsHeaders } from "../_shared/cors.ts";
import { meterRequest, WEIGHTS } from "../_shared/ai-meter.ts";
import { COSMIC_SYSTEM_PROMPT, COSMIC_TONE_REMINDER } from "../_shared/cosmic-tone.ts";

const LOVABLE_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

interface Body {
  date?: string;
  moon?: { phase?: string; sign?: string; element?: string; illumination?: number } | null;
  cycle?: { phase?: string; day?: number } | null;
  capacity?: { plannedMinutes?: number; ceilingMinutes?: number; label?: string } | null;
  tasks?: { title: string; time?: string; estMinutes?: number }[];
  appointments?: { title: string; time?: string }[];
}

function fallback(b: Body) {
  const cap = b.capacity?.label ?? "steady";
  const summary =
    cap === "gentle" ? "Today's plan is gentle — leave room to enjoy it."
    : cap === "steady" ? "Today's plan feels steady. Trust the rhythm."
    : cap === "stretched" ? "You're a little stretched — give yourself permission to trim."
    : "Today is overflowing. Let one item soften or shift.";
  const rhythmNote = b.cycle?.phase
    ? `Your ${b.cycle.phase} phase invites a kinder pace.`
    : (b.moon?.phase ? `${b.moon.phase} moon — move gently with what's here.` : "Move gently with what's here.");
  return { summary, honors: [], reshape: [], rhythmNote };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const respond = (payload: unknown, status = 200) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const gate = await meterRequest(req, WEIGHTS.light, corsHeaders);
    if ("response" in gate) return gate.response;

    const body = (await req.json().catch(() => ({}))) as Body;
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return respond(fallback(body));

    const ctx = [
      body.date ? `Date: ${body.date}` : null,
      body.moon ? `Moon: ${body.moon.phase ?? "—"} in ${body.moon.sign ?? "—"} (${body.moon.element ?? "—"}, ${body.moon.illumination ?? 0}% lit).` : null,
      body.cycle ? `Cycle: ${body.cycle.phase} phase, day ${body.cycle.day}.` : "Cycle: not tracking.",
      body.capacity ? `Capacity: ${body.capacity.plannedMinutes ?? 0}m planned vs soft ceiling ${body.capacity.ceilingMinutes ?? 0}m → ${body.capacity.label ?? "steady"}.` : null,
      body.tasks?.length ? `Planned tasks:\n${body.tasks.map(t => `- ${t.title}${t.time ? ` @ ${t.time}` : ""}${t.estMinutes ? ` (${t.estMinutes}m)` : ""}`).join("\n")}` : "No planned tasks.",
      body.appointments?.length ? `Appointments:\n${body.appointments.map(a => `- ${a.title}${a.time ? ` @ ${a.time}` : ""}`).join("\n")}` : null,
    ].filter(Boolean).join("\n");

    const system = [
      COSMIC_SYSTEM_PROMPT,
      "",
      "You are giving a short DAILY DEBRIEF for the user's planned day.",
      "Honor capacity (don't push when stretched/overflowing), and align suggestions with the moon phase + cycle phase.",
      "Return ONLY a strict JSON object with keys: summary (1-2 sentences), honors (up to 3 short bullets like 'Title — reason'), reshape (up to 3 short bullets), rhythmNote (one sentence tying moon + cycle).",
      "No markdown, no preamble, JSON only.",
      COSMIC_TONE_REMINDER,
    ].join("\n");

    const resp = await fetch(LOVABLE_GATEWAY, {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: system },
          { role: "user", content: ctx },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (resp.status === 402 || resp.status === 429 || !resp.ok) {
      return respond(fallback(body));
    }

    const data = await resp.json();
    const text: string = data?.choices?.[0]?.message?.content ?? "";
    let parsed: any = null;
    try { parsed = JSON.parse(text); } catch { parsed = null; }
    if (!parsed?.summary) return respond(fallback(body));

    return respond({
      summary: String(parsed.summary ?? "").slice(0, 400),
      honors: Array.isArray(parsed.honors) ? parsed.honors.slice(0, 3).map(String) : [],
      reshape: Array.isArray(parsed.reshape) ? parsed.reshape.slice(0, 3).map(String) : [],
      rhythmNote: String(parsed.rhythmNote ?? "").slice(0, 240),
    });
  } catch {
    return respond({ summary: "Today's plan is yours — move gently.", honors: [], reshape: [], rhythmNote: "" });
  }
});