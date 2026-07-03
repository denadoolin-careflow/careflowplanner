/**
 * Lightweight, offline entity detection for the note editor.
 * Feeds the interactive Intelligence rail (tasks, links, dates,
 * mentions, wikilinks, files, urls) without interrupting writing.
 */

export interface DetectedTask {
  /** Zero-based line index in the source body. */
  line: number;
  /** Full raw line text (including the "- [ ]" prefix). */
  raw: string;
  /** Text after the checkbox prefix. */
  text: string;
  done: boolean;
}

export interface DetectedLink {
  kind: "wiki" | "mention" | "tag" | "url";
  value: string;
  /** Character index into the body. */
  index: number;
}

export interface DetectedDate {
  raw: string;
  iso: string | null;
  index: number;
}

export interface NoteEntities {
  tasks: DetectedTask[];
  links: DetectedLink[];
  dates: DetectedDate[];
  urls: string[];
  wikilinks: string[];
  mentions: string[];
  tags: string[];
}

const DATE_RE =
  /\b(?:today|tomorrow|yesterday|mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?|jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s?\d{0,2}(?:st|nd|rd|th)?(?:,?\s?\d{2,4})?\b/gi;

const ISO_DATE_RE = /\b(\d{4}-\d{2}-\d{2})\b/g;
const URL_RE = /\bhttps?:\/\/[^\s<>)]+/gi;
const WIKI_RE = /\[\[([^\]]+)\]\]/g;
const MENTION_RE = /(^|[\s(])@([a-z0-9_][a-z0-9 _-]{1,40}[a-z0-9])/gi;
const TAG_RE = /(^|[\s(])#([a-z0-9_-]{2,40})\b/gi;
const TASK_LINE_RE = /^\s*[-*]\s*\[( |x|X)\]\s+(.*)$/;

export function detectEntities(body: string): NoteEntities {
  const src = body ?? "";
  const tasks: DetectedTask[] = [];
  const lines = src.split(/\r?\n/);
  lines.forEach((raw, i) => {
    const m = raw.match(TASK_LINE_RE);
    if (m) tasks.push({ line: i, raw, text: m[2].trim(), done: m[1].toLowerCase() === "x" });
  });

  const links: DetectedLink[] = [];
  const wikilinks: string[] = [];
  const mentions: string[] = [];
  const tags: string[] = [];
  const urls: string[] = [];

  let m: RegExpExecArray | null;
  while ((m = WIKI_RE.exec(src))) {
    const v = m[1].trim();
    links.push({ kind: "wiki", value: v, index: m.index });
    if (!wikilinks.includes(v)) wikilinks.push(v);
  }
  while ((m = MENTION_RE.exec(src))) {
    const v = m[2].trim();
    links.push({ kind: "mention", value: v, index: m.index + m[1].length });
    if (!mentions.includes(v)) mentions.push(v);
  }
  while ((m = TAG_RE.exec(src))) {
    const v = m[2].trim();
    links.push({ kind: "tag", value: v, index: m.index + m[1].length });
    if (!tags.includes(v)) tags.push(v);
  }
  while ((m = URL_RE.exec(src))) {
    const v = m[0].replace(/[),.;:!?]+$/, "");
    links.push({ kind: "url", value: v, index: m.index });
    if (!urls.includes(v)) urls.push(v);
  }

  const dates: DetectedDate[] = [];
  while ((m = ISO_DATE_RE.exec(src))) {
    dates.push({ raw: m[1], iso: m[1], index: m.index });
  }
  while ((m = DATE_RE.exec(src))) {
    dates.push({ raw: m[0], iso: null, index: m.index });
  }

  return { tasks, links, dates, urls, wikilinks, mentions, tags };
}

/**
 * Toggle the checkbox on a task line in the given body and return the new body.
 * `line` is the zero-based line index reported by detectEntities.
 */
export function toggleTaskLine(body: string, line: number): string {
  const lines = body.split(/\r?\n/);
  const raw = lines[line];
  if (!raw) return body;
  const m = raw.match(TASK_LINE_RE);
  if (!m) return body;
  const next = m[1].toLowerCase() === "x"
    ? raw.replace(/\[[xX]\]/, "[ ]")
    : raw.replace(/\[ \]/, "[x]");
  lines[line] = next;
  return lines.join("\n");
}

/** Replace a task line's text (keeps the checkbox state). */
export function editTaskLine(body: string, line: number, nextText: string): string {
  const lines = body.split(/\r?\n/);
  const raw = lines[line];
  if (!raw) return body;
  const m = raw.match(/^(\s*[-*]\s*\[[ xX]\]\s+)/);
  if (!m) return body;
  lines[line] = `${m[1]}${nextText.trim()}`;
  return lines.join("\n");
}

/** Delete a task line entirely. */
export function deleteTaskLine(body: string, line: number): string {
  const lines = body.split(/\r?\n/);
  if (line < 0 || line >= lines.length) return body;
  lines.splice(line, 1);
  return lines.join("\n");
}