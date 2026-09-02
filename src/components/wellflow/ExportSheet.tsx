import { useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { exportWellflowCSV, exportWellflowPDF, fetchExportData, type ExportRange } from "@/lib/wellflow/export";
import { useGoals } from "@/lib/wellflow/data";

const RANGES: { key: ExportRange; label: string }[] = [
  { key: "30d", label: "Last 30 days" },
  { key: "90d", label: "Last 90 days" },
  { key: "all", label: "All time" },
];

export function ExportSheet({
  open, onOpenChange,
}: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { goals } = useGoals();
  const [range, setRange] = useState<ExportRange>("30d");
  const [busy, setBusy] = useState<"csv" | "pdf" | null>(null);

  const run = async (kind: "csv" | "pdf") => {
    setBusy(kind);
    try {
      const data = await fetchExportData(range);
      if (kind === "csv") exportWellflowCSV(data);
      else exportWellflowPDF(data, goals, RANGES.find(r => r.key === range)?.label ?? "");
      toast.success("Export ready");
      onOpenChange(false);
    } catch {
      toast.error("Could not build that export");
    } finally { setBusy(null); }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl">
        <SheetHeader className="text-left">
          <SheetTitle className="font-display">Export my WellFlow data</SheetTitle>
          <SheetDescription>
            A copy of what you've logged, to keep or share with your care team.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {RANGES.map(r => (
            <button key={r.key} type="button" onClick={() => setRange(r.key)} aria-pressed={range === r.key}
                    className={cn("rounded-full border px-3 py-1 text-xs",
                      range === r.key ? "border-primary bg-primary/15 font-medium"
                                      : "border-border/60 text-muted-foreground hover:bg-muted/50")}>
              {r.label}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Button variant="secondary" className="gap-2" disabled={!!busy} onClick={() => run("csv")}>
            {busy === "csv" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
            Download CSV
          </Button>
          <Button className="gap-2" disabled={!!busy} onClick={() => run("pdf")}>
            {busy === "pdf" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            PDF report
          </Button>
        </div>

        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
          This is your personal log — self-reported and not a medical record.
        </p>
      </SheetContent>
    </Sheet>
  );
}
