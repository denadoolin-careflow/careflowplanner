# Richer Journal, Notes, and Planner Views

## Goal
Make today’s journal comfortable for rich writing, turn pasted web links into useful note content, make task completion immediate in Agenda/List, and give Month a balanced upgrade across readability, planning speed, and rhythm context.

## What will change

### Today’s Journal
- Replace the plain typing area in the Planner journal drawer with the existing note rich-text editor in a compact, distraction-free mode.
- Preserve the current daily-note content and autosave behavior while adding headings, bold, italic, underline, lists, checklists, quotes, links, and inline formatting controls.
- Keep “Insert day’s rhythm” and “Open full note,” with safe save flushing when the drawer closes.
- Improve rendered markdown spacing and hierarchy so headings, lists, checklists, quotes, and links read cleanly in daily-note previews.

### Rich web links and embeds
- Extend the existing note editor’s link flow so pasted external URLs can become smart link cards showing a clear title/label, domain, and open action.
- Keep ordinary inline links available; supported media/file URLs continue using the existing embed system.
- Persist rich link cards through the current markdown/HTML round-trip without changing note storage or existing notes.
- Provide an accessible fallback card when a site cannot supply preview details or blocks embedding.

### Agenda and List task completion
- Add a visible open checkbox to task rows in Planner Agenda and List views, including the mobile Month Agenda/List modes.
- Checking it completes the task without opening the task details; clicking the remaining row still opens it.
- Reuse the existing completion state, feedback, undo behavior, and completed-task styling. Non-task items keep their existing icons and actions.

### Balanced Month calendar upgrade
- Clarify date, today/selected states, task and meal hierarchy, capacity, notes, and rhythm signals without crowding day cells.
- Add direct task check-off and a clearer quick-add/day-details path from the selected day.
- Improve overflow handling and “more” disclosure so dense days remain readable.
- Refine mobile Calendar, Agenda, and List layouts together, preserving drag/drop, filters, daily notes, meals, moon/cycle, habits, and capacity.

## Technical approach
- Reuse `BlockEditor` in a compact journal mode rather than creating a second rich-text engine.
- Add a dedicated, round-trippable external-link-card TipTap node using semantic `data-*` HTML stored inside the existing markdown body.
- Route Planner feed task completion through the existing task toggle action; prevent checkbox clicks from triggering row opening or dragging.
- Keep all changes in presentation/client logic; no database migration or data-model rewrite.
- Record the rich-link storage rule in the project architecture notes and update the roadmap.

## Verification
- Test journal formatting, autosave, close/reopen persistence, and day-rhythm insertion on phone and desktop.
- Test normal links, smart link cards, supported embeds, reload persistence, and blocked-preview fallback.
- Complete and undo tasks from Agenda/List/Month without accidentally opening them.
- Check Month Calendar/Agenda/List at phone and desktop sizes for overflow, keyboard access, drag/drop stability, and runtime errors.
