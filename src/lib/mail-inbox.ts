import { differenceInCalendarDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { type CabinetDoc, type AnalyzeResult, deleteDoc, updateDoc } from "@/lib/filing-cabinet";

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
