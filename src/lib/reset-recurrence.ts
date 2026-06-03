import { supabase } from "@/integrations/supabase/client";
import type { ResetChecklist } from "@/lib/reset-checklists";

/** Compute next run timestamp from a recurrence config, given a base date. */
export function computeNextRun(
  rec: { recurrence_type: string; recurrence_days: number[]; recurrence_time: string | null },
  from: Date = new Date(),
): Date | null {
  if (rec.recurrence_type === "none") return null;
  const [hh, mm] = (rec.recurrence_time ?? "06:00").split(":").map(Number);
  const base = new Date(from);
  base.setSeconds(0, 0);

  if (rec.recurrence_type === "daily") {
    const next = new Date(base);
    next.setHours(hh ?? 6, mm ?? 0, 0, 0);
    if (next <= from) next.setDate(next.getDate() + 1);
    return next;
  }

  if (rec.recurrence_type === "weekly") {
    const days = rec.recurrence_days?.length ? rec.recurrence_days : [1]; // default Monday
    for (let offset = 0; offset < 8; offset++) {
      const cand = new Date(base);
      cand.setDate(base.getDate() + offset);
      cand.setHours(hh ?? 6, mm ?? 0, 0, 0);
      if (days.includes(cand.getDay()) && cand > from) return cand;
    }
  }
  return null;
}

/** Run any reset_checklists whose next_run_at is due: uncheck items + advance. */
export async function processDueResets(): Promise<number> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return 0;
  const now = new Date();

  const { data: due } = await supabase
    .from("reset_checklists")
    .select("*")
    .eq("user_id", u.user.id)
    .neq("recurrence_type", "none")
    .lte("next_run_at", now.toISOString());

  if (!due || due.length === 0) return 0;

  for (const list of due as any[]) {
    if (!list.auto_reset) {
      // Still advance schedule even if we don't reset items.
      const next = computeNextRun(list, now);
      await supabase
        .from("reset_checklists")
        .update({ last_run_at: now.toISOString(), next_run_at: next?.toISOString() ?? null })
        .eq("id", list.id);
      continue;
    }
    // Log a cycle marker so history shows the auto-reset.
    await supabase.from("reset_history").insert({
      user_id: u.user.id,
      checklist_id: list.id,
      item_id: null,
      title: `Auto-reset · ${list.name}`,
      kind: list.kind,
      est_minutes: null,
      duration_seconds: null,
    });
    // Uncheck all items on this list.
    await supabase
      .from("reset_items")
      .update({ done: false })
      .eq("checklist_id", list.id)
      .eq("done", true);
    const next = computeNextRun(list, now);
    await supabase
      .from("reset_checklists")
      .update({ last_run_at: now.toISOString(), next_run_at: next?.toISOString() ?? null })
      .eq("id", list.id);
  }
  return due.length;
}

export function describeRecurrence(rec: {
  recurrence_type: string; recurrence_days: number[]; recurrence_time: string | null;
}): string {
  if (rec.recurrence_type === "none") return "No schedule";
  const time = rec.recurrence_time?.slice(0, 5) ?? "06:00";
  if (rec.recurrence_type === "daily") return `Daily at ${time}`;
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const days = (rec.recurrence_days ?? []).slice().sort().map(d => names[d]).join(", ");
  return `Weekly · ${days || "Mon"} at ${time}`;
}
