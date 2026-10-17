import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { THEME_PRESETS } from "./theme-preset";
const css = readFileSync("src/index.css", "utf8");
describe("theme presets", () => {
  for (const p of THEME_PRESETS.filter(p => p.id !== "default")) {
    it(`${p.id} sets foreground, card and border in light and dark`, () => {
      for (const sel of [`:root[data-theme="${p.id}"]`, `.dark[data-theme="${p.id}"]`]) {
        const blocks = css.split(sel).slice(1).map(b => b.slice(0, b.indexOf("}"))).join("");
        for (const t of ["--foreground:", "--card:", "--border:", "--muted:"]) expect(blocks).toContain(t);
      }
    });
  }
});
