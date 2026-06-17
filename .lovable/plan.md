# Notes & Journal — Today surfacing + Phases 3, 4, 5

A lot of surface area here, so I'm grouping it into five shippable chunks. I'll work through them in order and stop after each for you to react if you want.

## A. Today screen surfacing (small, ships first)

New `TodayJournalPulse` card on `/today` (above existing journal/reflection block) showing:
- Mood streak (consecutive days with a `journal_entries.mood`) + last 7 mood dots.
- Top 1–2 "wins & themes" from `ai-cosmic-journal-insights` (cached daily in localStorage to avoid re-spending credits).
- Latest reflection prompt with "Write on this" → routes to `/journal` and pre-fills via existing `onUsePrompt` channel (new `careflow:journal:use-prompt` event).

## B. Journal calendar + task links

- `JournalCalendarView` (month grid) added as a toggle on `/journal` next to the existing list view. Days with entries show a mood dot; click → opens that day's entry in `JournalEntryDialog`.
- Add `journal` as an `EntityType` to `note_links` (already supported in `src/lib/note-links.ts`) and expose a "Link task" affordance inside `JournalEntryDialog` using existing task picker. Renders linked tasks at the bottom of the entry.

## C. Phase 3 — Smart capture + AI

- **Universal Quick Capture FAB**: extend `CombinedFab` into a radial menu with Note / Voice / Journal / Checklist / PDF / Photo. Each routes to existing flows (notes create, `useVoiceDictation` sheet, journal new entry, checklist note kind, attachments upload). No new backend.
- **`ai-notes` actions**: add `summary`, `key_decisions`, `action_items`, `follow_ups`, `auto_tags` to the existing edge function's `ACTIONS` map. `auto_tags` returns JSON `{ people, projects, health, locations, tags }`.
- **NoteIntelligencePanel upgrades**: add Pantry / Care / Family sections using existing stores (`state.pantryItems`, `state.recipients`, `state.householdUsers`); reuse `note_links` for explicit links and surface implicit matches.

## D. Phase 4 — Timeline + Search

- New route `/notes/timeline` (`NotesTimeline.tsx`): chronological merge of notes, journal entries, tasks (completed/created), appointments. Grouped by day, filterable by type chip.
- Upgrade `UniversalSearchBar` / `GlobalSearchDialog` with filter chips: type, tag, person, date range, category. Instant results via existing in-memory store, plus note body search.

## E. Phase 5 — Polish

- Atmosphere-aware surface tokens on note + journal cards (reuse `useAtmosphere`).
- Soft cards: increase radius to `rounded-2xl`, gentle `shadow-cozy`, hairline borders.
- Mobile editor goes full-screen via existing sheet; add left/right swipe between adjacent notes (in current filter).
- Bottom action bar on mobile editor: Save · Tag · Link · AI · More.

## Technical notes

- No schema changes required. `journal_entries.mood` and `note_links.entity_type='journal'` already exist.
- `ai-notes` edits stay backwards compatible (new actions only).
- All new components are presentation-only; data uses existing stores and edge functions.
- Caching: journal insights cached per-day in `localStorage` under `careflow:journal:pulse:<yyyy-mm-dd>`.

## Open question

Do you want the **Universal Quick Capture FAB to fully replace `CombinedFab`** (one FAB system everywhere), or live alongside it on Notes/Journal pages only? I'll default to **replacing** unless you say otherwise — fewer FABs is calmer.
