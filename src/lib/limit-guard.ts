import { supabase } from "@/integrations/supabase/client";
import { getPaddleEnvironment } from "@/lib/paddle";
import { PLAN_HARD_LIMITS } from "@/lib/entitlements";
import { triggerUpgradePrompt } from "@/lib/ai-invoke";
import type { Plan } from "@/hooks/useSubscription";

const PRICE_TO_PLAN: Record<string, Plan> = {
  pro_monthly: "pro",
  pro_yearly: "pro",
  family_monthly: "family",
  family_yearly: "family",
};

/** Resolve the current user's plan with a single query pair. */
export async function resolvePlan(): Promise<Plan> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "free";
  const env = getPaddleEnvironment();
  const [{ data: lifetime }, { data: sub }] = await Promise.all([
    supabase.from("lifetime_purchases").select("id")
      .eq("user_id", user.id).eq("environment", env).limit(1).maybeSingle(),
    supabase.from("billing_subscriptions").select("price_id,status,current_period_end")
      .eq("user_id", user.id).eq("environment", env)
      .order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (lifetime) return "lifetime";
  if (!sub) return "free";
  const end = sub.current_period_end ? new Date(sub.current_period_end as string).getTime() : null;
  const active =
    (["active", "trialing", "past_due"].includes(sub.status as string) && (end === null || end > Date.now())) ||
    (sub.status === "canceled" && end !== null && end > Date.now());
  if (!active) return "free";
  return PRICE_TO_PLAN[sub.price_id as string] ?? "free";
}

type LimitKey = "habits" | "routines" | "journalEntriesPerWeek";

const COPY: Record<LimitKey, { title: string; msg: (limit: number) => string }> = {
  habits: {
    title: "Habit limit reached",
    msg: (n) => `Free accounts can track ${n} habits. Upgrade to Pro for unlimited habits.`,
  },
  routines: {
    title: "Routine limit reached",
    msg: (n) => `Free accounts can build ${n} routine. Upgrade to Pro for unlimited routines.`,
  },
  journalEntriesPerWeek: {
    title: "Journal limit reached",
    msg: (n) => `Free accounts can save ${n} journal entries per week. Upgrade to Pro for unlimited journaling.`,
  },
};

/**
 * Returns true if the user is allowed to create another item; otherwise
 * dispatches the upgrade prompt and returns false. Callers should `if (!ok) return;`.
 */
export async function ensureWithinLimit(key: LimitKey, currentCount: number): Promise<boolean> {
  const plan = await resolvePlan();
  const limit = (PLAN_HARD_LIMITS[plan] as any)[key] as number;
  if (!Number.isFinite(limit)) return true; // unlimited
  if (currentCount < limit) return true;
  const copy = COPY[key];
  triggerUpgradePrompt({ title: copy.title, message: copy.msg(limit) });
  return false;
}