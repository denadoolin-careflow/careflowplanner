import { moonEventsOnDay } from "@/lib/cosmic/moon-aspects";
import { it, expect } from "vitest";
it("finds moon events", () => { const e = moonEventsOnDay(new Date(2026,9,21)); console.log(e.map(x=>x.time.toISOString()+" "+x.label).join("\n")); expect(e.length).toBeGreaterThan(3); });
