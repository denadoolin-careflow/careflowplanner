import { describe, expect, it } from "vitest";
import { isTrashExpired, mailReminderLabel, mailReminders, reviewTaskTitle, suggestTrash, type MailReminder, type CabinetDoc } from "./mail-inbox";

const doc = (over: Partial<CabinetDoc>): CabinetDoc => ({
  id: over.id ?? "d", drawer_id: null, title: "Paper", storage_path: "p", mime_type: null, size_bytes: null,
  tags: [], expires_at: null, remind_days: [], summary: null, key_details: [], extracted_text: null,
  created_at: "2026-10-01T00:00:00Z", kind: "mail", ...over,
} as CabinetDoc);

const now = new Date(2026, 9, 29, 12);

describe("mail inbox rules", () => {
  it("permanently deletes trash after 30 days", () => {
    expect(isTrashExpired(new Date(2026, 8, 29, 12).toISOString(), now)).toBe(true);
  });
  it("keeps trash for 29 days", () => {
    expect(isTrashExpired(new Date(2026, 8, 30, 12).toISOString(), now)).toBe(false);
  });
  it("suggests trashing a coupon after its date", () => {
    expect(suggestTrash({ mail_type: "coupon", due_on: "2026-10-28", mail_status: "new" }, now)).toBe(true);
  });
  it("does not suggest trashing a letter", () => {
    expect(suggestTrash({ mail_type: "letter", due_on: "2026-10-01", mail_status: "new" }, now)).toBe(false);
  });
  it("names bill review tasks as payments", () => {
    expect(reviewTaskTitle({ title: "Electric", mail_type: "bill", amount: 84.5 })).toBe("Pay: Electric ($84.50)");
  });
});

describe("mail reminders on Today", () => {
  const review = doc({ id: "r1", title: "Insurance letter", mail_status: "review", mail_type: "letter", review_task_id: "t1" });
  const bill = doc({ id: "b1", title: "Electric", mail_status: "new", mail_type: "bill", due_on: "2026-10-31", amount: 84.5 });
  const coupon = doc({ id: "c1", title: "Store coupon", mail_status: "new", mail_type: "coupon", due_on: "2026-10-30" });
  const letter = doc({ id: "l1", title: "School note", mail_status: "new", mail_type: "letter", due_on: "2026-11-05" });
  const done = doc({ id: "z1", title: "Old bill", mail_status: "done", mail_type: "bill", due_on: "2026-10-20" });
  const trash = doc({ id: "x1", title: "Flyer", mail_status: "trash", mail_type: "junk", trashed_at: "2026-09-29T12:00:00" });

  it("lists a review whose task is due today", () => {
    const r = mailReminders([review], { t1: "2026-10-29" }, now);
    expect(r.map((m) => m.doc.id)).toEqual(["r1"]);
    expect(mailReminderLabel(r[0] as MailReminder)).toBe("Review today");
  });
  it("hides a review more than two days away", () => {
    expect(mailReminders([review], { t1: "2026-11-03" }, now)).toEqual([]);
  });
  it("lists a bill due in two days and a coupon expiring tomorrow", () => {
    const r = mailReminders([bill, coupon], {}, now);
    expect(r.map((m) => `${m.doc.id}:${m.kind}`)).toEqual(["c1:expires", "b1:due"]);
    expect(mailReminderLabel(r[0] as MailReminder)).toBe("Expires in 1 day");
    expect(mailReminderLabel(r[1] as MailReminder)).toBe("Due in 2 days");
  });
  it("ignores letters without a review task, finished mail, and fresh trash", () => {
    expect(mailReminders([letter, done, trash], {}, now)).toEqual([]);
  });
  it("warns before trash is deleted for good", () => {
    const r = mailReminders([doc({ id: "x2", title: "Catalog", mail_status: "trash", trashed_at: "2026-10-01T12:00:00" })], {}, now);
    expect(r.map((m) => m.kind)).toEqual(["trash"]);
    expect(mailReminderLabel(r[0] as MailReminder)).toBe("Deleted for good in 2 days");
  });
});
