/**
 * Shared "tracking" metadata for tasks: what kind of activity it is and,
 * for home work, which zone it belongs to. Both are stored as namespaced
 * tags on the task (`act:cleaning`, `zone:Kitchen`) so nothing in the
 * schema has to change and existing tag filters keep working.
 */
import {
  Brush, Car, ChefHat, HeartHandshake, ShoppingBag, FileText,
  Target, Moon, CircleDashed, type LucideIcon,
} from "lucide-react";

export const ACTIVITY_TAG = "act:";
export const ZONE_TAG = "zone:";

export type ActivityId =
  | "cleaning" | "commuting" | "cooking" | "caregiving"
  | "errands" | "admin" | "focus" | "rest" | "other";

export interface ActivityMeta {
  id: ActivityId;
  label: string;
  icon: LucideIcon;
  /** Chart / chip color. */
  color: string;
}

export const ACTIVITIES: ActivityMeta[] = [
  { id: "cleaning", label: "Cleaning", icon: Brush, color: "hsl(190 62% 48%)" },
  { id: "commuting", label: "Commuting", icon: Car, color: "hsl(217 60% 55%)" },
  { id: "cooking", label: "Cooking", icon: ChefHat, color: "hsl(28 78% 55%)" },
  { id: "caregiving", label: "Caregiving", icon: HeartHandshake, color: "hsl(340 62% 58%)" },
  { id: "errands", label: "Errands", icon: ShoppingBag, color: "hsl(48 74% 50%)" },
  { id: "admin", label: "Admin", icon: FileText, color: "hsl(265 48% 60%)" },
  { id: "focus", label: "Focus work", icon: Target, color: "hsl(152 45% 44%)" },
  { id: "rest", label: "Rest", icon: Moon, color: "hsl(232 40% 62%)" },
  { id: "other", label: "Other", icon: CircleDashed, color: "hsl(215 15% 55%)" },
];

const BY_ID = new Map(ACTIVITIES.map(a => [a.id, a]));

export const ZONES = [
  "Kitchen", "Bathroom", "Bedrooms", "Living", "Laundry", "Entryway", "Outdoor", "Whole home",
] as const;
export type Zone = (typeof ZONES)[number];

export const activityMeta = (id?: string | null): ActivityMeta | null =>
  (id && BY_ID.get(id as ActivityId)) || null;

const tagValue = (tags: string[] | undefined, ns: string): string | undefined =>
  tags?.find(t => t.startsWith(ns))?.slice(ns.length) || undefined;

/** Explicit activity tag on a task, if any. */
export const readActivityTag = (tags?: string[]): ActivityId | undefined =>
  (tagValue(tags, ACTIVITY_TAG) as ActivityId | undefined);

export const readZoneTag = (tags?: string[]): string | undefined => tagValue(tags, ZONE_TAG);

/** Replace one namespaced tag while leaving every other tag untouched. */
export function withTag(tags: string[] | undefined, ns: string, value?: string | null): string[] {
  const rest = (tags ?? []).filter(t => !t.startsWith(ns));
  return value ? [...rest, `${ns}${value}`] : rest;
}

interface TaskLike {
  tags?: string[];
  area?: string;
  recipientId?: string;
  title?: string;
  notes?: string;
}

const GUESS: { id: ActivityId; re: RegExp }[] = [
  { id: "cleaning", re: /\b(clean|tidy|vacuum|laundry|dishes|mop|dust|scrub|declutter)\b/i },
  { id: "commuting", re: /\b(drive|driving|commute|pick ?up|drop ?off|travel to|transport)\b/i },
  { id: "cooking", re: /\b(cook|bake|meal prep|prep dinner|prep lunch|recipe|grill)\b/i },
  { id: "caregiving", re: /\b(care|caregiv|medication|meds|doctor|appointment for|therapy|bath(e|ing))\b/i },
  { id: "errands", re: /\b(grocer|shop|pharmacy|bank|post office|errand|refill)\b/i },
  { id: "admin", re: /\b(email|invoice|bill|paperwork|form|insurance|schedule|call)\b/i },
  { id: "rest", re: /\b(rest|nap|break|breathe|meditat|stretch|unwind)\b/i },
];

/**
 * Resolve a task's activity: the explicit tag wins, otherwise infer from
 * area, care recipient, or wording so existing tasks are already grouped.
 */
export function resolveActivity(task: TaskLike | null | undefined): ActivityMeta | null {
  if (!task) return null;
  const explicit = readActivityTag(task.tags);
  if (explicit && BY_ID.has(explicit)) return BY_ID.get(explicit)!;

  if (task.area === "Meals") return BY_ID.get("cooking")!;
  if (task.area === "Home" && readZoneTag(task.tags)) return BY_ID.get("cleaning")!;
  if (task.recipientId) return BY_ID.get("caregiving")!;

  const hay = `${task.title ?? ""} ${task.notes ?? ""}`;
  for (const g of GUESS) if (g.re.test(hay)) return BY_ID.get(g.id)!;
  return null;
}
