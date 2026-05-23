export const todayISO = () => new Date().toISOString().slice(0, 10);

export const fmtMoney = (n: number) =>
  `$${(Number(n) || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

export type Cadence =
  | "daily"
  | "weekly"
  | "biweekly"
  | "monthly"
  | "quarterly"
  | "yearly";

export const CADENCES: { value: Cadence; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every 2 weeks" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
];

/** Advance an ISO date by one cadence step. */
export function advanceDate(iso: string, cadence: string): string {
  const d = new Date(iso + "T00:00:00");
  switch (cadence) {
    case "daily": d.setDate(d.getDate() + 1); break;
    case "weekly": d.setDate(d.getDate() + 7); break;
    case "biweekly": d.setDate(d.getDate() + 14); break;
    case "quarterly": d.setMonth(d.getMonth() + 3); break;
    case "yearly": d.setFullYear(d.getFullYear() + 1); break;
    case "monthly":
    default: d.setMonth(d.getMonth() + 1); break;
  }
  return d.toISOString().slice(0, 10);
}

/** Days until an ISO date (negative = overdue, 0 = today). */
export function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = new Date(); t.setHours(0, 0, 0, 0);
  const d = new Date(iso + "T00:00:00");
  return Math.round((d.getTime() - t.getTime()) / 86400000);
}

export function billStatus(nextDue: string | null | undefined): "upcoming" | "due-soon" | "overdue" | "scheduled" {
  const dd = daysUntil(nextDue ?? null);
  if (dd === null) return "scheduled";
  if (dd < 0) return "overdue";
  if (dd <= 3) return "due-soon";
  return "upcoming";
}

/** Gentle, supportive copy. */
export function gentleBillCopy(overdue: number, dueSoon: number): string {
  if (overdue === 0 && dueSoon === 0) return "Nothing pressing this week — your bills are at rest.";
  if (overdue === 0) return `${dueSoon} bill${dueSoon === 1 ? "" : "s"} coming up soon — manageable.`;
  return `${overdue} bill${overdue === 1 ? " needs" : "s need"} a gentle nudge.`;
}