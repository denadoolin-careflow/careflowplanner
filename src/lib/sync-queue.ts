/**
 * Offline-aware sync queue for calendar mutations.
 *
 * Goals
 *  - Optimistic updates: local state changes apply immediately; supabase calls
 *    are scheduled through this queue and resolved in the background.
 *  - Offline support: when the browser is offline (or the call fails with a
 *    network error), the op is persisted to localStorage and replayed once
 *    connectivity returns.
 *  - Conflict resolution: every queued update carries a `localTs` timestamp.
 *    Updates are sent with `updated_at = localTs` and gated by
 *    `.lt('updated_at', localTs)` so a newer change from another device wins.
 *    Realtime callers should also use `applyRemote()` in calendar-conflict.ts
 *    to keep local state consistent.
 */
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type SyncTable =
  | "tasks" | "appointments" | "meals" | "birthdays" | "holidays";

export type SyncOp =
  | { kind: "insert"; table: SyncTable; values: Record<string, any>; tempId?: string }
  | { kind: "update"; table: SyncTable; id: string; values: Record<string, any>; localTs: string }
  | { kind: "delete"; table: SyncTable; id: string };

interface QueuedOp {
  uid: string;          // unique queue entry id
  op: SyncOp;
  queuedAt: string;
  retries: number;
}

const KEY = "careflow.sync.queue.v1";
const MAX_RETRIES = 8;

type FlushListener = (status: { pending: number; online: boolean }) => void;
const listeners = new Set<FlushListener>();
let queue: QueuedOp[] = [];
let flushing = false;
let initialized = false;

/* ---------- persistence ---------- */
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    queue = raw ? JSON.parse(raw) : [];
  } catch { queue = []; }
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(queue)); } catch { /* quota */ }
}
function notify() {
  const status = { pending: queue.length, online: isOnline() };
  for (const l of listeners) { try { l(status); } catch { /* noop */ } }
}

/* ---------- public API ---------- */
export function isOnline(): boolean {
  return typeof navigator === "undefined" ? true : navigator.onLine !== false;
}

export function subscribeSync(fn: FlushListener): () => void {
  ensureInit();
  listeners.add(fn);
  fn({ pending: queue.length, online: isOnline() });
  return () => { listeners.delete(fn); };
}

export function pendingCount(): number { return queue.length; }

/**
 * Execute (or queue) a single sync op. The local UI should have already
 * applied an optimistic update. The returned promise resolves with the row
 * (for inserts) when possible — if the op had to be queued offline, it
 * resolves with `{ queued: true }` and `data` is null.
 */
export async function syncOp(op: SyncOp): Promise<{ data: any; queued: boolean }> {
  ensureInit();
  if (isOnline()) {
    try {
      const data = await execOp(op);
      return { data, queued: false };
    } catch (e: any) {
      if (isNetworkError(e)) {
        enqueue(op);
        return { data: null, queued: true };
      }
      // Non-network errors (RLS, validation, conflict-no-rows) — surface.
      throw e;
    }
  }
  enqueue(op);
  return { data: null, queued: true };
}

/** Force a flush attempt (e.g. after user taps "Retry sync"). */
export async function flushQueue(): Promise<void> {
  ensureInit();
  if (flushing || !isOnline() || queue.length === 0) return;
  flushing = true;
  notify();
  try {
    while (queue.length > 0 && isOnline()) {
      const entry = queue[0];
      try {
        await execOp(entry.op);
        queue.shift();
        save();
        notify();
      } catch (e: any) {
        if (isNetworkError(e)) break; // stop, try again later
        entry.retries += 1;
        if (entry.retries >= MAX_RETRIES) {
          // Give up on this op — pop it and log so the user can re-try by hand.
          console.warn("[sync-queue] dropping op after retries", entry, e);
          queue.shift();
          save();
          notify();
          toast.error("A queued calendar change couldn't be saved.");
        } else {
          // Move to back so other ops can flow.
          queue.shift();
          queue.push(entry);
          save();
          break;
        }
      }
    }
  } finally {
    flushing = false;
    notify();
  }
}

/* ---------- internals ---------- */
function enqueue(op: SyncOp) {
  queue.push({ uid: cryptoRandom(), op, queuedAt: new Date().toISOString(), retries: 0 });
  save();
  notify();
}

async function execOp(op: SyncOp): Promise<any> {
  if (op.kind === "insert") {
    const { data, error } = await supabase
      .from(op.table as any)
      .insert(op.values)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  if (op.kind === "update") {
    // LWW: stamp our timestamp and only overwrite rows whose remote
    // updated_at is strictly older. If another device wrote more recently,
    // 0 rows match and our change is intentionally discarded.
    const { data, error } = await supabase
      .from(op.table as any)
      .update({ ...op.values, updated_at: op.localTs })
      .eq("id", op.id)
      .lt("updated_at", op.localTs)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data;
  }
  // delete
  const { error } = await supabase.from(op.table as any).delete().eq("id", op.id);
  if (error) throw error;
  return null;
}

function isNetworkError(e: any): boolean {
  if (!e) return false;
  if (e.name === "TypeError" && /fetch|network/i.test(String(e.message))) return true;
  if (e.message && /Failed to fetch|NetworkError|Load failed/i.test(e.message)) return true;
  // supabase-js wraps fetch errors with code "FetchError" / no status
  if (typeof e.status === "undefined" && /network|fetch/i.test(String(e.message ?? ""))) return true;
  return false;
}

function cryptoRandom(): string {
  try {
    const a = new Uint8Array(8);
    crypto.getRandomValues(a);
    return Array.from(a).map(b => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return Math.random().toString(36).slice(2);
  }
}

function ensureInit() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  load();
  window.addEventListener("online", () => { notify(); void flushQueue(); });
  window.addEventListener("offline", () => notify());
  // Try to flush whatever was waiting from a previous session.
  if (isOnline()) setTimeout(() => { void flushQueue(); }, 250);
}