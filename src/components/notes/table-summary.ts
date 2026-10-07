/**
 * Table summary rows. A table whose LAST row starts with "Total", "Average"
 * or "Count" is treated as a summary row: every other column is recalculated
 * live from the numbers above it and written back as plain, formatted text,
 * so the result round-trips through the note's markdown/HTML with no schema.
 */
import { Extension, type Editor } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { Node as PMNode } from "@tiptap/pm/model";

export const SUMMARY_LABELS = ["Total", "Average", "Count"] as const;
type SummaryLabel = typeof SUMMARY_LABELS[number];

const labelOf = (row: PMNode | null | undefined): SummaryLabel | null => {
  if (!row || row.childCount === 0) return null;
  const t = row.child(0).textContent.trim().toLowerCase();
  return SUMMARY_LABELS.find(l => l.toLowerCase() === t) ?? null;
};

type Parsed = { value: number; prefix: string; suffix: string; decimals: number; grouped: boolean };
const NUM_RE = /^([-+]?)\s*([$€£¥]?)\s*([-+]?)(\d[\d,]*(?:\.\d+)?|\.\d+)\s*(%?)$/;
export function parseCellNumber(raw: string): Parsed | null {
  const m = raw.trim().match(NUM_RE);
  if (!m) return null;
  const neg = m[1] === "-" || m[3] === "-";
  const digits = m[4].replace(/,/g, "");
  const value = Number(digits) * (neg ? -1 : 1);
  if (!Number.isFinite(value)) return null;
  return { value, prefix: m[2], suffix: m[5], decimals: (digits.split(".")[1] ?? "").length, grouped: m[4].includes(",") };
}

function formatResult(value: number, samples: Parsed[], label: SummaryLabel): string {
  if (label === "Count") return String(samples.length);
  const prefix = samples.find(s => s.prefix)?.prefix ?? "";
  const suffix = samples.find(s => s.suffix)?.suffix ?? "";
  let decimals = Math.max(0, ...samples.map(s => s.decimals));
  if (prefix) decimals = Math.max(decimals, 2);
  if (label === "Average" && decimals === 0 && !Number.isInteger(value)) decimals = 2;
  const grouped = !!prefix || samples.some(s => s.grouped) || Math.abs(value) >= 10000;
  const body = new Intl.NumberFormat("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals, useGrouping: grouped }).format(Math.abs(value));
  return `${value < 0 ? "-" : ""}${prefix}${body}${suffix}`;
}

const key = new PluginKey("cfTableSummary");

export const TableSummary = Extension.create({
  name: "cfTableSummary",
  addProseMirrorPlugins() {
    return [new Plugin({
      key,
      appendTransaction: (trs, _old, state) => {
        if (!trs.some(t => t.docChanged) || trs.some(t => t.getMeta(key))) return null;
        const edits: { from: number; to: number; text: string; cellType: PMNode["type"] }[] = [];
        state.doc.descendants((node, pos) => {
          if (node.type.name !== "table") return true;
          const n = node.childCount;
          const last = node.child(n - 1);
          const label = labelOf(last);
          if (!label || n < 2) return false;
          const body: PMNode[] = [];
          for (let r = 0; r < n - 1; r++) {
            const row = node.child(r);
            let allHeader = true;
            row.forEach(c => { if (c.type.name !== "tableHeader") allHeader = false; });
            if (!allHeader) body.push(row);
          }
          // Position of the summary row's first cell.
          let rowPos = pos + 1;
          for (let r = 0; r < n - 1; r++) rowPos += node.child(r).nodeSize;
          let cellPos = rowPos + 1;
          last.forEach((cell, _o, ci) => {
            if (ci > 0) {
              const samples = body.map(r => (ci < r.childCount ? parseCellNumber(r.child(ci).textContent) : null)).filter(Boolean) as Parsed[];
              if (samples.length) {
                const sum = samples.reduce((a, s) => a + s.value, 0);
                const value = label === "Average" ? sum / samples.length : sum;
                const text = formatResult(value, samples, label);
                if (cell.textContent !== text) edits.push({ from: cellPos, to: cellPos + cell.nodeSize, text, cellType: cell.type });
              }
            }
            cellPos += cell.nodeSize;
          });
          return false;
        });
        if (!edits.length) return null;
        const tr = state.tr;
        for (const e of edits.reverse()) {
          const old = state.doc.nodeAt(e.from);
          const para = state.schema.nodes.paragraph.create(null, state.schema.text(e.text));
          tr.replaceWith(e.from, e.to, e.cellType.create(old?.attrs ?? null, para));
        }
        tr.setMeta(key, true).setMeta("addToHistory", false);
        return tr;
      },
    })];
  },
});

/** Cycle the current table's summary row: none → Total → Average → Count → none. */
export function cycleTableSummary(editor: Editor): string | null {
  const { state } = editor;
  const { $from } = state.selection;
  let d = $from.depth;
  while (d > 0 && $from.node(d).type.name !== "table") d--;
  if (d === 0) return null;
  const table = $from.node(d);
  const tablePos = $from.before(d);
  const last = table.child(table.childCount - 1);
  const current = labelOf(last);
  const lastPos = tablePos + table.nodeSize - 1 - last.nodeSize;
  const { schema } = state;
  const tr = state.tr;
  if (current) {
    const next = SUMMARY_LABELS[SUMMARY_LABELS.indexOf(current) + 1];
    if (!next) { tr.delete(lastPos, lastPos + last.nodeSize); editor.view.dispatch(tr); return null; }
    const first = last.child(0);
    tr.replaceWith(lastPos + 1, lastPos + 1 + first.nodeSize, first.type.create(first.attrs, schema.nodes.paragraph.create(null, schema.text(next))));
    editor.view.dispatch(tr);
    return next;
  }
  const cols = Math.max(1, last.childCount);
  const cells = Array.from({ length: cols }, (_, i) =>
    schema.nodes.tableCell.create(null, schema.nodes.paragraph.create(null, i === 0 ? schema.text("Total") : null)));
  tr.insert(tablePos + table.nodeSize - 1, schema.nodes.tableRow.create(null, cells));
  editor.view.dispatch(tr);
  return "Total";
}
