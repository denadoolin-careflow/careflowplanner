/** Tiny localStorage-backed set for "cleared" notification task IDs. */
const KEY = "careflow:dismissed-notifications";

function readSet(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(arr);
  } catch { return new Set(); }
}

function writeSet(s: Set<string>) {
  try { localStorage.setItem(KEY, JSON.stringify([...s])); } catch {}
  window.dispatchEvent(new Event("careflow:dismissed-notifications"));
}

export function getDismissed(): Set<string> { return readSet(); }
export function dismiss(id: string) { const s = readSet(); s.add(id); writeSet(s); }
export function undismiss(id: string) { const s = readSet(); s.delete(id); writeSet(s); }
export function clearAllDismissed() { writeSet(new Set()); }
export function dismissMany(ids: string[]) {
  const s = readSet(); ids.forEach(i => s.add(i)); writeSet(s);
}
export function undismissMany(ids: string[]) {
  const s = readSet(); ids.forEach(i => s.delete(i)); writeSet(s);
}

export function onDismissedChange(cb: () => void) {
  const h = () => cb();
  window.addEventListener("careflow:dismissed-notifications", h);
  window.addEventListener("storage", h);
  return () => {
    window.removeEventListener("careflow:dismissed-notifications", h);
    window.removeEventListener("storage", h);
  };
}