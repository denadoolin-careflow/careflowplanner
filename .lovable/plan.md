# Natal chart: back button, sign colors, atmosphere backgrounds

## 1. Back button in chart panels
- Every chart panel (planet, sign, house, Rising/Midheaven, transit planet, aspect) remembers where you came from.
- When you open a panel from inside another one, a "Back" arrow at the top left returns you to the previous panel. Panels opened straight from the chart have no back arrow.
- Closing the panel clears the history.

## 2. Coloring by sign (your pick), with Element as an option
- Each of the 12 houses on the wheel gets a soft wash in the color of its sign. The house numbers and sign glyphs on the wheel stay readable.
- The 12 Houses page tints each house card with the same sign color: a colored edge, a soft background and a sign chip.
- A small "Color by" switch above the chart offers **Sign** (the default) or **Element** (Fire, Earth, Air, Water), which covers your earlier element request. Your choice is saved on this device, and the Houses page follows it.
- The 12 sign colors are gentle tints: Aries rose-red, Taurus leaf green, Gemini butter yellow, Cancer moon blue, Leo marigold, Virgo sage, Libra blush, Scorpio plum, Sagittarius terracotta, Capricorn moss, Aquarius sky, Pisces lavender. Text on top always uses the darker shade so it stays readable.

## 3. Chart background follows your atmosphere
- The chart's background uses the current atmosphere's colors, for example warm cream in Apple Orchard, pine dark in Christmas Time, or deep plum in dusk themes. Lines and glyphs adjust so they stay clear.
- This applies in light and dark mode. The "Save image" picture uses the same background.

## Technical details
- `CosmicNatal.tsx`: replace the separate open/selected state per panel with one `panelStack` (`{type, payload}[]`). The `open*` helpers push onto it, Back pops it, and closing empties it. Each dialog gets an optional `onBack`, shown as a header button with an aria-label.
- Add sign tint tokens `--sign-aries` … `--sign-pisces` (HSL, light + dark) in `index.css`, plus a `SIGN_VAR` map in `glyphs.ts`. Add a device-local `chartColorMode` (`sign` | `element`) helper in `src/lib/cosmic/chart-colors.ts` with a test.
- `NatalWheel.tsx`: fill house sectors with `hsl(var(--sign-x) / 0.14)` (or the element var). Change `--chart-surface` so it derives from the atmosphere's background/card tokens instead of a fixed value.
- `CosmicHouses.tsx`: tint the house cards with the same mode helper.
- Record in AGENTS.md: the chart color mode is device-local.
