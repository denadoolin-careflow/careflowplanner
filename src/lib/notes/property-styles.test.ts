import { describe, it, expect } from "vitest";
import { mergeStylePatch, resolveOption, resolveProp } from "./property-styles";

describe("property styles", () => {
  it("preserves another device's property color when changing its icon", () => {
    expect(mergeStylePatch({ mood: { color: "rose", icon: "moon" } }, { mood: { icon: "heart" } }).mood)
      .toEqual({ color: "rose", icon: "heart" });
  });
  it("preserves unrelated choices and fields during cross-device merges", () => {
    const merged = mergeStylePatch({ mood: { options: { calm: { color: "olive", icon: "leaf" }, happy: { icon: "sun" } } } },
      { mood: { options: { calm: { icon: "heart" } } } });
    expect(merged.mood.options).toEqual({ calm: { color: "olive", icon: "heart" }, happy: { icon: "sun" } });
  });
  it("user choice color beats per-note color", () => {
    const map = { mood: { options: { calm: { color: "#111" } } } };
    expect(resolveOption(map, "Mood", "Calm", "#222").color).toBe("#111");
  });
  it("per-note color beats default", () => {
    expect(resolveOption({}, "Rhythm phase", "Plan", "#222").color).toBe("#222");
  });
  it("falls back to rhythm defaults", () => {
    expect(resolveOption({}, "Rhythm phase", "Let go").color).toBe("#FBE3E3");
    expect(resolveProp({}, "Moon phase").icon).toBe("moon");
  });
});

import { resolveOption as _ro } from "./property-styles";
import { describe as _d, it as _it, expect as _e } from "vitest";
_d("cosmic glyph defaults", () => {
  _it("Moon sign Aries resolves to the zodiac glyph", () => {
    _e(_ro({}, "Moon sign", "Aries").icon).toBe("glyph:♈\uFE0E");
  });
  _it("Moon phase Full Moon resolves to the full moon glyph", () => {
    _e(_ro({}, "Moon phase", "Full Moon").icon).toBe("glyph:🌕");
  });
});
