import { describe, expect, it } from "vitest";
import { isTrashExpired, reviewTaskTitle, suggestTrash } from "./mail-inbox";

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
