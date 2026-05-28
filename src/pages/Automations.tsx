import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/store";
import { TRIGGERS, ACTIONS, getTrigger, getAction } from "@/lib/automations/registry";
import { ensureDefaultAutomations } from "@/lib/automations/engine";
import type { AutomationRow } from "@/lib/automations/types";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Trash2, Plus, Zap } from "lucide-react";
import { toast } from "sonner";

export default function Automations() {
  const { user } = useStore();
  const [rules, setRules] = useState<AutomationRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    await ensureDefaultAutomations(user.id);
    const { data } = await supabase.from("automations").select("*").eq("user_id", user.id).order("sort_order");
    setRules((data ?? []) as unknown as AutomationRow[]);
    setLoading(false);
  };

  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [user?.id]);

  const toggle = async (r: AutomationRow) => {
    setRules(rs => rs.map(x => x.id === r.id ? { ...x, enabled: !x.enabled } : x));
    await supabase.from("automations").update({ enabled: !r.enabled }).eq("id", r.id);
  };
  const remove = async (r: AutomationRow) => {
    if (!confirm(`Delete automation "${r.name}"?`)) return;
    setRules(rs => rs.filter(x => x.id !== r.id));
    await supabase.from("automations").delete().eq("id", r.id);
  };
  const addQuick = async (triggerType: string, actionType: string, name: string, actionConfig: Record<string, any> = {}) => {
    if (!user) return;
    const { data } = await supabase.from("automations").insert({
      user_id: user.id, name, enabled: true,
      trigger_type: triggerType, trigger_config: {},
      action_type: actionType, action_config: actionConfig,
      sort_order: rules.length,
    } as any).select().single();
    if (data) setRules(rs => [...rs, data as unknown as AutomationRow]);
    toast.success("Automation added.");
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Zap className="h-5 w-5 text-primary" /> Automations
        </h1>
        <p className="text-sm text-muted-foreground">
          Rules that quietly run in the background. When something happens (a trigger), CareFlow performs the action you choose.
        </p>
      </header>

      <section className="space-y-2">
        <h2 className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Your rules</h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : rules.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">No automations yet.</Card>
        ) : (
          <ul className="space-y-2">
            {rules.map(r => {
              const t = getTrigger(r.trigger_type);
              const a = getAction(r.action_type);
              const TriggerIcon = t?.icon ?? Zap;
              const ActionIcon = a?.icon ?? Zap;
              return (
                <Card key={r.id} className="flex items-center gap-3 p-3">
                  <Switch checked={r.enabled} onCheckedChange={() => toggle(r)} />
                  <div className="flex-1">
                    <div className="font-medium">{r.name}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5">
                        <TriggerIcon className="h-3 w-3" />{t?.label ?? r.trigger_type}
                      </span>
                      <span>→</span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-primary">
                        <ActionIcon className="h-3 w-3" />{a?.label ?? r.action_type}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => remove(r)} className="text-muted-foreground hover:text-destructive" title="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </Card>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Add an automation</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {TRIGGERS.flatMap(tr => ACTIONS.map(ac => ({ tr, ac }))).map(({ tr, ac }) => (
            <button key={tr.type + "::" + ac.type}
              onClick={() => addQuick(tr.type, ac.type, `${tr.label} → ${ac.label}`, ac.defaultConfig)}
              className="group flex items-start gap-2 rounded-xl border border-border/60 bg-card/40 p-3 text-left transition hover:border-primary/40 hover:bg-primary/5">
              <Plus className="mt-0.5 h-4 w-4 text-muted-foreground transition group-hover:text-primary" />
              <div className="flex-1">
                <div className="text-sm font-medium">{tr.label} <span className="text-muted-foreground">→</span> {ac.label}</div>
                <div className="text-xs text-muted-foreground">{ac.description}</div>
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}