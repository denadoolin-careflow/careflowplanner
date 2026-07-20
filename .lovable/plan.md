## Goal
Fix the Calendar Colors settings row so the color picker controls sit beneath the category label (no more overlap with the sample chip on narrow widths), and offer curated palettes that mirror the app's Atmosphere presets.

## Changes

### 1. `src/components/settings/CalendarColorsSection.tsx` — restructure `KindRow`
- Replace the current `flex … sm:flex-row sm:items-center` layout with a vertical stack: category header on top, controls below.
- Top row: icon tile + label + live "Sample event" preview chip (unchanged content, just always on its own line).
- Bottom row: palette swatches, Custom hex popover, Reset button — wraps freely without colliding with the label.
- Add a compact palette selector above the swatches to switch between the existing "Signature" palette and new atmosphere-derived palettes (see #2). Selection is local UI state (which palette to show); the actual chosen hex still persists per-kind via `useKindColors`.

### 2. `src/lib/calendar-colors.ts` — add atmosphere palettes
- Keep `CALENDAR_PALETTE` as the default "Signature" palette (back-compat for other importers).
- Add `CALENDAR_PALETTE_GROUPS`: an ordered list of `{ id, name, colors[] }` built from `ATMOSPHERES` (e.g. Sage Sanctuary, Moonlit Plum, Soft Linen, Coastal Calm, Golden Hearth, Peony Bloom, Meadow Dew, Harvest Ember, Evergreen Hearth, Frosted Plum). Each group's `colors` is that atmosphere's `palette` deduped and normalized to lowercase hex. Prepend the existing Signature palette as the first group.

### 3. Wire the selector
- In `KindRow`, render the swatches from the currently selected group. Default group = "Signature".
- Group selector: small `Select` (or segmented pill row) labeled "Palette". Selection is per-row local state so users can browse without affecting others; no persistence needed.

## Out of scope
- No changes to how colors are stored, resolved, or applied elsewhere (`kindStyleFromHex`, calendar rendering, filter pills, list view all keep working unchanged).
- No changes to defaults or reset behavior.
