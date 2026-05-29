import { supabase } from "@/integrations/supabase/client";

/**
 * Wrapper for invoking AI edge functions. We call the function URL with
 * fetch directly (instead of supabase.functions.invoke) so we can detect
 * 402 quota responses without triggering supabase-js's automatic
 * `console.error("Edge function returned 402: ...")` log — that log is
 * what Lovable's runtime-error detector flags as a "blank screen" crash
 * even when callers handle the error gracefully.
 */
export async function aiInvoke<T = any>(
  functionName: string,
  options?: Parameters<typeof supabase.functions.invoke>[1]
): Promise<{ data: T | null; error: any; quotaExceeded?: boolean }> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}`;
    const body = (options as any)?.body;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      ...((options as any)?.headers ?? {}),
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(url, {
      method: (options as any)?.method ?? "POST",
      headers,
      body: body == null ? undefined : typeof body === "string" ? body : JSON.stringify(body),
    });

    if (res.status === 402) {
      const parsed = await res.clone().json().catch(() => ({} as any));
      if (parsed?.error === "ai_quota_exceeded") {
        window.dispatchEvent(new CustomEvent("careflow:upgrade", {
          detail: {
            title: "You've reached your AI limit",
            message: parsed.message ?? "Upgrade for more AI actions this month.",
          },
        }));
        return { data: null, error: parsed, quotaExceeded: true };
      }
    }

    if (!res.ok) {
      const errBody = await res.clone().json().catch(() => ({ message: res.statusText } as any));
      return { data: null, error: errBody };
    }

    const data = (await res.json().catch(() => null)) as T | null;
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e };
  }
}

/**
 * Programmatically trigger the upgrade prompt (e.g. when a Pro-only feature
 * is tapped on a free account).
 */
export function triggerUpgradePrompt(opts?: { title?: string; message?: string }) {
  window.dispatchEvent(new CustomEvent("careflow:upgrade", { detail: opts ?? {} }));
}