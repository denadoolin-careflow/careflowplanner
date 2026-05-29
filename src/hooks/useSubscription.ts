import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getPaddleEnvironment } from "@/lib/paddle";

export type Plan = "free" | "pro" | "family" | "lifetime";

export interface SubscriptionInfo {
  plan: Plan;
  isActive: boolean;
  status: string | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  loading: boolean;
}

const PRICE_TO_PLAN: Record<string, Plan> = {
  pro_monthly: "pro",
  pro_yearly: "pro",
  family_monthly: "family",
  family_yearly: "family",
};

export function useSubscription(userId: string | null | undefined): SubscriptionInfo {
  const [info, setInfo] = useState<SubscriptionInfo>({
    plan: "free", isActive: false, status: null, cancelAtPeriodEnd: false, currentPeriodEnd: null, loading: true,
  });

  useEffect(() => {
    if (!userId) {
      setInfo({ plan: "free", isActive: false, status: null, cancelAtPeriodEnd: false, currentPeriodEnd: null, loading: false });
      return;
    }

    const env = getPaddleEnvironment();

    async function load() {
      const [{ data: sub }, { data: lifetime }] = await Promise.all([
        supabase.from("billing_subscriptions").select("*")
          .eq("user_id", userId!).eq("environment", env)
          .order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("lifetime_purchases").select("*")
          .eq("user_id", userId!).eq("environment", env).limit(1).maybeSingle(),
      ]);

      if (lifetime) {
        setInfo({ plan: "lifetime", isActive: true, status: "active", cancelAtPeriodEnd: false, currentPeriodEnd: null, loading: false });
        return;
      }

      if (!sub) {
        setInfo({ plan: "free", isActive: false, status: null, cancelAtPeriodEnd: false, currentPeriodEnd: null, loading: false });
        return;
      }

      const periodEnd = sub.current_period_end ? new Date(sub.current_period_end as string).getTime() : null;
      const now = Date.now();
      const isActive =
        (["active", "trialing", "past_due"].includes(sub.status as string) && (periodEnd === null || periodEnd > now)) ||
        (sub.status === "canceled" && periodEnd !== null && periodEnd > now);

      setInfo({
        plan: PRICE_TO_PLAN[sub.price_id as string] ?? "free",
        isActive,
        status: sub.status as string,
        cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
        currentPeriodEnd: sub.current_period_end as string | null,
        loading: false,
      });
    }

    load();

    const channel = supabase.channel(`billing-sub-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "billing_subscriptions", filter: `user_id=eq.${userId}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "lifetime_purchases", filter: `user_id=eq.${userId}` }, load)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  return info;
}