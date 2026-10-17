# Edit times and notes on Bedside care

## What you'll get
- **Timeline entries** (relief medicine given, comfort checks, turns, pain checks): a pencil button on each entry opens a small editor where you can change the date and time it happened, plus the dose and note text. Save or Cancel.
- **Notes about a person**: the same pencil button lets you edit the note's wording and its date/time.
- The timeline and "Last relief medicine / Last turned" chips re-sort and refresh right after saving, so a corrected time shows in the right place.
- Times can't be set in the future; empty notes can't be saved.

## Technical details
- `src/pages/CareBedside.tsx`: add inline edit state per log row with `datetime-local` input (local ↔ ISO), dose and note inputs; save with `bedside_logs.update({logged_at, dose, note})` by id, then re-sort locally.
- `src/components/care/BedsidePersonPlan.tsx`: same inline editor for `kind = "note"` rows (note + logged_at).
- Small shared helper `src/lib/bedside-edit.ts` (to/from datetime-local, future-time guard) with a Vitest test.
- No database changes; existing row policies already allow updating your own entries (verify during build).
