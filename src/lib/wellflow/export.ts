/**
 * WellFlow export — CSV and a simple PDF summary you can share with your
 * care team. This is a personal log, not a medical record.
 */
import jsPDF from "jspdf";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { n } from "./types";
import type { Goals } from "./types";

export type ExportRange = "30d" | "90d" | "all";

const fromDate = (range: ExportRange) => {
  if (range === "all") return "1900-01-01";
  const d = new Date();
  d.setDate(d.getDate() - (range === "30d" ? 30 : 90));
  return d.toISOString().slice(0, 10);
};

export interface WellflowExportData {
  from: string;
  food: any[];
  water: any[];
  weights: any[];
  injections: any[];
  checkins: any[];
}

export async function fetchExportData(range: ExportRange): Promise<WellflowExportData> {
  const from = fromDate(range);
  const [food, water, weights, injections, checkins] = await Promise.all([
    supabase.from("food_entries").select("*").gte("date", from).order("date"),
    supabase.from("water_entries").select("*").gte("date", from).order("date"),
    supabase.from("weight_logs").select("*").gte("date", from).order("date"),
    supabase.from("glp1_injections").select("*").gte("date", from).order("date"),
    supabase.from("wellness_checkins").select("*").gte("date", from).order("date"),
  ]);
  return {
    from,
    food: food.data ?? [],
    water: water.data ?? [],
    weights: weights.data ?? [],
    injections: injections.data ?? [],
    checkins: checkins.data ?? [],
  };
}

/* ------------------------------------------------------------------- csv */

const esc = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

function section(title: string, cols: string[], rows: any[]) {
  const lines = [title, cols.join(",")];
  rows.forEach(r => lines.push(cols.map(c => esc(r[c])).join(",")));
  lines.push("");
  return lines.join("\n");
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportWellflowCSV(data: WellflowExportData) {
  const csv = [
    section("FOOD", ["date", "logged_at", "meal_type", "food_name", "serving_size", "servings",
      "calories", "protein", "carbs", "fat", "fiber"], data.food),
    section("WATER", ["date", "logged_at", "ounces"], data.water),
    section("WEIGHT", ["date", "weight_lb", "notes"], data.weights),
    section("INJECTIONS", ["date", "time_of_day", "medication", "dose", "injection_site", "notes"], data.injections),
    section("CHECK-INS", ["date", "energy", "hunger", "fullness", "nausea", "digestion", "mood", "notes"], data.checkins),
  ].join("\n");
  download(new Blob([csv], { type: "text/csv;charset=utf-8" }),
    `wellflow-${format(new Date(), "yyyy-MM-dd")}.csv`);
}

/* ------------------------------------------------------------------- pdf */

export function exportWellflowPDF(data: WellflowExportData, goals: Goals, rangeLabel: string) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const margin = 48;
  const pageH = doc.internal.pageSize.getHeight();
  let y = margin;

  const line = (text: string, size = 10, bold = false) => {
    if (y > pageH - margin) { doc.addPage(); y = margin; }
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.text(text, margin, y);
    y += size + 6;
  };

  line("WellFlow summary", 18, true);
  line(`${rangeLabel} · generated ${format(new Date(), "MMM d, yyyy")}`, 10);
  y += 6;

  line("Goals", 13, true);
  line(`Calories ${goals.calories ?? "—"} · Protein ${goals.protein ?? "—"}g · Fiber ${goals.fiber ?? "—"}g · Water ${goals.water_oz ?? "—"}oz`);
  y += 6;

  const days = new Set(data.food.map((f: any) => f.date));
  const div = Math.max(days.size, 1);
  const sum = (k: string) => data.food.reduce((a: number, f: any) => a + n(f[k]), 0);
  line("Average per logged day", 13, true);
  line(`Days logged: ${days.size}`);
  line(`Calories ${Math.round(sum("calories") / div)} · Protein ${Math.round(sum("protein") / div)}g · Carbs ${Math.round(sum("carbs") / div)}g · Fat ${Math.round(sum("fat") / div)}g · Fiber ${Math.round(sum("fiber") / div)}g`);
  const waterDays = new Set(data.water.map((w: any) => w.date));
  line(`Water ${Math.round(data.water.reduce((a: number, w: any) => a + n(w.ounces), 0) / Math.max(waterDays.size, 1))} oz`);
  y += 6;

  line("Weight", 13, true);
  if (data.weights.length) {
    const first = n(data.weights[0].weight_lb);
    const last = n(data.weights[data.weights.length - 1].weight_lb);
    line(`Start of range ${first} lb · Latest ${last} lb · Change ${Math.round((last - first) * 10) / 10} lb`);
    data.weights.slice(-20).forEach((w: any) =>
      line(`   ${w.date}   ${n(w.weight_lb)} lb${w.notes ? ` — ${String(w.notes).slice(0, 60)}` : ""}`, 9));
  } else line("No weigh-ins in this range.");
  y += 6;

  line("Injections logged", 13, true);
  if (data.injections.length) {
    data.injections.slice(-20).forEach((i: any) =>
      line(`   ${i.date}${i.time_of_day ? ` ${String(i.time_of_day).slice(0, 5)}` : ""}   ${[i.medication, i.dose, i.injection_site].filter(Boolean).join(" · ") || "Logged"}`, 9));
  } else line("None recorded in this range.");
  y += 6;

  line("Check-in averages (1–5)", 13, true);
  const avg = (k: string) => {
    const vals = data.checkins.map((c: any) => c[k]).filter((v: any) => v != null).map(Number);
    return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : "—";
  };
  line(`Energy ${avg("energy")} · Hunger ${avg("hunger")} · Fullness ${avg("fullness")} · Nausea ${avg("nausea")} · Digestion ${avg("digestion")} · Mood ${avg("mood")}`);

  y += 12;
  line("This is a personal log kept by the individual, not a medical record. Values are self-reported.", 8);

  doc.save(`wellflow-report-${format(new Date(), "yyyy-MM-dd")}.pdf`);
}

/* -------------------------------------------------- weekly report export */

export interface WeeklyExportData {
  from: string;
  to: string;
  targets: { calories: number | null; protein: number | null; fiber: number | null; water_oz: number | null };
  adherence: { score: number; streak: number; best: number; parts: { label: string; hit: number; of: number }[] };
  nutrition: { date: string; calories: number; protein: number; carbs: number; fat: number; fiber: number; water: number }[];
  movement: { date: string; activity: string; minutes: number; intensity: string; note: string | null }[];
  doses: { date: string; item: string; time: string; status: string }[];
  symptoms: { date: string; food: string; rating: number; symptoms: string; note: string | null }[];
  weights: { date: string; weight_lb: number }[];
  injections: { date: string; medication: string | null; dose: string | null }[];
}

/** Pull one week of the signed-in user's own logs for the report export. */
export async function fetchWeeklyExport(
  from: string, to: string,
  targets: WeeklyExportData["targets"],
  adherence: WeeklyExportData["adherence"],
): Promise<WeeklyExportData> {
  const [food, water, moves, doses, meds, feels, weights, shots] = await Promise.all([
    supabase.from("food_entries").select("date,calories,protein,carbs,fat,fiber").gte("date", from).lte("date", to),
    supabase.from("water_entries").select("date,ounces").gte("date", from).lte("date", to),
    supabase.from("wellflow_movement_logs").select("date,activity,minutes,intensity,note").gte("date", from).lte("date", to),
    supabase.from("medication_logs").select("medication_id,scheduled_date,scheduled_time,status").gte("scheduled_date", from).lte("scheduled_date", to),
    supabase.from("medications").select("id,name,dose"),
    supabase.from("food_feel_logs").select("date,food_name,rating,symptoms,note").gte("date", from).lte("date", to),
    supabase.from("weight_logs").select("date,weight_lb").gte("date", from).lte("date", to),
    supabase.from("glp1_injections").select("date,medication,dose").gte("date", from).lte("date", to),
  ]);

  const byDay = new Map<string, WeeklyExportData["nutrition"][number]>();
  const day = (d: string) => {
    const cur = byDay.get(d) ?? { date: d, calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, water: 0 };
    byDay.set(d, cur);
    return cur;
  };
  for (const f of (food.data ?? []) as any[]) {
    const b = day(f.date);
    b.calories += n(f.calories); b.protein += n(f.protein); b.carbs += n(f.carbs);
    b.fat += n(f.fat); b.fiber += n(f.fiber);
  }
  for (const w of (water.data ?? []) as any[]) day(w.date).water += n(w.ounces);

  const medName = new Map((meds.data ?? []).map((m: any) => [m.id, [m.name, m.dose].filter(Boolean).join(" · ")]));

  return {
    from, to, targets, adherence,
    nutrition: Array.from(byDay.values()).sort((a, b) => a.date.localeCompare(b.date))
      .map(d => ({ ...d, calories: Math.round(d.calories), protein: Math.round(d.protein),
                   carbs: Math.round(d.carbs), fat: Math.round(d.fat),
                   fiber: Math.round(d.fiber), water: Math.round(d.water) })),
    movement: (moves.data ?? []).map((m: any) => ({
      date: m.date, activity: m.activity, minutes: n(m.minutes), intensity: m.intensity, note: m.note ?? null,
    })),
    doses: (doses.data ?? []).map((d: any) => ({
      date: d.scheduled_date, item: medName.get(d.medication_id) ?? "Item",
      time: String(d.scheduled_time ?? "").slice(0, 5), status: d.status,
    })),
    symptoms: (feels.data ?? []).map((f: any) => ({
      date: f.date, food: f.food_name, rating: n(f.rating),
      symptoms: Array.isArray(f.symptoms) ? f.symptoms.join(" / ") : "", note: f.note ?? null,
    })),
    weights: (weights.data ?? []).map((w: any) => ({ date: w.date, weight_lb: n(w.weight_lb) })),
    injections: (shots.data ?? []).map((i: any) => ({ date: i.date, medication: i.medication ?? null, dose: i.dose ?? null })),
  };
}

export function exportWeeklyCSV(d: WeeklyExportData) {
  const csv = [
    `WEEKLY REPORT,${d.from} to ${d.to}`,
    "",
    section("TARGETS", ["calories", "protein", "fiber", "water_oz"], [d.targets]),
    section("CONSISTENCY", ["area", "logged", "of"],
      d.adherence.parts.map(p => ({ area: p.label, logged: p.hit, of: p.of }))),
    `Score,${d.adherence.score}%`,
    `Current streak,${d.adherence.streak} days`,
    `Best streak,${d.adherence.best} days`,
    "",
    section("NUTRITION BY DAY", ["date", "calories", "protein", "carbs", "fat", "fiber", "water"], d.nutrition),
    section("MOVEMENT", ["date", "activity", "minutes", "intensity", "note"], d.movement),
    section("MEDS & SUPPLEMENTS", ["date", "time", "item", "status"], d.doses),
    section("SYMPTOMS", ["date", "food", "rating", "symptoms", "note"], d.symptoms),
    section("WEIGHT", ["date", "weight_lb"], d.weights),
    section("INJECTIONS", ["date", "medication", "dose"], d.injections),
    "This is a personal log, self-reported and not a medical record.",
  ].join("\n");
  download(new Blob([csv], { type: "text/csv;charset=utf-8" }), `wellflow-week-${d.to}.csv`);
}

export function exportWeeklyPDF(d: WeeklyExportData) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const margin = 48;
  const pageH = doc.internal.pageSize.getHeight();
  let y = margin;
  const line = (text: string, size = 10, bold = false) => {
    if (y > pageH - margin) { doc.addPage(); y = margin; }
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.text(text, margin, y);
    y += size + 6;
  };

  line("WellFlow weekly report", 18, true);
  line(`${d.from} – ${d.to} · generated ${format(new Date(), "MMM d, yyyy")}`);
  y += 6;

  line("Targets you set", 13, true);
  line(`Calories ${d.targets.calories ?? "—"} · Protein ${d.targets.protein ?? "—"}g · Fiber ${d.targets.fiber ?? "—"}g · Water ${d.targets.water_oz ?? "—"}oz`);
  y += 6;

  line("Consistency", 13, true);
  line(`Score ${d.adherence.score}% · Streak ${d.adherence.streak} days (best ${d.adherence.best})`);
  d.adherence.parts.forEach(p => line(`   ${p.label}: ${p.hit} of ${p.of}`, 9));
  y += 6;

  line("Nutrition by day", 13, true);
  if (d.nutrition.length) {
    d.nutrition.forEach(r => line(`   ${r.date}   ${r.calories} cal · ${r.protein}g protein · ${r.fiber}g fiber · ${r.water} oz water`, 9));
  } else line("Nothing logged this week.", 9);
  y += 6;

  line("Movement", 13, true);
  if (d.movement.length) {
    d.movement.forEach(m => line(`   ${m.date}   ${m.activity} · ${m.minutes} min · ${m.intensity}`, 9));
  } else line("No sessions logged.", 9);
  y += 6;

  line("Meds & supplements marked", 13, true);
  if (d.doses.length) {
    d.doses.slice(0, 60).forEach(x => line(`   ${x.date} ${x.time}   ${x.item} — ${x.status}`, 9));
  } else line("Nothing marked this week.", 9);
  y += 6;

  line("How foods felt", 13, true);
  if (d.symptoms.length) {
    d.symptoms.slice(0, 60).forEach(s =>
      line(`   ${s.date}   ${s.food} — ${s.rating}/5${s.symptoms ? ` · ${s.symptoms}` : ""}`, 9));
  } else line("No notes recorded.", 9);
  y += 6;

  line("Weight & injections", 13, true);
  d.weights.forEach(w => line(`   ${w.date}   ${w.weight_lb} lb`, 9));
  d.injections.forEach(i => line(`   ${i.date}   ${[i.medication, i.dose].filter(Boolean).join(" · ") || "Injection logged"}`, 9));

  y += 12;
  line("A personal log kept by the individual. Self-reported, not a medical record, and not medical advice.", 8);
  doc.save(`wellflow-week-${d.to}.pdf`);
}
