# Composer pills — searchable & expanded

The inbox "capture" appears in two places:
- Desktop/tablet: `InlineTaskComposer` (already has Date, Project, Area, Energy, Tag, Time-estimate pills).
- Mobile: `MobileCaptureCard` (has only Date, Project, Area as plain lists; no NLP).

Both will get the same treatment.

## Changes

### `src/components/tasks/InlineTaskComposer.tsx`

1. **Date pill — add presets + searchable list.**
   Replace the preset button list inside the date popover with a `Command` palette listing:
   - Today
   - Tomorrow
   - This weekend (next Saturday)
   - Next week (next Monday)
   - Next month (`addMonths(today, 1)`)
   - In 2 weeks
   Each shows the resolved date as a right-aligned hint. `CommandInput` placeholder: "Find a date…". `CommandEmpty` lets user type any natural date (kept simple: tells them to use the calendar). Calendar stays below.

2. **Project pill — keep `Command`, add a "No project" entry** at the top so the user can clear via search.

3. **Area pill — keep `Command`, add a "No area" entry** at the top.

4. **NEW Priority pill.**
   New popover with `Command` list: Low / Medium / High / Clear. Wire to `priority` state, default `undefined`. Pass to `addTask` overriding NLP when set. Icon: `Flag`. Colored dot per level (green/amber/rose).

5. **NEW Time of Day pill.**
   New popover with `Command` list: Morning / Afternoon / Evening / Late Night / Clear. Wire to `dayPart` state (`DayPart`). Pass to `addTask`. Icon: `Sun`. (Distinct from the existing Time-estimate "Time" pill — relabel that pill to "Est" to avoid confusion.)

6. **Tag pill — search already present in `TagPicker`**, no change.

### `src/components/tasks/mobile/MobileCaptureCard.tsx`

Bring it to parity with the desktop composer (lighter weight):
- Date popover: same `Command` preset list above the `Calendar`.
- Project popover: replace plain button list with `Command` (searchable, "None" entry).
- Area popover: replace plain button list with `Command` (searchable, "None" entry).
- Add the same NEW Priority and Time-of-Day pills (icons + small `Command` lists).
- Add a Tag pill backed by the existing `TagPicker`.
- Wire `priority`, `dayPart`, and `tags` into the `addTask` payload.

## Out of scope
- No backend/types changes; `priority` and `dayPart` already exist on `Task`.
- No changes to NLP parsing; explicit pill selections still override parsed values.
- No restyling of the chip row beyond adding two more pills.
