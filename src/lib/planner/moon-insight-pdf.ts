import jsPDF from "jspdf";
import { format } from "date-fns";
import type { AllocationSlice } from "@/lib/planner/time-allocation";

export interface MoonInsightExport {
  date: Date;
  moonLabel: string;
  illumination: number;
  invitation: string;
  cycleLabel?: string;
  journalTitle?: string;
  journalBody?: string;
  noteTitle?: string;
  noteBody?: string;
  slices: AllocationSlice[];
  totalPlannedMin: number;
  totalDoneMin: number;
}

const hrs = (m: number) => `${Math.round(m / 6) / 10}h`;

/** Render the day's moon insight as a one-page PDF blob. */
export function buildMoonInsightPdf(data: MoonInsightExport): { blob: Blob; filename: string } {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const M = 48;
  const W = doc.internal.pageSize.getWidth() - M * 2;
  let y = M;

  const line = (text: string, size: number, style: "normal" | "bold" | "italic" = "normal", gap = 6) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(text, W) as string[];
    for (const l of lines) {
      if (y > doc.internal.pageSize.getHeight() - M) { doc.addPage(); y = M; }
      doc.text(l, M, y);
      y += size + 2;
    }
    y += gap;
  };

  const rule = () => {
    doc.setDrawColor(210);
    doc.line(M, y, M + W, y);
    y += 14;
  };

  line(format(data.date, "EEEE, MMMM d, yyyy"), 18, "bold", 2);
  line(
    [`${data.moonLabel} · ${data.illumination}% lit`, data.cycleLabel].filter(Boolean).join("  ·  "),
    11, "normal", 4,
  );
  line(data.invitation, 11, "italic", 10);
  rule();

  line("Journal", 13, "bold", 4);
  if (data.journalTitle) line(data.journalTitle, 11, "bold", 2);
  line(data.journalBody?.trim() || "No entry written today.", 11, "normal", 12);
  rule();

  line("Daily note", 13, "bold", 4);
  if (data.noteTitle) line(data.noteTitle, 11, "bold", 2);
  line(data.noteBody?.trim() || "No daily note today.", 10, "normal", 12);
  rule();

  line("Planned vs completed", 13, "bold", 4);
  const pct = data.totalPlannedMin ? Math.round((data.totalDoneMin / data.totalPlannedMin) * 100) : 0;
  line(`${hrs(data.totalPlannedMin)} planned · ${hrs(data.totalDoneMin)} completed (${pct}%)`, 11, "normal", 6);
  if (!data.slices.length) line("Nothing scheduled for this day.", 10, "italic", 4);
  for (const s of data.slices) {
    line(`• ${s.label} — ${hrs(s.plannedMin)} planned, ${hrs(s.doneMin)} done`, 10, "normal", 1);
  }

  y += 10;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(140);
  doc.text("Made with CareFlow", M, doc.internal.pageSize.getHeight() - 28);

  return {
    blob: doc.output("blob"),
    filename: `moon-insight-${format(data.date, "yyyy-MM-dd")}.pdf`,
  };
}

/** Share the PDF where supported, otherwise download it. */
export async function shareOrDownloadPdf(blob: Blob, filename: string) {
  const file = new File([blob], filename, { type: "application/pdf" });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: "Moon insight" });
      return "shared" as const;
    } catch { /* fall through to download */ }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return "downloaded" as const;
}
