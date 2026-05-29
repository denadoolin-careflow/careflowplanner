# Person Intake Form

Capture each profile's diagnosis, age, cycle, and zodiac in one focused step — both at "Add profile" time and when editing.

## 1. Data model

`care_recipients` already stores `birth_date`, `zodiac`. Add two new nullable columns in a single migration:

- `diagnoses text[] NOT NULL DEFAULT '{}'` — list of tags (e.g. "Autism", "ADHD", "Type 1 diabetes") plus an optional free-text per-tag detail held in a parallel jsonb.
- `diagnosis_notes text` — long-form context (onset, providers, accommodations).
- `cycle jsonb NOT NULL DEFAULT '{}'` — `{ tracks: boolean, avgLength?: number, periodLength?: number, lastPeriodStart?: string, notes?: string }`. Cycle block only shows for `kind in ("self","partner")` and when not flagged male in the form.
- `sex text` — `"female" | "male" | "intersex" | "prefer_not" | null`, drives whether cycle UI shows.

`CareRecipient` type + store mappers (`recipFrom`, insert/update payloads in `store.tsx`) get matching fields. No business-logic changes outside this.

## 2. Intake form

Rebuild `RecipientEditor` as a two-step wizard so the dialog stays calm:

```text
[ Step 1 · Who they are ]      [ Step 2 · Body & being ]
 - Name                          - Diagnoses (chip input + notes)
 - Relationship (kind)           - Sex
 - Birth date  → auto Age        - Cycle (only when relevant):
 - Zodiac (auto from birth,        tracks toggle, avg cycle len,
   overridable)                    avg period len, last period start,
 - Notes                           cycle notes
 - Sensory & prefs              - Contacts + Medications
                                 (existing fieldsets retained here)
```

Implementation details:

- New `DiagnosisChipInput` component: comma-or-enter to add, click-X to remove, preset suggestions (Autism, ADHD, Anxiety, Asthma, Diabetes, Sensory Processing, Dyslexia, PCOS, Endometriosis…).
- Birth date uses the shadcn `Calendar` in a popover (matches `CareProfile.tsx` pattern). Below the picker show a live `Age N` chip and auto-derived `zodiac` chip from existing `zodiacFor(date)` helper.
- Zodiac is a select that defaults to the auto value and can be overridden.
- Cycle section auto-hides for `kind === "pet"` or `sex === "male"`. When visible, shows a Calendar for `lastPeriodStart` plus numeric inputs (default 28 / 5).
- Validation with zod (per security guidance): name 1–80 chars, diagnoses ≤ 20 entries each ≤ 60 chars, cycle lengths 14–60 / 1–14.

## 3. Surface the new data

- `CareProfile.tsx` — add a "Health & cycle" section that renders diagnoses as chips, diagnosis notes, and the cycle summary. Birth date / zodiac already render there.
- `PersonDashboard` — already passes `recipient` to `useAIPersonOverview`; extend the hook's `extras` so diagnoses + cycle inputs flow into the AI prompt (no edge-function change needed; the function already receives `recipient` JSON, just ensure new fields are included in the payload signature).
- `PersonCheckinsSection` — the "cycle phase" cadence option becomes available whenever `recipient.cycle.tracks === true` and `lastPeriodStart` is set, even if the app-level cycle tracker isn't enabled. Add a small `recipientPeriodsAdapter` that converts a recipient's `cycle` block into the `PeriodLog[]` shape `phaseForDate` expects.

## Technical notes

- Migration only adds columns; existing rows get safe defaults (`{}`, `null`).
- Store mappers (`recipFrom`, `addRecipient`, `updateRecipient` payload assembly) and `CareRecipient` type get the new fields.
- Editor stays a single dialog with `Tabs` (`Who` / `Body & being` / `Contacts & meds`) rather than a multi-step wizard so users can jump.
- No new connectors, secrets, or AI calls. AI weight unchanged.
- Build order: migration → type + store updates → DiagnosisChipInput → RecipientEditor rebuild → CareProfile surface → cycle-aware checkin adapter.
