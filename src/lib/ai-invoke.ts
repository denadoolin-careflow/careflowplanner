import { supabase } from "@/integrations/supabase/client";

/**
 * Wrapper around supabase.functions.invoke for AI edge functions.
 * On a 402 ai_quota_exceeded response, dispatches a "careflow:upgrade"
 * window event so AppLayout can show the UpgradePrompt, and returns
 * { data: null, error, quotaExceeded: true }.
 */
export async function aiInvoke<T = any>(
  functionName: string,
  options?: Parameters<typeof supabase.functions.invoke>[1]
): Promise<{ data: T | null; error: any; quotaExceeded?: boolean }> {
  const { data, error } = await supabase.functions.invoke(functionName, options);

  if (error) {
    // FunctionsHttpError exposes the response on error.context
    try {
      const response = (error as any)?.context?.response as Response | undefined;
      if (response && response.status === 402) {
        const body = await response.clone().json().catch(() => ({}));
        if (body?.error === "ai_quota_exceeded") {
          window.dispatchEvent(new CustomEvent("careflow:upgrade", {
            detail: {
              title: "You've reached your AI limit",
              message: body.message ?? "Upgrade for more AI actions this month.",
            },
          }));
          return { data: null, error, quotaExceeded: true };
        }
      }
    } catch {
      // fall through
    }
  }

  return { data: data as T | null, error };
}

/**
 * Programmatically trigger the upgrade prompt (e.g. when a Pro-only feature
 * is tapped on a free account).
 */
export function triggerUpgradePrompt(opts?: { title?: string; message?: string }) {
  window.dispatchEvent(new CustomEvent("careflow:upgrade", { detail: opts ?? {} }));
}