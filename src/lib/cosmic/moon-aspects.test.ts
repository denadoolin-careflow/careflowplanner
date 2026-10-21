import { moonEventsOnDay } from "@/lib/cosmic/moon-aspects";
import { it, expect } from "vitest";
it("finds moon events", () => { const e = moonEventsOnDay(new Date(2026,9,21)); expect(e.length).toBeGreaterThan(3); });

import { moonBlockFor } from "@/lib/cosmic/moon-aspects";
const ev = (h: number, m: number) => ({ id: "x", time: new Date(2026, 9, 21, h, m), kind: "aspect" as const, aspect: "trine" as const, planet: "Sun", sign: "Aquarius", label: "Moon △ trine Sun", advice: "", actions: [] });
it("centres a 1-hour block on the exact time", () => { expect(moonBlockFor(ev(8, 42))).toMatchObject({ startTime: "08:15", endTime: "09:15" }); });
it("keeps early blocks inside the day", () => { expect(moonBlockFor(ev(0, 10)).startTime).toBe("00:00"); });
