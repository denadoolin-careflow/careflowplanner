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
