import { corsHeaders } from "../_shared/cors.ts";
import { meterRequest, WEIGHTS } from "../_shared/ai-meter.ts";
import { COSMIC_SYSTEM_PROMPT, COSMIC_TONE_REMINDER } from "../_shared/cosmic-tone.ts";

const LOVABLE_GATEWAY = "https://api.openai.com/v1/chat/completions";

interface Body {
  date?: string;
  moon?: { phase?: string; sign?: string; element?: string; illumination?: number } | null;
  cycle?: { phase?: string; day?: number } | null;
  capacity?: { plannedMinutes?: number; ceilingMinutes?: number; label?: string } | null;
  tasks?: { id?: string; title: string; time?: string; estMinutes?: number }[];
  appointments?: { title: string; time?: string }[];
  tone?: "gentle" | "encouraging" | "direct" | "cosmic" | "playful";
  burnout?: { level?: string | null; mvd?: boolean; mvdTaskTitle?: string | null } | null;
}

function fallback(b: Body) {
  const cap = b.capacity?.label ?? "steady";
  const lvl = b.burnout?.level ?? null;
  let summary =
    cap === "gentle" ? "Today's plan is gentle — leave room to enjoy it."
    : cap === "steady" ? "Today's plan feels steady. Trust the rhythm."
    : cap === "stretched" ? "You're a little stretched — give yourself permission to trim."
    : "Today is overflowing. Let one item soften or shift.";
  if (lvl === "depleted") {
    summary = b.burnout?.mvdTaskTitle
      ? `Minimum viable day: ${b.burnout.mvdTaskTitle}. Everything else can wait.`
      : "Minimum viable day — one tender thing only.";
  } else if (lvl === "tender") {
    summary = "Tender capacity — shave the edges and protect your energy.";
  }
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
    const apiKey = (Deno.env.get("OPENAI_API_KEY") ?? Deno.env.get("LOVABLE_API_KEY"));
    if (!apiKey) return respond(fallback(body));

    const ctx = [
      body.date ? `Date: ${body.date}` : null,
      body.moon ? `Moon: ${body.moon.phase ?? "—"} in ${body.moon.sign ?? "—"} (${body.moon.element ?? "—"}, ${body.moon.illumination ?? 0}% lit).` : null,
      body.cycle ? `Cycle: ${body.cycle.phase} phase, day ${body.cycle.day}.` : "Cycle: not tracking.",
      body.capacity ? `Capacity: ${body.capacity.plannedMinutes ?? 0}m planned vs soft ceiling ${body.capacity.ceilingMinutes ?? 0}m → ${body.capacity.label ?? "steady"}.` : null,
      body.burnout?.level ? `Burnout check-in: ${body.burnout.level}${body.burnout.mvd ? " · minimum-viable-day ON" : ""}${body.burnout.mvdTaskTitle ? ` · one thing: ${body.burnout.mvdTaskTitle}` : ""}.` : null,
      body.tasks?.length ? `Planned tasks (use the id when referencing them):\n${body.tasks.map(t => `- [${t.id ?? ""}] ${t.title}${t.time ? ` @ ${t.time}` : ""}${t.estMinutes ? ` (${t.estMinutes}m)` : ""}`).join("\n")}` : "No planned tasks.",
      body.appointments?.length ? `Appointments:\n${body.appointments.map(a => `- ${a.title}${a.time ? ` @ ${a.time}` : ""}`).join("\n")}` : null,
    ].filter(Boolean).join("\n");

    const tone = body.tone ?? "gentle";
    const toneLine: Record<string, string> = {
      gentle: "Tone: soft, permissive, low-pressure. Short calming sentences.",
      encouraging: "Tone: warm cheerleader. Confidence, not pressure.",
      direct: "Tone: clear and concise. No fluff, no metaphors.",
      cosmic: "Tone: lean into moon-phase and cycle imagery without being woo.",
      playful: "Tone: light, witty, a little sparkle.",
    };
    const system = [
      COSMIC_SYSTEM_PROMPT,
      "",
      "You are giving a short DAILY DEBRIEF for the user's planned day.",
      "Honor capacity (don't push when stretched/overflowing), and align suggestions with the moon phase + cycle phase.",
      "If burnout level is 'tender' or 'depleted', favor rest and reshape suggestions over pushing.",
      "If minimum-viable-day is ON, treat the named one thing as honored and route everything else into reshape as 'could wait'.",
      "Return ONLY a strict JSON object with keys: summary (1-2 sentences), honors (up to 3 objects {id?, title, reason}), reshape (up to 3 objects {id?, title, reason}), rhythmNote (one sentence tying moon + cycle).",
      "When a task appears in the planned tasks list, copy its id verbatim into the matching honors/reshape entry.",
      "No markdown, no preamble, JSON only.",
      toneLine[tone],
      COSMIC_TONE_REMINDER,
    ].join("\n");

    const resp = await fetch(LOVABLE_GATEWAY, {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-5-mini",
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

    const normalizeList = (raw: any): { id?: string | null; title: string; reason: string }[] => {
      if (!Array.isArray(raw)) return [];
      return raw.slice(0, 3).map((x: any) => {
        if (typeof x === "string") {
          const [title, ...rest] = x.split(" — ");
          return { id: null, title: title.trim(), reason: rest.join(" — ").trim() };
        }
        return {
          id: x?.id ? String(x.id) : null,
          title: String(x?.title ?? "").slice(0, 160),
          reason: String(x?.reason ?? "").slice(0, 240),
        };
      }).filter(it => it.title);
    };
    return respond({
      summary: String(parsed.summary ?? "").slice(0, 400),
      honors: normalizeList(parsed.honors),
      reshape: normalizeList(parsed.reshape),
      rhythmNote: String(parsed.rhythmNote ?? "").slice(0, 240),
    });
  } catch {
    return respond({ summary: "Today's plan is yours — move gently.", honors: [], reshape: [], rhythmNote: "" });
  }
});