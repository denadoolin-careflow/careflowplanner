import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { readSteps, useRitualSteps } from "./ritual-steps";

describe("ritual completion persistence", () => {
  beforeEach(() => localStorage.clear());

  for (const kind of ["morning", "evening"] as const) {
    it(`keeps ${kind} default IDs and check-offs across remounts`, () => {
      expect(readSteps(kind)).toEqual(readSteps(kind));
      const first = renderHook(() => useRitualSteps(kind, "2026-10-08"));
      const id = first.result.current.steps[0].id;
      act(() => first.result.current.toggle(id));
      expect(first.result.current.done).toContain(id);
      expect(first.result.current.steps[0].id).toBe(id);
      first.unmount();
      const second = renderHook(() => useRitualSteps(kind, "2026-10-08"));
      expect(second.result.current.done).toContain(second.result.current.steps[0].id);
      act(() => second.result.current.toggle(id));
      expect(second.result.current.done).not.toContain(id);
      second.unmount();
      const nextDay = renderHook(() => useRitualSteps(kind, "2026-10-09"));
      expect(nextDay.result.current.done).toEqual([]);
    });
  }
});