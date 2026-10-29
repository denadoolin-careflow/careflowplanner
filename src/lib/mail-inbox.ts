import { differenceInCalendarDays, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { type CabinetDoc, type AnalyzeResult, deleteDoc, updateDoc } from "@/lib/filing-cabinet";

export type { CabinetDoc } from "@/lib/filing-cabinet";

export const MAIL_TYPES = [
  { id: "bill", label: "Bill" }, { id: "coupon", label: "Coupon" }, { id: "statement", label: "Statement" },
  { id: "letter", label: "Letter" }, { id: "medical", label: "Medical" }, { id: "legal", label: "Legal" },
  { id: "junk", label: "Ad / Junk" }, { id: "other", label: "Other" },
] as const;
export const MAIL_STATUSES = [
  { id: "new", label: "New" }, { id: "review", label: "To review" }, { id: "done", label: "Done" }, { id: "trash", label: "Trash" },
] as const;
export type MailStatus = (typeof MAIL_STATUSES)[number]["id"];
export const TRASH_DAYS = 30;

const db = supabase as any;

/** Trashed mail is permanently deleted once it has been in Trash for 30 days. */
export function isTrashExpired(trashedAt: string | null | undefined, now: Date = new Date()): boolean {
  if (!trashedAt) return false;
  return differenceInCalendarDays(now, new Date(trashedAt)) >= TRASH_DAYS;
}

/** Bills and coupons whose date has passed are suggested for the trash once they're done or past due. */
export function suggestTrash(doc: Pick<CabinetDoc, "mail_type" | "due_on" | "mail_status">, now: Date = new Date()): boolean {
  if (doc.mail_status === "trash" || !doc.due_on) return false;
  if (doc.mail_type !== "coupon" && doc.mail_type !== "bill" && doc.mail_type !== "junk") return false;
  return differenceInCalendarDays(now, new Date(doc.due_on + "T00:00:00")) > 0;
}

/** Title for the review task: bills with an amount become "Pay …", everything else "Review …". */
export function reviewTaskTitle(doc: Pick<CabinetDoc, "title" | "mail_type" | "amount">): string {
  if (doc.mail_type === "bill") return `Pay: ${doc.title}${doc.amount ? ` ($${Number(doc.amount).toFixed(2)})` : ""}`;
  return `Review mail: ${doc.title}`;
}

export async function listMail(): Promise<CabinetDoc[]> {
  const { data, error } = await db.from("cabinet_documents").select("*").eq("kind", "mail").order("created_at", { ascending: false });
  if (error) throw error;
  const rows = data as CabinetDoc[];
  // Purge expired trash
  for (const d of rows.filter((r) => r.mail_status === "trash" && isTrashExpired(r.trashed_at))) {
    try { await deleteDoc(d); } catch { /* keep going */ }
  }
  const live = rows.filter((r) => !(r.mail_status === "trash" && isTrashExpired(r.trashed_at)));
  // A finished review task marks its mail Done
  const ids = live.filter((r) => r.mail_status === "review" && r.review_task_id).map((r) => r.review_task_id!);
  if (ids.length) {
    const { data: tasks } = await db.from("tasks").select("id,done").in("id", ids);
    const done = new Set((tasks ?? []).filter((t: any) => t.done).map((t: any) => t.id));
    for (const r of live) if (r.review_task_id && done.has(r.review_task_id) && r.mail_status === "review") {
      r.mail_status = "done"; await updateDoc(r.id, { mail_status: "done" } as any);
    }
  }
  return live;
}

export async function setMailStatus(doc: CabinetDoc, status: MailStatus) {
  await updateDoc(doc.id, { mail_status: status, trashed_at: status === "trash" ? new Date().toISOString() : null } as any);
}

export async function scheduleReview(doc: CabinetDoc, date: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Please sign in");
  const title = reviewTaskTitle(doc);
  if (doc.review_task_id) {
    const { data: existing } = await db.from("tasks").select("id").eq("id", doc.review_task_id).maybeSingle();
    if (existing) {
      await db.from("tasks").update({ due_date: date, title, done: false }).eq("id", doc.review_task_id);
      await updateDoc(doc.id, { mail_status: "review" } as any);
      return;
    }
  }
  const { data, error } = await db.from("tasks").insert({
    user_id: user.id, title, due_date: date, notes: `From your Mail inbox: ${window.location.origin}/notes/mail?open=${doc.id}`,
  }).select("id").single();
  if (error) throw error;
  await updateDoc(doc.id, { mail_status: "review", review_task_id: data.id } as any);
}

export async function fileToCabinet(doc: CabinetDoc, drawerId: string | null) {
  await updateDoc(doc.id, { kind: "document", drawer_id: drawerId, mail_status: "done", expires_at: doc.expires_at ?? (doc.mail_type === "coupon" ? doc.due_on : null) } as any);
}

/** Fill empty mail fields from an AI read, never overwriting what the user typed. */
export function mailPatchFromAI(doc: CabinetDoc, r: AnalyzeResult): Partial<CabinetDoc> {
  const p: Partial<CabinetDoc> = {};
  if (!doc.mail_type && r.mail_type) p.mail_type = r.mail_type;
  if (!doc.sender && r.sender) p.sender = r.sender;
  if (doc.amount == null && r.amount != null) p.amount = r.amount;
  if (!doc.due_on && r.due_on) p.due_on = r.due_on;
  if (r.suggested_title && /^Scan |^IMG|^image|^PXL/i.test(doc.title)) p.title = r.suggested_title;
  return p;
}

export type MailReminderKind = "review" | "due" | "expires" | "trash";
export type MailReminder = { doc: CabinetDoc; kind: MailReminderKind; days: number | null };

const DUE_TYPES = new Set(["bill", "statement", "medical", "legal"]);
const REVIEW_WINDOW = 2;
const TRASH_WINDOW = 3;

/**
 * Mail that needs a decision soon: a review task coming up, a bill/statement date
 * nearby, a coupon about to expire, or Trash about to be deleted for good.
 * `reviewDue` maps a review task id to its due date.
 */
export function mailReminders(mail: CabinetDoc[], reviewDue: Record<string, string | null> = {}, today: Date = new Date()): MailReminder[] {
  const out: MailReminder[] = [];
  for (const doc of mail) {
    if (doc.mail_status === "trash") {
      const left = doc.trashed_at ? TRASH_DAYS - differenceInCalendarDays(today, parseISO(doc.trashed_at)) : null;
      if (left != null && left <= TRASH_WINDOW) out.push({ doc, kind: "trash", days: left });
      continue;
    }
    if (doc.mail_status === "done") continue;
    if (doc.mail_status === "review") {
      const due = doc.review_task_id ? reviewDue[doc.review_task_id] ?? null : null;
      const days = due ? differenceInCalendarDays(parseISO(due), today) : null;
      if (days == null || days <= REVIEW_WINDOW) out.push({ doc, kind: "review", days });
      continue;
    }
    if (doc.mail_type === "coupon") {
      const date = doc.due_on ?? doc.expires_at;
      const days = date ? differenceInCalendarDays(parseISO(date), today) : null;
      if (days != null && days <= REVIEW_WINDOW) out.push({ doc, kind: "expires", days });
      continue;
    }
    if (doc.due_on && DUE_TYPES.has(doc.mail_type ?? "")) {
      const days = differenceInCalendarDays(parseISO(doc.due_on), today);
      if (days <= REVIEW_WINDOW) out.push({ doc, kind: "due", days });
    }
  }
  return out.sort((a, b) => (a.days ?? 99) - (b.days ?? 99));
}

/** Short phrase describing why a piece of mail is on the Today list. */
export function mailReminderLabel(r: MailReminder): string {
  const n = (d: number) => `${d} day${d === 1 ? "" : "s"}`;
  if (r.kind === "trash") return r.days! <= 0 ? "Deleted for good today" : `Deleted for good in ${n(r.days!)}`;
  if (r.kind === "expires") return r.days! < 0 ? "Expired" : r.days! === 0 ? "Expires today" : `Expires in ${n(r.days!)}`;
  if (r.kind === "due") return r.days! < 0 ? `${n(-r.days!)} overdue` : r.days! === 0 ? "Due today" : `Due in ${n(r.days!)}`;
  if (r.days == null) return "Review when you can";
  return r.days < 0 ? `Review ${n(-r.days)} overdue` : r.days === 0 ? "Review today" : `Review in ${n(r.days)}`;
}

/** Mail reminders for Today, reading the same records the Mail tab uses. */
export async function listMailReminders(today: Date = new Date()): Promise<MailReminder[]> {
  const mail = await listMail();
  const ids = mail.filter((m) => m.review_task_id).map((m) => m.review_task_id!);
  const reviewDue: Record<string, string | null> = {};
  if (ids.length) {
    const { data: tasks } = await db.from("tasks").select("id,due_date").in("id", ids);
    for (const t of (tasks ?? []) as { id: string; due_date: string | null }[]) reviewDue[t.id] = t.due_date;
  }
  return mailReminders(mail, reviewDue, today);
}
