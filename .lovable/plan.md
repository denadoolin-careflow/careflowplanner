## Problem

`src/lib/atmospheres.ts` defines 21 atmospheres, but `src/index.css` only ships CSS variable overrides for the original 9 (`sage-sanctuary`, `moonlit-plum`, `soft-linen`, `coastal-calm`, `golden-hearth`, `dark-sage-glass`, `dawn`, `mist`, `blossom`). The 12 newer themes (peony-bloom, wisteria-drift, hibiscus-coast, cherry-mist, meadow-dew, lilac-rain, **harvest-ember, amber-orchard, foggy-pine**, snowfall-hush, evergreen-hearth, frosted-plum) set `data-atmosphere` on `<html>` but have no matching CSS block — so the app keeps the default tokens (purple-ish primary), which is exactly why fall themes still render purple.

A second pass on contrast is needed for the light themes where `--foreground` / muted-foreground are too pale against the cream backgrounds.

## Plan

1. **Add full CSS variable blocks in `src/index.css`** for all 12 missing atmospheres, mirroring the structure used by the existing 9:
   - `:root[data-atmosphere="<id>"]` — light theme tokens: `--background`, `--foreground`, `--card`, `--card-foreground`, `--popover*`, `--primary` (+ foreground), `--secondary`, `--muted`, `--accent`, `--border`, `--input`, `--ring`, `--sidebar-*`, plus the atmosphere helpers already used (`--atmo-ambient-1/2/3`, gradient/glow vars if present).
   - `.dark[data-atmosphere="<id>"]` — dark-mode counterparts (deeper background, lifted foreground), even for themes flagged `prefersDark:false`, so dark mode still re-skins.
   - `html[data-atmosphere="<id>"] .atmo-ambient` — gradient background tuned to the palette.
   - Where `glass: true`, include the cozy-card translucency override already used by `blossom` / `moonlit-plum`.
   - Each theme's `--primary` is sourced from the bolder palette swatch (e.g. harvest-ember → burnt orange `#A8512E`, foggy-pine → pine `#3A4A40`, evergreen-hearth → fir green `#2E4A34`) so buttons, links, focus rings, and chips immediately reflect the chosen mood instead of falling back to default purple.

2. **Contrast pass for light atmospheres** (cherry-mist, meadow-dew, lilac-rain, peony-bloom, wisteria-drift, hibiscus-coast, snowfall-hush, soft-linen, dawn, blossom, mist, sage-sanctuary, coastal-calm, golden-hearth):
   - Darken `--foreground` to at least ~18% lightness for body text on cream/pastel backgrounds.
   - Bump `--muted-foreground` from very low contrast greys to ~40–45% lightness.
   - Strengthen `--border` opacity so cards and inputs are visible on near-white surfaces.
   - Verify WCAG AA for body text against `--background` and `--card`.

3. **Audit the seasonal token map block (line ~1716+)** that currently lists only the original 9 atmospheres for the `cozy-card` / `cozy-tint` accents, and extend it to all 21 IDs so secondary surfaces also re-theme.

4. **Verify** by running the Playwright script against `/inbox`, `/calendar`, `/cosmic-flow`, and `/today` after switching to harvest-ember, foggy-pine, evergreen-hearth, lilac-rain, and snowfall-hush; capture screenshots in both light and dark mode and confirm:
   - Primary buttons, active nav, focus rings, and accent chips pick up the new hue (no residual purple).
   - Body text remains AA-readable on light themes.

## Technical notes

- No changes to `src/lib/atmospheres.ts`, the picker, or persistence — those already work; the gap is purely missing CSS.
- All new variables use the same `H S% L%` HSL token format already in use so Tailwind utilities (`bg-primary`, `text-foreground`, `border-border`) pick them up without component edits.
- No component file edits required.
