/**
 * Craft-style block addressing for markdown note bodies.
 *
 * A block ID is stored as a trailing ` ^b-xxxxxx` marker on the block's last
 * line (Obsidian-style). IDs are only added when a block is first linked.
 */
import { getNote, updateNote } from "@/lib/notes";

export const BLOCK_MARKER_RE = /\s\^(b-[a-z0-9]{6})\s*$/;
export const BLOCK_MARKER_GLOBAL_RE = /[ \t]\^b-[a-z0-9]{6}(?=\s*$)/gm;

export function newBlockId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = "b-";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

/** Remove block markers so other markdown viewers stay clean. */
export function stripBlockMarkers(md: string): string {
  return (md || "").replace(BLOCK_MARKER_GLOBAL_RE, "");
}

export type BlockType = "heading" | "paragraph" | "listItem" | "toggle";
export interface NoteBlock {
  id: string | null;
  type: BlockType;
  level: number;
  text: string;
  /** Inclusive line range of the block itself. */
  start: number;
  end: number;
}

function cleanText(line: string): string {
  return line
    .replace(BLOCK_MARKER_RE, "")
    .replace(/^#{1,6}\s+/, "")
    .replace(/^\s*(?:[-*+]|\d+\.)\s+(\[[ xX]\]\s+)?/, "")
    .replace(/<[^>]+>/g, "")
    .trim();
}

/** Split a markdown body into addressable blocks (headings, paragraphs, list items). */
export function parseBlocks(body: string): NoteBlock[] {
  const lines = (body || "").split("\n");
  const out: NoteBlock[] = [];
  let inFence = false;
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^\s*```/.test(line)) { inFence = !inFence; i++; continue; }
    if (!inFence && /^\s*<details\b/.test(line)) {
      const idm = /data-block-id="(b-[a-z0-9]{6})"/.exec(line);
      const sm = /<summary>([\s\S]*?)<\/summary>/.exec(line);
      out.push({ id: idm?.[1] ?? null, type: "toggle", level: 0, text: cleanText(sm?.[1] ?? ""), start: i, end: i });
      i++; continue;
    }
    if (inFence || !line.trim() || /^\s*</.test(line) || /^\s*>/.test(line) || /^\s*\|/.test(line)) { i++; continue; }
    const h = /^(#{1,6})\s+/.exec(line);
    if (h) {
      const m = BLOCK_MARKER_RE.exec(line);
      out.push({ id: m?.[1] ?? null, type: "heading", level: h[1].length, text: cleanText(line), start: i, end: i });
      i++; continue;
    }
    if (/^\s*(?:[-*+]|\d+\.)\s+/.test(line)) {
      const m = BLOCK_MARKER_RE.exec(line);
      out.push({ id: m?.[1] ?? null, type: "listItem", level: 0, text: cleanText(line), start: i, end: i });
      i++; continue;
    }
    // Paragraph: consecutive plain lines.
    let j = i;
    while (j + 1 < lines.length && lines[j + 1].trim() && !/^(#{1,6}\s|\s*(?:[-*+]|\d+\.)\s|\s*<|\s*```)/.test(lines[j + 1])) j++;
    const m = BLOCK_MARKER_RE.exec(lines[j]);
    out.push({ id: m?.[1] ?? null, type: "paragraph", level: 0, text: cleanText(lines.slice(i, j + 1).join(" ")), start: i, end: j });
    i = j + 1;
  }
  return out.filter(b => b.text.length > 0);
}

/** Line range covered by a block; headings cover their whole section. */
export function blockRange(body: string, blockId: string): { start: number; end: number; block: NoteBlock } | null {
  const blocks = parseBlocks(body);
  const idx = blocks.findIndex(b => b.id === blockId);
  if (idx < 0) return null;
  const block = blocks[idx];
  const lines = body.split("\n");
  if (block.type === "listItem") {
    const indent = (lines[block.start].match(/^\s*/)?.[0].length) ?? 0;
    let end = block.end;
    while (end + 1 < lines.length && lines[end + 1].trim() && ((lines[end + 1].match(/^\s*/)?.[0].length) ?? 0) > indent) end++;
    return { start: block.start, end, block };
  }
  if (block.type !== "heading") return { start: block.start, end: block.end, block };
  let end = lines.length - 1;
  for (let k = idx + 1; k < blocks.length; k++) {
    if (blocks[k].type === "heading" && blocks[k].level <= block.level) { end = blocks[k].start - 1; break; }
  }
  while (end > block.start && !lines[end].trim()) end--;
  return { start: block.start, end, block };
}

export function extractBlockMarkdown(body: string, blockId: string): string | null {
  const r = blockRange(body, blockId);
  if (!r) return null;
  return body.split("\n").slice(r.start, r.end + 1).join("\n");
}

export function replaceBlockMarkdown(body: string, blockId: string, next: string): string | null {
  const r = blockRange(body, blockId);
  if (!r) return null;
  const lines = body.split("\n");
  lines.splice(r.start, r.end - r.start + 1, ...next.split("\n"));
  return lines.join("\n");
}

/** Make sure the block at `start` has an ID, writing it back to the note. */
export async function ensureBlockId(noteId: string, block: NoteBlock): Promise<string> {
  if (block.id) return block.id;
  const note = await getNote(noteId);
  if (!note) throw new Error("Note not found");
  const lines = note.body.split("\n");
  if (block.type === "toggle") {
    const line = lines[block.start] ?? "";
    const found = /data-block-id="(b-[a-z0-9]{6})"/.exec(line);
    if (found) return found[1];
    const id = newBlockId();
    lines[block.start] = line.replace(/<details\b/, `<details data-block-id="${id}"`);
    await updateNote(noteId, { body: lines.join("\n") });
    notifyNoteBodyChanged(noteId);
    return id;
  }
  const existing = BLOCK_MARKER_RE.exec(lines[block.end] ?? "");
  if (existing) return existing[1];
  const id = newBlockId();
  lines[block.end] = `${(lines[block.end] ?? "").replace(/\s+$/, "")} ^${id}`;
  await updateNote(noteId, { body: lines.join("\n") });
  notifyNoteBodyChanged(noteId);
  return id;
}

export const NOTE_BODY_EVENT = "careflow:note-body-changed";
export function notifyNoteBodyChanged(noteId: string) {
  try { window.dispatchEvent(new CustomEvent(NOTE_BODY_EVENT, { detail: { noteId } })); } catch { /* ignore */ }
}

export function blockUrl(noteId: string, blockId: string): string {
  return `${window.location.origin}/notes/${noteId}#${blockId}`;
}

export interface BlockHost { id: string; title: string; kind: "embed" | "link" }
/** Block IDs from this note that other notes embed or link to via chips. */
export function findEmbedsIn(hostBodies: { id: string; title: string; body: string }[], sourceNoteId: string) {
  const map = new Map<string, BlockHost[]>();
  const tagRe = /<(div|span)\b[^>]*>/g;
  for (const n of hostBodies) {
    if (n.id === sourceNoteId) continue;
    for (const m of n.body.matchAll(tagRe)) {
      const tag = m[0];
      if (!tag.includes(`data-note-id="${sourceNoteId}"`)) continue;
      const kind = tag.includes("data-block-embed") ? "embed" : tag.includes("data-block-ref") ? "link" : null;
      const bid = /data-block-ref-id="(b-[a-z0-9]{6})"/.exec(tag)?.[1];
      if (!kind || !bid) continue;
      const arr = map.get(bid) ?? [];
      if (!arr.some(x => x.id === n.id && x.kind === kind)) arr.push({ id: n.id, title: n.title, kind });
      map.set(bid, arr);
    }
  }
  return map;
}
