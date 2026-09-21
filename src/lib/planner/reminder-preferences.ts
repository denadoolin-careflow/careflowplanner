import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PlannerReminderPreferences {
  inAppEnabled: boolean;
  deviceEnabled: boolean;
  emailDigestEnabled: boolean;
  emailDigestTime: string;
  plannerEnabled: boolean;
  moonEnabled: boolean;
  cycleEnabled: boolean;
  journalPromptEnabled: boolean;
  defaultLeadMinutes: number;
  snoozeMinutes: number;
  quietEnabled: boolean;
  quietStart: string;
  quietEnd: string;
}

export const DEFAULT_PLANNER_REMINDERS: PlannerReminderPreferences = {
  inAppEnabled: true, deviceEnabled: false, emailDigestEnabled: false, emailDigestTime: "08:00",
  plannerEnabled: true, moonEnabled: true, cycleEnabled: true, journalPromptEnabled: true,
  defaultLeadMinutes: 10, snoozeMinutes: 15, quietEnabled: false, quietStart: "21:00", quietEnd: "07:00",
};

const fromRow = (row: any): PlannerReminderPreferences => ({
  inAppEnabled: !!row.in_app_enabled, deviceEnabled: !!row.device_enabled,
  emailDigestEnabled: !!row.email_digest_enabled, emailDigestTime: row.email_digest_time ?? "08:00",
  plannerEnabled: !!row.planner_enabled, moonEnabled: !!row.moon_enabled, cycleEnabled: !!row.cycle_enabled,
  journalPromptEnabled: !!row.journal_prompt_enabled, defaultLeadMinutes: row.default_lead_minutes ?? 10,
  snoozeMinutes: row.snooze_minutes ?? 15, quietEnabled: !!row.quiet_enabled,
  quietStart: row.quiet_start ?? "21:00", quietEnd: row.quiet_end ?? "07:00",
});

const toRow = (prefs: PlannerReminderPreferences) => ({
  in_app_enabled: prefs.inAppEnabled, device_enabled: prefs.deviceEnabled,
  email_digest_enabled: prefs.emailDigestEnabled, email_digest_time: prefs.emailDigestTime,
  planner_enabled: prefs.plannerEnabled, moon_enabled: prefs.moonEnabled, cycle_enabled: prefs.cycleEnabled,
  journal_prompt_enabled: prefs.journalPromptEnabled, default_lead_minutes: prefs.defaultLeadMinutes,
  snooze_minutes: prefs.snoozeMinutes, quiet_enabled: prefs.quietEnabled,
  quiet_start: prefs.quietStart, quiet_end: prefs.quietEnd,
});

export function usePlannerReminderPreferences() {
  const [prefs, setPrefs] = useState(DEFAULT_PLANNER_REMINDERS);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let active = true;
    void supabase.from("planner_reminder_preferences").select("*").maybeSingle().then(({ data }) => {
      if (active) { if (data) setPrefs(fromRow(data)); setLoaded(true); }
    });
    return () => { active = false; };
  }, []);
  const update = useCallback(async (patch: Partial<PlannerReminderPreferences>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await supabase.from("planner_reminder_preferences").upsert({ user_id: user.id, ...toRow(next) }, { onConflict: "user_id" });
  }, [prefs]);
  return { prefs, update, loaded };
}