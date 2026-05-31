## Goal

Add two new collapsible sections to the left sidebar:

1. **Pinned Notes** — every note flagged `pinned` shows as a sidebar link to `/notes/:id`. Pin/unpin from the existing pin button on `NoteDetail`, plus a new hover-pin action on each row in the Notes list.
2. **Quick Dates** — fast jumps into the calendar:
   - **This Week** + 4 upcoming weeks → `/week?date=YYYY-MM-DD` (Monday of that week)
   - **This Month** + next 5 months → `/month?date=YYYY-MM-01`
   Each subsection (Weeks, Months) can be collapsed independently like other sidebar groups.

A new **Sidebar sections** toggle menu (gear popover at the top of the sidebar, next to the existing theme/side buttons) lets the user show/hide Pinned Notes, Quick Weeks, and Quick Months independently. Preferences persist in localStorage.

## Behavior

- Pinned Notes section is hidden when no notes are pinned (even if toggle is on), with a small "Pin a note to see it here" hint shown only when toggle on and list empty.
- Active week/month route is highlighted using existing `NavLink` active styling — match against `?date=` query.
- Collapsed sidebar: each pinned note and quick date renders as an icon-only row with tooltip (note title, or formatted date label like "Wk of Jun 2").
- Section order: existing nav groups → Pinned Notes → Quick Dates (placed after the current groups, above no footer).
- New sections respect the same `wrapItem` collapsed/tooltip pattern and `onNavigate` close-on-mobile behavior.

## Technical Details

**Files touched (frontend only, no schema changes — `notes.pinned` already exists):**

- `src/components/layout/Sidebar.tsx`
  - Add `usePinnedNotes()` hook: subscribes to `notes` via existing `listNotes()` + a realtime channel filter `pinned=eq.true` (or simple refetch on `visibilitychange` + on a custom `careflow:notes:pinned-changed` event dispatched from `updateNote`).
  - Add `SidebarSectionsMenu` popover (Settings icon) with three switches: Pinned Notes / Quick Weeks / Quick Months. Persist under `careflow:sidebar:sections` key.
  - Add `<PinnedNotesSection>` and `<QuickDatesSection>` components inside `SidebarBody`, rendered conditionally based on prefs.
  - Use `date-fns` `startOfWeek({ weekStartsOn: 1 })`, `addWeeks`, `startOfMonth`, `addMonths`, `format`.

- `src/lib/notes.ts`
  - In `updateNote`, after a successful update that includes `pinned`, dispatch `window.dispatchEvent(new Event("careflow:notes:pinned-changed"))` so the sidebar refreshes immediately.
  - Add `listPinnedNotes()` helper that selects `id, title, kind, date` where `pinned = true` ordered by `updated_at desc`.

- `src/pages/Notes.tsx` (small UX add)
  - Add a pin button on each note row (hover-revealed) that toggles `pinned`. Uses existing `updateNote`. This is optional polish but keeps the feature discoverable.

**No database migration required** — `pinned boolean` column already exists on `notes`.

**LocalStorage keys added:**
- `careflow:sidebar:sections` → `{ pinnedNotes: boolean; quickWeeks: boolean; quickMonths: boolean }` (defaults: all true)
- Reuses existing `STORAGE_KEY` (`careflow:sidebar:open-groups`) for open/closed state of the two new sections, with ids `pinned-notes`, `quick-weeks`, `quick-months`.

## Out of Scope

- Reordering pinned notes (uses note `updated_at` order)
- Drag-pinning notes onto the sidebar
- Pinning tasks/projects (projects already have a Favorite star)
- Quick dates beyond the 5-week / 6-month horizon
- A separate Day quick-jump (Today already exists in the top section)
