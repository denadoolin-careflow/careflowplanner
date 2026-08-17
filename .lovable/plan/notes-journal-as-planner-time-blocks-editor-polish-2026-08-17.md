# Notes & Journal as Planner Time Blocks + Editor Polish

## Part 1 — Create a note or journal as a time block

Today the planner's Capture menu sends "Note" off to `/notes`, and time blocks can only link to a task (`time_blocks` has `task_id` but no note/journal link — verified against the database). This adds writing sessions as first-class blocks on the grid.

What you'll get:
- **Capture → Note / Journal** on the planner creates a scheduled block right on the timeline (default 30 min at the tapped slot) instead of navigating away.
- Clicking an empty grid slot offers "Write a note" / "Journal entry" alongside the existing task/event quick-add.
- The block shows a note or feather icon and a soft distinct color, drags/resizes like any other block, and lives in the Morning/Afternoon/Evening bands.
- Tapping the block opens a **writing sheet** with the note/journal editor inline — write without leaving the planner. Desktop opens a side panel; mobile opens the compact sheet, drag-up for the full editor.
- The block stays linked: renaming the note renames the block, and the note/journal record carries the same date so it also appears in Notes and Journal Flow.
- Existing notes/journals can be **scheduled**: a "Schedule time" action from the note editor and a "Pick existing note" option in the block composer.

## Part 2 — Notes editor UX/UI (Craft + Notion + Evernote feel)

Focused on the toggle/collapse experience and overall smoothness in `BlockEditor.tsx`:
- **Toggles**: animated chevron with height-eased open/close instead of instant snap, clear hover affordance, nesting guide line down the left of toggle content, drag a toggle to move its whole subtree, "collapse all / expand all" in the editor menu, and persisted open state per note.
- **Block handles**: steadier drag handle + `+` insert button pairing (Notion-style), handle click opens a block action menu (turn into, duplicate, move to, delete, copy link).
- **Slash menu**: grouped sections with previews, recent commands first, keyboard-first navigation.
- **Typography & rhythm**: Craft-like reading measure, tightened heading scale, softer selection and focus states, smoother caret and hover transitions.
- **Mobile**: larger toggle/checkbox hit targets, sticky compact formatting bar above the keyboard, momentum-safe swipe-select.
- Respects existing design tokens and dark mode; no hardcoded colors.

## Technical notes

- Migration on `public.time_blocks`: add `link_type text` (`'note' | 'journal'`) and `link_id uuid`, plus an index on `(user_id, date)`. Existing RLS policies already scope by `user_id`; no new policies or grants needed for added columns.
- Extend `TimeBlock` in `src/lib/time-blocks.ts` (`linkType`, `linkId`) through `fromRow`, `add`, and `update`.
- New `src/lib/planner/write-blocks.ts`: create note (`src/lib/notes.ts`) or journal entry (store `addJournal`) and the paired block in one call; keep title in sync on rename.
- New `src/components/planner/WriteBlockSheet.tsx` reusing `BlockEditor` for notes and the journal form for entries; routed via `PlannerItemOpener.tsx` and `open-mobile-block-editor.ts` so desktop/mobile behave consistently.
- `CaptureMenu.tsx` and the timeline anchored composer gain Note/Journal kinds; `kindIcon.tsx` and calendar colors get a `write` kind.
- Editor work stays inside `src/components/notes/BlockEditor.tsx` (Details extension config, drag-handle plugin, slash menu render) plus editor CSS in `index.css`.
