# Smart Rhythm Properties and AI Summary for Notes

## Goal
Every new note automatically gets its rhythm details — Moon phase, Moon sign, CareFlow phase (Plan, Grow, Care, Let go), solar season and cycle phase — based on the note's date. Each note also gets an "AI summary" button that writes a short summary into its properties.

## What you will see
- **Automatic rhythm bundle:** when any note is created (Notes, Inbox, quick add, daily notes, notebooks), its properties panel shows Moon phase, Moon sign, Rhythm phase, Season and Cycle phase. Cycle phase appears only when cycle tracking is on.
- **Uses the note's date:** dated notes (daily notes, journal entries) use that date; other notes use the moment they were created. Changing a note's date offers a "Refresh rhythm" action.
- **Existing notes untouched:** older notes stay as they are, with a "Add rhythm details" button in their properties panel.
- **Editable:** you can change or remove any of these values like other properties; your edits are never overwritten automatically.
- **AI summary button:** in the note's properties panel, "Summarize with AI" writes a 1–2 sentence summary into a Summary property. Tapping again refreshes it. Clear messages appear if AI credits run out.
- **Filters:** the new properties can be used in note table views and filters like any other property.

## Technical details
- Compute values locally with existing helpers (`getMoonPhase`, `getMoonSign`, `lunarRhythmAt`, `seasonFor`, cycle `getPhaseInfo`) in a new `src/lib/notes/rhythm-properties.ts`; stored in existing `notes.properties` jsonb under stable keys plus a `rhythmStampedFor` date marker. No schema change.
- Hook into the shared note-creation path in the store so every creation surface gets stamped once; skip keys the user already set.
- `NotePropertiesSection` renders the bundle with phase colors and the Add/Refresh rhythm and Summarize actions.
- Add a `summarize-properties` action to the existing `ai-notes` function (default Lovable AI model, streaming per gateway rules) returning a short summary saved to `properties.summary`; handle 402/403/429 with readable messages.
- Tests for stamping per date, cycle-off omission, and not overwriting user edits. Record the storage rule in AGENTS.md.

## Verification
- Create notes from Notes, Inbox and quick add; confirm properties appear and persist after reload.
- Run AI summary on a test note and confirm it saves; check phone width.
