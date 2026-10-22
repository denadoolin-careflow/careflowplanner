# Colors and icons for note properties and their choices

## What you'll get
- **Property icon + color:** tap a property's icon (e.g. "Moon phase") to pick from a small icon set (moon, sun, leaf, heart, star, flame, droplet, flag, tag, etc.) and a color. Shown beside the property name in Properties, table column headers and gallery cards.
- **Choice icon + color:** each choice (e.g. "Full Moon", "Grow") already has a color picker; it gains an icon picker too. Icon shows inside the choice chip everywhere chips appear (note, table, gallery, filter menu).
- **Consistent across notes:** styling set on one note applies to every note with the same property name, so "Full Moon" looks the same everywhere.
- **Smart defaults:** rhythm properties start with fitting icons and the Plan/Grow/Care/Let go phase colors; moon phases get moon glyphs. You can override any of them.

## Technical details
- New synced style map keyed by normalized property name: `{ icon?, color?, options: { [value]: { icon?, color? } } }`, stored in the existing user preferences/settings row (jsonb), cached in localStorage. Existing per-note `prop.colors` stays as fallback, so no data loss.
- `src/lib/notes/property-styles.ts`: hook `usePropertyStyles()`, resolvers `propertyStyle(name)` / `optionStyle(name, value)`, curated lucide icon registry, rhythm defaults.
- `NotePropertiesSection.tsx`: icon/color popover on property icon; icon row added to option color editor; `OptionChip` renders icon.
- `NotesTableView.tsx`, gallery cards, `RhythmViewControls.tsx`: use shared chip/header rendering.
- Colors limited to semantic palette tokens (brand + phase tints) for contrast.
- Tests for resolver fallback order (global style -> per-note color -> default).
