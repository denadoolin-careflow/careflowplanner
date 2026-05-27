import jsPDF from "jspdf";
import { format, parseISO } from "date-fns";
import { memoryTypeMeta, type Memory } from "@/lib/memories";
import type { LovedOne } from "@/lib/loved-ones";
import type { Recipient } from "@/lib/types";

function nameFor(
  ids: string[],
  recipients: Recipient[] | undefined,
  lovedOnes: LovedOne[],
  kind: "recipient" | "loved",
): string[] {
  return ids
    .map((id) =>
      kind === "recipient"
        ? recipients?.find((r) => r.id === id)?.name
        : lovedOnes.find((l) => l.id === id)?.name,
    )
    .filter(Boolean) as string[];
}

export interface ExportOptions {
  scopeLabel: string;
  favoritesOnly?: boolean;
  recipients?: Recipient[];
  lovedOnes: LovedOne[];
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportMemoriesJSON(memories: Memory[], opts: ExportOptions) {
  const data = {
    exportedAt: new Date().toISOString(),
    scope: opts.scopeLabel,
    favoritesOnly: !!opts.favoritesOnly,
    count: memories.length,
    memories: memories.map((m) => ({
      ...m,
      people: {
        recipients: nameFor(m.recipientIds, opts.recipients, opts.lovedOnes, "recipient"),
        lovedOnes: nameFor(m.lovedOneIds, opts.recipients, opts.lovedOnes, "loved"),
      },
    })),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  triggerDownload(blob, `memories-${format(new Date(), "yyyy-MM-dd")}.json`);
}

export function exportMemoriesPDF(memories: Memory[], opts: ExportOptions) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  const contentW = pageW - margin * 2;
  let y = margin;

  const ensureSpace = (h: number) => {
    if (y + h > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const addWrapped = (text: string, size: number, lineH: number, color: [number, number, number] = [60, 60, 60]) => {
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, contentW);
    for (const line of lines) {
      ensureSpace(lineH);
      doc.text(line, margin, y);
      y += lineH;
    }
  };

  // Cover
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(120, 50, 70);
  doc.text("Memories", margin, y);
  y += 34;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.setTextColor(110, 80, 90);
  doc.text(opts.scopeLabel, margin, y);
  y += 18;

  doc.setFontSize(10);
  doc.setTextColor(140, 140, 140);
  const meta = `${memories.length} ${memories.length === 1 ? "memory" : "memories"} · exported ${format(new Date(), "MMM d, yyyy")}${opts.favoritesOnly ? " · favorites only" : ""}`;
  doc.text(meta, margin, y);
  y += 24;

  doc.setDrawColor(230, 200, 210);
  doc.line(margin, y, pageW - margin, y);
  y += 18;

  // Sort newest first
  const sorted = [...memories].sort((a, b) => b.date.localeCompare(a.date));

  // Group by year
  let currentYear = "";
  for (const m of sorted) {
    const year = m.date.slice(0, 4);
    if (year !== currentYear) {
      ensureSpace(40);
      currentYear = year;
      y += 6;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(120, 50, 70);
      doc.text(year, margin, y);
      y += 8;
      doc.setDrawColor(240, 220, 225);
      doc.line(margin, y, pageW - margin, y);
      y += 16;
    }

    const tMeta = memoryTypeMeta(m.memoryType);
    const dateStr = format(parseISO(m.date), "EEE, MMM d, yyyy");
    const fav = m.isFavorite ? "  ♥" : "";
    const pinned = m.isPinned ? "  ⌑" : "";

    ensureSpace(60);
    // Title row
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(60, 30, 45);
    const titleLines = doc.splitTextToSize(`${tMeta.label.toUpperCase()} · ${m.title}${fav}${pinned}`, contentW);
    for (const line of titleLines) {
      ensureSpace(16);
      doc.text(line, margin, y);
      y += 16;
    }

    // Sub meta
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(130, 110, 115);
    const subParts = [dateStr];
    if (m.time) subParts.push(m.time);
    if (m.location) subParts.push(m.location);
    if (m.mood) subParts.push(`mood: ${m.mood}`);
    const recips = nameFor(m.recipientIds, opts.recipients, opts.lovedOnes, "recipient");
    const loves = nameFor(m.lovedOneIds, opts.recipients, opts.lovedOnes, "loved");
    const people = [...recips, ...loves];
    if (people.length) subParts.push(`with ${people.join(", ")}`);
    addWrapped(subParts.join("  ·  "), 10, 13, [130, 110, 115]);

    if (m.description) {
      y += 4;
      addWrapped(m.description, 11, 15, [55, 55, 60]);
    }

    const reflections: Array<[string, string | undefined]> = [
      ["Meaningful", m.meaningfulNote],
      ["Beautiful", m.beautifulNote],
      ["Challenging", m.challengingNote],
      ["Want to remember", m.rememberNote],
      ["Reflection", m.reflection],
    ];
    for (const [label, val] of reflections) {
      if (!val) continue;
      y += 2;
      doc.setFont("helvetica", "bold");
      addWrapped(label, 10, 13, [120, 80, 95]);
      doc.setFont("helvetica", "normal");
      addWrapped(val, 10.5, 14, [70, 70, 75]);
    }

    if (m.tags.length) {
      y += 2;
      addWrapped(m.tags.map((t) => `#${t}`).join("  "), 9.5, 12, [150, 120, 130]);
    }

    if (m.attachments?.length) {
      addWrapped(`${m.attachments.length} attached photo${m.attachments.length === 1 ? "" : "s"}`, 9, 12, [170, 150, 155]);
    }

    y += 10;
    doc.setDrawColor(245, 230, 235);
    ensureSpace(8);
    doc.line(margin, y, pageW - margin, y);
    y += 14;
  }

  // Footer page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(180, 160, 170);
    doc.text(`${i} / ${pageCount}`, pageW - margin, pageH - 24, { align: "right" });
    doc.text("CareFlow · Memories", margin, pageH - 24);
  }

  doc.save(`memories-${format(new Date(), "yyyy-MM-dd")}.pdf`);
}