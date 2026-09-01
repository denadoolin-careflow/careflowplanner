// deno-lint-ignore-file no-explicit-any
/**
 * Food lookup proxy for WellFlow.
 * Searches Open Food Facts by text, or looks up a single barcode, and
 * normalises the result into the shape the client expects.
 */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const UA = "CareFlowPlanner/1.0 (wellflow food lookup)";

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 10) / 10 : 0;
};

function normalize(p: any) {
  const n = p?.nutriments ?? {};
  const perServing = n["energy-kcal_serving"] != null || n["proteins_serving"] != null;
  const pick = (base: string) => num(perServing ? n[`${base}_serving`] : n[`${base}_100g`]);
  const name = [p?.product_name, p?.brands ? `(${String(p.brands).split(",")[0].trim()})` : ""]
    .filter(Boolean).join(" ").trim();
  if (!name) return null;
  return {
    id: `off:${p?.code ?? name}`,
    name: name.slice(0, 120),
    brand: p?.brands ? String(p.brands).split(",")[0].trim() : null,
    servingSize: perServing ? (p?.serving_size || "1 serving") : "100 g",
    calories: num(perServing ? n["energy-kcal_serving"] : n["energy-kcal_100g"]),
    protein: pick("proteins"),
    carbs: pick("carbohydrates"),
    fat: pick("fat"),
    fiber: pick("fiber"),
    barcode: p?.code ?? null,
    source: "openfoodfacts",
  };
}

const FIELDS = "code,product_name,brands,serving_size,nutriments";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let body: { q?: string; barcode?: string } = {};
  try { body = await req.json(); } catch { /* empty */ }

  const q = typeof body.q === "string" ? body.q.trim().slice(0, 100) : "";
  const barcode = typeof body.barcode === "string" ? body.barcode.replace(/\D/g, "").slice(0, 20) : "";

  if (!q && !barcode) {
    return new Response(JSON.stringify({ error: "Provide a search term or barcode" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    if (barcode) {
      const r = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=${FIELDS}`,
        { headers: { "User-Agent": UA } },
      );
      const j = await r.json();
      const item = j?.product ? normalize(j.product) : null;
      return new Response(JSON.stringify({ results: item ? [item] : [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}`
      + `&search_simple=1&action=process&json=1&page_size=25&fields=${FIELDS}`;
    const r = await fetch(url, { headers: { "User-Agent": UA } });
    if (!r.ok) throw new Error(`lookup failed (${r.status})`);
    const j = await r.json();
    const results = (j?.products ?? [])
      .map(normalize)
      .filter((x: any) => x && (x.calories > 0 || x.protein > 0))
      .slice(0, 20);

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message, results: [] }), {
      status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
