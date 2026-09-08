/**
 * Local draft safety net for notes.
 *
 * Every keystroke that hasn't been confirmed by the server yet is mirrored to
 * localStorage. If the tab crashes, the network drops, or the page is
 * refreshed mid-save, the draft is still there on the next open and can be
 * restored.
 */

const PREFIX = "careflow:note-draft:v1:";
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 14; // keep drafts for two weeks

export type NoteDraft = {
  id: string;
  title?: string;
  body?: string;
  savedAt: number;
};

function key(id: string) {
  return `${PREFIX}${id}`;
}

/** Mirror pending content locally (called on every edit). */
export function saveDraft(id: string, patch: { title?: string; body?: string }): void {
  if (!id) return;
  try {
    const prev = loadDraft(id);
    const next: NoteDraft = {
      id,
      title: patch.title ?? prev?.title,
      body: patch.body ?? prev?.body,
      savedAt: Date.now(),
    };
    localStorage.setItem(key(id), JSON.stringify(next));
  } catch {
    /* storage full or unavailable — nothing we can do */
  }
}

/** Read a stored draft, if any (expired drafts are dropped). */
export function loadDraft(id: string): NoteDraft | null {
  if (!id) return null;
  try {
    const raw = localStorage.getItem(key(id));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as NoteDraft;
    if (!parsed?.savedAt || Date.now() - parsed.savedAt > MAX_AGE_MS) {
      clearDraft(id);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Drop the draft once the server has confirmed the save. */
export function clearDraft(id: string): void {
  if (!id) return;
  try { localStorage.removeItem(key(id)); } catch { /* ignore */ }
}

/** True when the draft holds content the loaded record doesn't have yet. */
export function draftDiffers(draft: NoteDraft | null, current: { title: string; body: string }): boolean {
  if (!draft) return false;
  const bodyDiffers = draft.body !== undefined && draft.body.trim() !== (current.body ?? "").trim();
  const titleDiffers = draft.title !== undefined && draft.title.trim() !== (current.title ?? "").trim();
  return bodyDiffers || titleDiffers;
}

/** Housekeeping: remove expired drafts across all notes. */
export function pruneDrafts(): void {
  try {
    const now = Date.now();
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (!k?.startsWith(PREFIX)) continue;
      try {
        const parsed = JSON.parse(localStorage.getItem(k) || "{}") as NoteDraft;
        if (!parsed?.savedAt || now - parsed.savedAt > MAX_AGE_MS) localStorage.removeItem(k);
      } catch {
        localStorage.removeItem(k);
      }
    }
  } catch {
    /* ignore */
  }
}
