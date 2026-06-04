/**
 * Last-write-wins merge helper for calendar realtime updates.
 *
 * Rule: when a realtime payload arrives, compare `remote.updated_at` with
 * the local row's `updatedAt`. The newer one wins. If local has an in-flight
 * optimistic edit (its `updatedAt` is newer than what came back), keep local.
 */
export interface HasUpdatedAt { id: string; updatedAt?: string }

/** Return the row that should be kept after merging. */
export function lww<T extends HasUpdatedAt>(local: T | undefined, remote: T): T {
  if (!local) return remote;
  const lt = local.updatedAt ? Date.parse(local.updatedAt) : 0;
  const rt = remote.updatedAt ? Date.parse(remote.updatedAt) : 0;
  return rt >= lt ? remote : local;
}

/** Stamp an optimistic patch with a fresh local timestamp. */
export function stampNow<T extends object>(patch: T): T & { updatedAt: string } {
  return { ...patch, updatedAt: new Date().toISOString() };
}