import { extractBacklinks, listNotes, type Note } from "@/lib/notes";

const STOPWORDS = new Set([
  "the","a","an","and","or","but","of","in","on","at","to","for","with","by",
  "is","are","was","were","be","been","being","it","its","this","that","these",
  "those","i","you","he","she","we","they","my","your","our","their","me","him",
  "her","us","them","as","if","then","than","so","not","no","yes","do","does",
  "did","have","has","had","will","would","could","should","can","may","might",
  "from","into","about","over","under","up","down","out","just","like","also",
  "any","all","some","more","most","much","many","one","two","new","get","got",
  "im","ive","dont","didnt","cant","wont","theres","theyre","youre","what","when",
  "where","why","how","who","which","there","here","very","really","still",
]);

function tokens(s: string): string[] {
  return (s || "")
    .toLowerCase()
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\[\[[^\]]+\]\]/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length >= 4 && !STOPWORDS.has(w));
}

function topTerms(s: string, max = 40): Set<string> {
  const counts = new Map<string, number>();
  for (const t of tokens(s)) counts.set(t, (counts.get(t) ?? 0) + 1);
  return new Set(
    Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, max)
      .map(([t]) => t),
  );
}

export type NoteSuggestion = {
  note: Note;
  score: number;
  reasons: string[];
};

/**
 * Heuristic "AI-based" related-notes ranking that combines:
 *  - shared tags (strong signal)
 *  - shared outgoing links / mutual backlinks
 *  - content similarity via top-term Jaccard overlap
 *  - small recency boost
 * Runs fully client-side over the user's notes.
 */
export async function suggestRelatedNotes(
  target: Note,
  opts: { limit?: number; exclude?: Set<string> } = {},
): Promise<NoteSuggestion[]> {
  const limit = opts.limit ?? 5;
  const all = await listNotes();
  const exclude = opts.exclude ?? new Set<string>();

  const targetTags = new Set((target.tags ?? []).map(t => t.toLowerCase()));
  const targetLinks = new Set(extractBacklinks(target.body || "").map(s => s.toLowerCase()));
  const targetTitle = (target.kind === "daily" && target.date ? target.date : target.title || "").toLowerCase();
  const targetTerms = topTerms(`${target.title} ${target.body}`);
  const now = Date.now();

  const scored: NoteSuggestion[] = [];

  for (const n of all) {
    if (n.id === target.id || exclude.has(n.id)) continue;

    const reasons: string[] = [];
    let score = 0;

    // Shared tags
    const nTags = (n.tags ?? []).map(t => t.toLowerCase());
    const sharedTags = nTags.filter(t => targetTags.has(t));
    if (sharedTags.length) {
      score += sharedTags.length * 3;
      reasons.push(`${sharedTags.length} shared tag${sharedTags.length > 1 ? "s" : ""}`);
    }

    // Shared outgoing links
    const nLinks = extractBacklinks(n.body || "").map(s => s.toLowerCase());
    const sharedLinks = nLinks.filter(l => targetLinks.has(l));
    if (sharedLinks.length) {
      score += sharedLinks.length * 2;
      reasons.push(`${sharedLinks.length} shared link${sharedLinks.length > 1 ? "s" : ""}`);
    }

    // Mutual backlinks (this note links to target, or target links to this note)
    const nTitle = (n.kind === "daily" && n.date ? n.date : n.title || "").toLowerCase();
    if (nTitle && targetLinks.has(nTitle)) {
      score += 4;
      reasons.push("linked from this note");
    }
    if (targetTitle && nLinks.includes(targetTitle)) {
      score += 4;
      reasons.push("links back here");
    }

    // Content similarity (Jaccard on top terms)
    const nTerms = topTerms(`${n.title} ${n.body}`);
    if (targetTerms.size && nTerms.size) {
      let inter = 0;
      for (const t of nTerms) if (targetTerms.has(t)) inter++;
      const union = targetTerms.size + nTerms.size - inter;
      const jacc = union ? inter / union : 0;
      if (jacc > 0.05) {
        score += jacc * 10;
        if (inter >= 3) reasons.push(`${inter} similar terms`);
      }
    }

    // Same project
    if (target.projectId && n.projectId === target.projectId) {
      score += 1.5;
      reasons.push("same project");
    }

    // Tiny recency boost (within ~30 days)
    const ageDays = (now - new Date(n.updatedAt).getTime()) / 86_400_000;
    if (ageDays < 30) score += Math.max(0, (30 - ageDays) / 60);

    if (score >= 1.5 && reasons.length) {
      scored.push({ note: n, score, reasons: reasons.slice(0, 2) });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}