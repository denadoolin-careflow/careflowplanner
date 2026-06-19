// Local cache of AI-generated PDF summaries, keyed by storage path.
// Used by AttachmentsField for inline display and by NotesFiles for search.

export type PdfSummary = {
  summary: string;
  keyPoints: string[];
  text: string;
  updatedAt: string;
};

const KEY = "careflow:pdf-summaries:v1";

type Store = Record<string, PdfSummary>;

function read(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    return {};
  }
}

function write(s: Store) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* quota */ }
}

export function getPdfSummary(path: string): PdfSummary | null {
  return read()[path] ?? null;
}

export function setPdfSummary(path: string, value: Omit<PdfSummary, "updatedAt">) {
  const s = read();
  s[path] = { ...value, updatedAt: new Date().toISOString() };
  write(s);
  window.dispatchEvent(new CustomEvent("careflow:pdf-summary", { detail: { path } }));
}

export function getAllPdfSummaries(): Store {
  return read();
}

export function clearPdfSummary(path: string) {
  const s = read();
  delete s[path];
  write(s);
}