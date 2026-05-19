import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const MONTH_NAMES = [
  "january","february","march","april","may","june",
  "july","august","september","october","november","december",
];

const PHASE_PATTERNS: [RegExp, string][] = [
  [/FULL\s+MOON/i, "full"],
  [/NEW\s+MOON/i, "new"],
  [/First\s+Quarter/i, "first-quarter"],
  [/Last\s+Quarter/i, "last-quarter"],
  [/Waxing\s+Crescent/i, "waxing-crescent"],
  [/Waxing\s+Gibbous/i, "waxing-gibbous"],
  [/Waning\s+Crescent/i, "waning-crescent"],
  [/Waning\s+Gibbous/i, "waning-gibbous"],
];

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function parseMonth(html: string, month: number, year: number) {
  const monthSlug = MONTH_NAMES[month - 1];
  const result: Record<string, { phase: string; sign: string }> = {};
  const dayRegex = new RegExp(`moon-phase-day-(\\d{1,2})-${monthSlug}-${year}`, "gi");
  const seen = new Set<number>();
  let m: RegExpExecArray | null;
  while ((m = dayRegex.exec(html)) !== null) {
    const day = Number(m[1]);
    if (seen.has(day)) continue;
    const end = html.indexOf("</tr>", m.index);
    if (end < 0) continue;
    const row = html.slice(m.index, end);
    let phase = "";
    for (const [re, name] of PHASE_PATTERNS) {
      if (re.test(row)) { phase = name; break; }
    }
    if (!phase) continue;
    const signMatch = row.match(/symbol_([a-z]+)_mobil/i);
    const sign = signMatch ? capitalize(signMatch[1]) : "";
    const key = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    result[key] = { phase, sign };
    seen.add(day);
  }
  return result;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const { month, year } = await req.json().catch(() => ({}));
    const m = Number(month), y = Number(year);
    if (!Number.isInteger(m) || m < 1 || m > 12 || !Number.isInteger(y) || y < 1900 || y > 2100) {
      return new Response(JSON.stringify({ error: "Invalid month/year" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const url = `https://mooncalendar.astro-seek.com/moon-phases-calendar-${MONTH_NAMES[m - 1]}-${y}`;
    const r = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; CareFlow/1.0)" },
    });
    if (!r.ok) {
      return new Response(JSON.stringify({ error: `Astro-Seek returned ${r.status}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const html = await r.text();
    const data = parseMonth(html, m, y);
    return new Response(JSON.stringify({ data, source: url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
