import { describe, expect, it } from "vitest";
import { needsExpiryReminder } from "./filing-cabinet";

const today = new Date(2026, 9, 29);

describe("filing cabinet expiry reminders", () => {
  it("reminds 30 days before expiry", () => {
    expect(needsExpiryReminder({ expires_at: "2026-11-28", remind_days: [30, 7] }, today)).toBe(true);
  });
  it("does not remind 31 days before expiry", () => {
    expect(needsExpiryReminder({ expires_at: "2026-11-29", remind_days: [30, 7] }, today)).toBe(false);
  });
  it("does not remind without an expiry date", () => {
    expect(needsExpiryReminder({ expires_at: null, remind_days: [30, 7] }, today)).toBe(false);
  });
});
