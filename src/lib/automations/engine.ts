import { supabase } from "@/integrations/supabase/client";
import type { AutomationRow, TriggerContext, TriggerType } from "./types";
import { moveToPantry, setStockStatus, addTag } from "./actions/groceryActions";

const PANTRY_TAG = "in stock";

/** Ensure the default "grocery checkoff → pantry" automation exists for this user. */
export async function ensureDefaultAutomations(userId: string) {
  const { data } = await supabase
    .from("automations")
    .select("id")
    .eq("user_id", userId)
    .limit(1);
  if (data && data.length > 0) return;
  await supabase.from("automations").insert({
    user_id: userId,
    name: "Grocery checkoff → Pantry",
    enabled: true,
    trigger_type: "grocery.item.completed",
    trigger_config: {},
    action_type: "grocery.moveToPantry",
    action_config: { tag: PANTRY_TAG, stockStatus: "in" },
    sort_order: 0,
  } as any);
}

/** Run all enabled automations matching the given trigger for the current user. */
export async function runAutomations(trigger: TriggerType, ctx: TriggerContext) {
  try {
    const { data: rules } = await supabase
      .from("automations")
      .select("*")
      .eq("user_id", ctx.userId)
      .eq("trigger_type", trigger)
      .eq("enabled", true);
    if (!rules || rules.length === 0) return;

    for (const rule of rules as unknown as AutomationRow[]) {
      await executeRule(rule, ctx);
    }
  } catch (err) {
    console.warn("[automations] runAutomations failed", err);
  }
}

async function executeRule(rule: AutomationRow, ctx: TriggerContext) {
  let status: "success" | "error" = "success";
  let error: string | null = null;
  try {
    await dispatchAction(rule, ctx);
  } catch (e: any) {
    status = "error";
    error = String(e?.message ?? e);
    console.warn("[automations] action failed", rule.action_type, e);
  }
  // Fire-and-forget audit log + last_run_at
  void supabase.from("automation_runs").insert({
    user_id: ctx.userId,
    automation_id: rule.id,
    triggered_by: rule.trigger_type,
    payload: ctx.payload as any,
    status,
    error,
  } as any);
  void supabase.from("automations").update({ last_run_at: new Date().toISOString() }).eq("id", rule.id);
}

async function dispatchAction(rule: AutomationRow, ctx: TriggerContext) {
  const item = ctx.payload.item;
  if (!item?.id) return;
  const currentTags: string[] = Array.isArray(item.tags) ? item.tags : [];
  const cfg = rule.action_config ?? {};
  switch (rule.action_type) {
    case "grocery.moveToPantry":
      await moveToPantry(item.id, {
        tag: cfg.tag ?? PANTRY_TAG,
        stockStatus: (cfg.stockStatus ?? "in") as any,
        currentTags,
      });
      return;
    case "grocery.addTag":
      await addTag(item.id, cfg.tag ?? PANTRY_TAG, currentTags);
      return;
    case "grocery.setStockStatus":
      await setStockStatus(item.id, (cfg.stockStatus ?? "in") as any);
      return;
  }
}

export { PANTRY_TAG };