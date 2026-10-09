# Notebook Beside the Schedule

## Goal
Keep notes visible while scheduling: Inbox will show inbox items, the schedule, and a notebook together on larger screens; Planner will show a selected note beside its schedule. Search can place any note into that notebook pane without navigating away.

## What will change

### Shared notebook pane
- Create one reusable note pane for Inbox and Planner, using the existing rich note editor, autosave, saved-history access, and open-full-note action.
- Default the pane to the daily notebook note for the schedule’s selected date, while allowing the user to replace it with any existing note.
- Add a clear note title, save status, close action, and “Today’s note” shortcut.
- Preserve the selected note locally so returning to either page restores the working layout without changing note data.

### Search any note into the split
- Add note search inside the pane, searching existing note titles and content.
- Extend the existing global search so note results offer an “Open beside schedule” action when the user is on Inbox or Planner; the page stays in place and the selected note loads into the pane.
- Keep the current normal “Open” behavior for users who want the full note page.

### Inbox layout
- Change Schedule from replacing the notebook to composing with it.
- On wide screens, show three coordinated columns: compact inbox items, day schedule, and selected notebook note.
- At narrower desktop/tablet widths, keep the inbox list beside a tabbed Schedule/Notebook companion area so each remains usable.
- On phones, retain sheet-based access and let the user switch between Schedule and Notebook without losing the selected note or date.

### Planner layout
- Replace the separate journal-only drawer on larger screens with a collapsible notebook side pane beside Day/3 Day schedule content.
- The pane defaults to the daily note matching the planner’s selected day, and can then show any note chosen through search.
- Keep the existing journal sheet on phones, enhanced with the same note selection/search behavior.
- Fit the notebook into the Planner’s existing responsive panel rules so task, focus, and context panels do not create unreadably narrow columns; lower-priority panels will flow below when space is tight.

## Technical details
- Reuse `BlockEditor`, note history/version UI, `NotePicker` search behavior, and existing note read/update functions rather than creating a second editor or storage path.
- Extract the daily-note-only assumptions from `TodayNotebookPane` into a selected-note controller that supports both daily and ordinary notes.
- Add a lightweight shared client event/context for global-search note selection on Inbox and Planner; no database migration is needed.
- Keep schedule dates and note selection independent after an explicit note search; choosing “Today’s note” or changing dates while following the daily notebook reconnects the pane to that date’s daily note.

## Verification
- On Inbox desktop: confirm inbox item dragging still works with schedule and notebook visible, search and open an ordinary note, edit it, reload, and confirm the edit and selected pane persist.
- On Planner desktop: verify Day and 3 Day schedules with the notebook pane, daily-note date following, ordinary-note selection, autosave, undo/history, and panel-width fallbacks.
- On phone: verify Schedule/Notebook switching, note search, editing, closing/reopening, keyboard clearance, and no overlapping controls.
- Confirm global search still opens non-note results normally and offers both full-page and beside-schedule actions for notes on Inbox/Planner.
