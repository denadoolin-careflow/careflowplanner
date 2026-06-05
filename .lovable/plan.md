## Goal

Make the app smart enough to guess the right Area from natural-language task titles ("Give Aerie a bath" → Kids, "Help Nana" → Caregiving, "Make dinner" → Meals), and let users add their own custom Areas.

## 1. Smarter area detection

Extend `src/lib/task-auto-detect.ts` (`detectAreaAndProject`) with three new signal sources, ordered by confidence:

**a) Care recipient name match (highest signal)**
- Add `recipients?: CareRecipient[]` to `DetectInput`.
- Tokenize title+notes, match any recipient's first name (case-insensitive, ≥2 chars).
- Map `recipient.kind` → area:
  - `child` → **Kids**
  - `elder` → **Caregiving**
  - `pet` → **Caregiving**
  - `partner` → **Family**
  - `self` → **Personal**
- Also set `recipientId` on the result so TaskEditor can prefill the recipient field. Common nicknames already stored on the recipient ("Nana", "Mom", "Dad") work automatically because they're matched as names.

**b) Verb / action lexicon**
A small map of action words → area, e.g.:
- bath, bathe, brush, diaper, pickup, dropoff, daycare, homework, playdate → Kids
- help, visit, drive, refill, pharmacy, meds, prescription, checkup → Caregiving (when paired with a non-self recipient or aging-care noun)
- cook, prep, defrost, marinate, dinner, breakfast, lunch, snack, recipe, grocery → Meals
- pay, transfer, deposit, invoice, refund, statement → Money
- doctor, dentist, therapy, vet, appt → Appointments
- birthday, gift, card, wrap, party → Holidays & Birthdays
- laundry, dishes, vacuum, mop, trash, mow, declutter → Home

Implemented as a single `VERB_AREA` table keyed by stemmed token, scored so a recipient match still wins over a verb match.

**c) Existing project / area-name match** — unchanged, still runs first when there's a strong project name hit.

**Scoring order**: project name > recipient name > custom area name > built-in area name > verb lexicon > area alias. First positive match wins; ties resolve in that order.

## 2. Wire detection into editors

- `TaskEditor.tsx`: pass `state.recipients` into `detectAreaAndProject`, and apply the suggested `recipientId` (only when the field is empty).
- `QuickEntryBar.tsx`: after `parseTaskInput`, if no explicit `@area` was found, run `detectAreaAndProject` on the raw text and use the guessed area + recipientId. This makes the inline quick add ("give Aerie a bath") land in Kids automatically.

No change to NLP parser tokens — explicit `@kids` / `+Project` still override.

## 3. Add custom areas

**Store**: add `addArea(patch: Partial<AreaRecord>)` and `deleteArea(id)` to `src/lib/store.tsx` next to existing `updateArea`. `addArea` inserts into `areas` with `user_id`, `name`, optional `icon`/`color`, and `sort_order = max+1`.

**UI**: on `src/pages/HomeAreas.tsx`, add an "+ Add area" button next to the existing header. Opens a small dialog (reuses `AreaIconColorPicker`) with Name, Icon, Color. On submit → `addArea` → navigates to `/areas/:name`.

Also expose rename/archive on the existing `AreaPage.tsx` header via an overflow menu (calls `updateArea`).

Detection automatically picks up new custom areas because `detectAreaAndProject` already scans `areas` by name; no further changes needed.

## Out of scope

- No AI/LLM calls — pure local heuristics, instant and free.
- No schema changes (the `areas` table already supports custom rows).
- No bulk reclassification of existing tasks.

## Technical notes

Files touched:
- `src/lib/task-auto-detect.ts` — add recipient + verb logic, extend `DetectInput`/`DetectResult` with `recipientId`.
- `src/components/tasks/TaskEditor.tsx` — pass recipients, apply recipientId.
- `src/components/tasks/QuickEntryBar.tsx` — fallback detection when no `@area` token.
- `src/lib/store.tsx` — `addArea`, `deleteArea`.
- `src/pages/HomeAreas.tsx` — "Add area" button + dialog.
- `src/pages/AreaPage.tsx` — header overflow menu for rename/archive (small).
