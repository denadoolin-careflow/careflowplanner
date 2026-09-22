import { supabase } from "@/integrations/supabase/client";

export interface GmailStatus {
  connected: boolean;
  email: string | null;
  lastSyncedAt: string | null;
  autoSync: boolean;
}

async function call<T>(fn: string, body?: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke(fn, body ? { body } : {});
  if (error) throw new Error(error.message);
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as T;
}

export const gmailStatus = () => call<GmailStatus>("gmail-status");

export const gmailConnect = async (returnUrl: string) =>
  (await call<{ url: string }>("gmail-connect", { return_url: returnUrl })).url;

export const gmailExchange = (code: string) =>
  call<{ connected: boolean; email: string | null }>("gmail-exchange", { code });

export const gmailDisconnect = () => call<{ connected: boolean }>("gmail-disconnect");

export const gmailSyncStarred = () =>
  call<{ connected: boolean; imported?: number; scanned?: number }>("gmail-sync-starred");

const COOLDOWN_KEY = "careflow.gmail.lastSync";
const COOLDOWN_MS = 10 * 60 * 1000;

/** Background sync with a 10-minute cooldown. Returns imported count, or null when skipped. */
export async function gmailBackgroundSync(): Promise<number | null> {
  try {
    const last = Number(localStorage.getItem(COOLDOWN_KEY) ?? 0);
    if (Date.now() - last < COOLDOWN_MS) return null;
    localStorage.setItem(COOLDOWN_KEY, String(Date.now()));
    const r = await gmailSyncStarred();
    return r.connected ? (r.imported ?? 0) : null;
  } catch {
    return null;
  }
}

export function clearGmailCooldown() {
  try { localStorage.removeItem(COOLDOWN_KEY); } catch { /* ignore */ }
}
