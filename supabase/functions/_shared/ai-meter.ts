// Shared AI metering helper. Used by AI edge functions to enforce per-plan
// monthly weighted-call limits.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export type Plan = "free" | "pro" | "family" | "lifetime";

export const PLAN_AI_LIMITS: Record<Plan, number> = {
  free: 10,
  pro: 300,
  family: 800,
  lifetime: 300,
};

// Weights — keep in sync with src/lib/entitlements.ts
export const WEIGHTS = {
  light: 1,    // simple suggestion / short text
  medium: 3,   // voice capture, mental load, journal recap chunk
  heavy: 5,    // weekly review, planner, multi-step plans
} as const;

function ymKey(d = new Date()): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function getServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

async function resolvePlan(userId: string): Promise<Plan> {
  const svc = getServiceClient();
  // Lifetime first
  const [{ data: lifetime }, { data: sub }] = await Promise.all([
    svc.from("lifetime_purchases").select("price_id").eq("user_id", userId).limit(1).maybeSingle(),
    svc.from("billing_subscriptions").select("price_id,status,current_period_end")
      .eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (lifetime) return "lifetime";
  if (!sub) return "free";
  const end = (sub as any).current_period_end ? new Date((sub as any).current_period_end).getTime() : null;
  const active = ["active", "trialing", "past_due"].includes((sub as any).status) && (end === null || end > Date.now());
  if (!active) return "free";
  const pid = (sub as any).price_id as string;
  if (pid?.startsWith("family")) return "family";
  if (pid?.startsWith("pro")) return "pro";
  return "free";
}

export type MeterResult =
  | { ok: true; plan: Plan; used: number; limit: number }
  | { ok: false; plan: Plan; used: number; limit: number; reason: "limit_reached" };

/**
 * Check the user's monthly AI usage and, if under the limit, increment it
 * atomically by `weight`. Returns ok:false with reason "limit_reached" if the
 * call would exceed the user's plan limit.
 */
export async function checkAndIncrementAi(
  userId: string,
  weight: number = WEIGHTS.light
): Promise<MeterResult> {
  const svc = getServiceClient();
  const plan = await resolvePlan(userId);
  const limit = PLAN_AI_LIMITS[plan];
  const month = ymKey();

  // Read current usage
  const { data: row } = await svc.from("ai_usage")
    .select("weighted_calls").eq("user_id", userId).eq("year_month", month).maybeSingle();
  const current = (row as any)?.weighted_calls ?? 0;
  if (current + weight > limit) {
    return { ok: false, plan, used: current, limit, reason: "limit_reached" };
  }

  const { data: newTotal } = await svc.rpc("increment_ai_usage", {
    p_user_id: userId,
    p_year_month: month,
    p_weight: weight,
  });
  return { ok: true, plan, used: (newTotal as number) ?? current + weight, limit };
}

export function quotaExceededResponse(meter: Extract<MeterResult, { ok: false }>, corsHeaders: Record<string, string>) {
  return new Response(
    JSON.stringify({
      error: "ai_quota_exceeded",
      message: `You've used all ${meter.limit} AI actions this month on the ${meter.plan} plan. Upgrade for more, or wait until next month.`,
      plan: meter.plan,
      used: meter.used,
      limit: meter.limit,
    }),
    { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}