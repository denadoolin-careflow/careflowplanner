/** Weekly progress report — last 7 days next to the 7 before. Descriptive only. */
import { format } from "date-fns";
import { SectionCard } from "@/components/cards/SectionCard";
import { AdherenceCard } from "@/components/wellflow/AdherenceCard";
import { EmptyState } from "@/components/cards/EmptyState";
import { Button } from "@/components/ui/button";
import { ArrowDown, ArrowRight, ArrowUp, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGoals } from "@/lib/wellflow/data";
import { useWeeklyReport, type WeekStats } from "@/lib/wellflow/weekly-report";
import { exportWeeklyCSV, exportWeeklyPDF, fetchWeeklyExport } from "@/lib/wellflow/export";
import { fetchAdherence } from "@/lib/wellflow/adherence";
import { doseSlots, useMedications } from "@/lib/medications";
import { useState } from "react";
import { toast } from "sonner";

const fmt = (n: number, unit = "") => `${Math.round(n)}${unit}`;

function Delta({ now, prev, unit = "", lowerBetter }: { now: number; prev: number; unit?: string; lowerBetter?: boolean }) {
  const d = now - prev;
  if (!prev && !now) return <span className="text-muted-foreground">—</span>;
  if (Math.abs(d) < 0.5) return <span className="inline-flex items-center gap-0.5 text-muted-foreground"><ArrowRight className="h-3 w-3" /> steady</span>;
  const up = d > 0;
  const good = lowerBetter ? !up : up;
  return (
    <span className={cn("inline-flex items-center gap-0.5", good ? "text-primary" : "text-muted-foreground")}>
      {up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
      {fmt(Math.abs(d), unit)}
    </span>
  );
}

function Row({ label, now, prev, unit = "", lowerBetter }: { label: string; now: number; prev: number; unit?: string; lowerBetter?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2 rounded-2xl bg-muted/30 px-3 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-baseline gap-2">
        <span className="font-semibold tabular-nums">{fmt(now, unit)}</span>
        <span className="text-[11px]"><Delta now={now} prev={prev} unit={unit} lowerBetter={lowerBetter} /></span>
      </span>
    </div>
  );
}

const rangeLabel = (w: WeekStats) =>
  `${format(new Date(`${w.from}T12:00:00`), "MMM d")} – ${format(new Date(`${w.to}T12:00:00`), "MMM d")}`;

export function WeeklyReportScreen({ onExport }: { onExport?: () => void }) {
  const { goals } = useGoals();
  const { report, loading } = useWeeklyReport({ calories: goals.calories, protein: goals.protein });
  const { medications } = useMedications();
  const [busy, setBusy] = useState<"csv" | "pdf" | null>(null);

  const runExport = async (kind: "csv" | "pdf") => {
    if (!report) return;
    setBusy(kind);
    try {
      const { current } = await fetchAdherence({
        calories: goals.calories ?? null,
        protein: goals.protein ?? null,
        water: goals.water_oz ?? null,
        movementDays: 3,
        doseSlotsPerDay: doseSlots(medications).length,
      });
      const data = await fetchWeeklyExport(
        report.current.from, report.current.to,
        { calories: goals.calories ?? null, protein: goals.protein ?? null,
          fiber: goals.fiber ?? null, water_oz: goals.water_oz ?? null },
        { score: current.score, streak: current.loggingStreak, best: current.bestStreak,
          parts: current.parts.map(p => ({ label: p.label, hit: p.hit, of: p.of })) },
      );
      if (kind === "csv") exportWeeklyCSV(data); else exportWeeklyPDF(data);
      toast.success("Weekly report ready");
    } catch {
      toast.error("Could not build that report");
    } finally { setBusy(null); }
  };

  return (
    <div className="space-y-4">
      <SectionCard
        title="This week"
        subtitle={report ? rangeLabel(report.current) : "Last 7 days"}
        accent="sage"
        action={
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" disabled={!!busy || !report}
                    onClick={() => runExport("csv")}>
              <Download className="mr-1 h-3.5 w-3.5" /> CSV
            </Button>
            <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" disabled={!!busy || !report}
                    onClick={() => runExport("pdf")}>
              <Download className="mr-1 h-3.5 w-3.5" /> PDF
            </Button>
            {onExport && (
              <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={onExport}>
                More
              </Button>
            )}
          </div>
        }
      >
        {loading || !report ? (
          <div className="h-32 animate-pulse rounded-xl bg-muted/40" />
        ) : !report.hasData ? (
          <EmptyState title="Nothing logged this week yet"
                      hint="Log food, water, weight, or movement and your weekly summary fills in." />
        ) : (
          <>
            <div className="grid gap-2 sm:grid-cols-2">
              <Row label="Calories / day" now={report.current.calories} prev={report.previous.calories} />
              <Row label="Protein / day" now={report.current.protein} prev={report.previous.protein} unit="g" />
              <Row label="Fiber / day" now={report.current.fiber} prev={report.previous.fiber} unit="g" />
              <Row label="Water / day" now={report.current.water} prev={report.previous.water} unit=" oz" />
              <Row label="Movement minutes" now={report.current.movementMinutes} prev={report.previous.movementMinutes} />
              <Row label="Days logged" now={report.current.daysLogged} prev={report.previous.daysLogged} />
              <Row label="Days moved" now={report.current.movementDays} prev={report.previous.movementDays} />
              <Row label="Injections" now={report.current.injections} prev={report.previous.injections} />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-center">
              <div className="rounded-2xl bg-muted/30 px-2 py-2.5">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Weight change</p>
                <p className="text-sm font-semibold tabular-nums">
                  {report.weightChange == null ? "—" : `${report.weightChange > 0 ? "+" : ""}${report.weightChange} lb`}
                </p>
              </div>
              <div className="rounded-2xl bg-muted/30 px-2 py-2.5">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Average energy</p>
                <p className="text-sm font-semibold tabular-nums">
                  {report.current.energy == null ? "—" : report.current.energy.toFixed(1)}
                </p>
              </div>
            </div>
          </>
        )}
      </SectionCard>

      {report?.highlights.length ? (
        <SectionCard title="What stood out" subtitle="Straight from your own logs">
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            {report.highlights.map(h => (
              <li key={h} className="rounded-2xl bg-muted/30 px-3 py-2">{h}</li>
            ))}
          </ul>
        </SectionCard>
      ) : null}

      {report && (report.bestFoods.length > 0 || report.hardestFoods.length > 0) && (
        <SectionCard title="Foods this week" subtitle="Based on how you rated them afterwards" accent="warm">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Sat well</p>
              {report.bestFoods.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nothing repeated yet.</p>
              ) : (
                <ul className="space-y-1">
                  {report.bestFoods.map(f => (
                    <li key={f.food} className="rounded-2xl bg-primary/10 px-3 py-1.5 text-sm">
                      {f.food} <span className="text-xs text-muted-foreground">{f.avgRating.toFixed(1)}/5 · {f.count}×</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Tended to bother you</p>
              {report.hardestFoods.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nothing repeated yet.</p>
              ) : (
                <ul className="space-y-1">
                  {report.hardestFoods.map(f => (
                    <li key={f.food} className="rounded-2xl bg-destructive/10 px-3 py-1.5 text-sm">
                      {f.food} <span className="text-xs text-muted-foreground">{f.avgRating.toFixed(1)}/5 · {f.count}×</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </SectionCard>
      )}

      <AdherenceCard />

      <p className="px-1 text-xs text-muted-foreground">
        A summary of what you logged — not medical advice, and not a prediction. Share it with your care team if
        it's useful to them.
      </p>
    </div>
  );
}
