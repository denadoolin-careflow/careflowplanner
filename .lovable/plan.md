# Inbox & Task System — Competitive Research + Redesign Plan

## What the leaders do well

**TickTick** — Single global "+" quick add with NLP date parsing, voice capture, smart lists (Today/Tomorrow/Next 7 Days), Eisenhower matrix view, calendar overlay with drag-to-schedule, Pomodoro built into the task row, habit tracker fused with tasks.

**Things 3** — *Magic Plus* button (drag the + anywhere to insert exactly where you want), Quick Entry with Autofill (captures source link/email automatically), This Evening sub-bucket inside Today, Headings inside projects (lightweight sectioning), checklist nested inside a task, "When" picker that combines date + time-of-day (Morning/Afternoon/Evening) elegantly, slide-to-reveal actions, keyboard-first everywhere.

**Todoist** — One-line Quick Add parses project (`#`), labels (`@`), priority (`p1`), assignee (`+`), date (`tomorrow 5pm`), duration (`for 30min`), recurrence (`every Monday`); tokens highlight inline as you type so the user *sees* what's being parsed. Capture from text/image (OCR). Filters as saved smart queries. Board / list / calendar toggle per project.

**Asana** — My Tasks with sortable sections (Recently assigned → Today → Upcoming → Later), rules that auto-route incoming tasks to a section, single Inbox for notifications with bookmark/archive/filter, multi-home (one task in many projects).

**Craft** — Tasks surface from inside documents into a central hub; each task keeps a backlink to source doc; daily-note-driven capture; calendar fused with task list.

## Recommendations for CareFlow Inbox + Tasks

Grouped by impact. Implementation is iterative — each block is independently shippable.

### 1. Unify capture around the NLP bar (Todoist-style token chips)
- Keep the single text box, but render parsed tokens as **inline pills** while typing (e.g. typing "Call mom tomorrow 5pm #family !high" shows `tomorrow 5pm`, `#family`, `!high` as colored chips inline).
- Move the hidden Categories/Tags/Schedule overrides into a single **"Details" drawer** below the bar that opens only when the user taps a chevron — replaces the four separate toggles.
- Add a **paste / image OCR** affordance (Todoist parity) wired to existing `ai-capture-assistant`.

### 2. "When" picker that combines date + time-of-day (Things 3)
- Replace the separate date input + day-part chip with one popover: Today / This Evening / Tomorrow / Next Week / Pick a date, each row has a small Morning/Afternoon/Evening selector.
- Auto-detect already exists; surface it as a subtle "Suggested: Afternoon" hint inside the popover.

### 3. Magic Plus / drag-to-position (Things 3)
- On desktop, allow the floating FAB (already lg+) to be dragged onto a specific section of a list and drop to create a task pre-slotted into that group (Today, This Evening, a project, an area).

### 4. Sectioned Inbox triage view (Asana My Tasks)
- Replace the flat inbox with auto-sections: **Just captured · Needs a date · Needs a project · Ready for Today**.
- One-tap "Process all" steps through each item full-screen with swipe actions: ← Snooze · ↓ Move to project · → Schedule (Tinder-for-triage). Existing `ProcessInboxDialog` is the foundation.

### 5. Task row interaction polish (Things 3 + TickTick)
- Swipe-right on mobile = complete, swipe-left = reveal Schedule / Snooze / Delete (matches the desktop `TaskHoverActions` rail).
- Long-press = enter multi-select (already partially built via `TaskSelectionProvider`).
- Inline subtasks: typing `- ` on a new line inside the task title editor creates a checklist item (Things behavior).

### 6. Smart views & saved filters (Todoist filters + TickTick smart lists)
- Add a **Filters** rail in the sidebar with built-ins: Today, This Evening, Next 7 Days, No date, No project, Waiting on, High priority, Matches my energy (last one already exists as a toggle — promote it).
- Allow saving the current `TaskListControls` state as a named filter.

### 7. Calendar / time-blocking overlay (TickTick + Craft)
- In Today/Upcoming, add a toggleable right-rail timeline showing day-part bands (Morning/Afternoon/Evening) with tasks drag-droppable onto times. `UnscheduledTasksRail` already exists — pair it with a time grid.

### 8. Source-anchored capture (Craft + Things Autofill)
- When capturing from a Note or Daily Note, automatically attach a backlink chip on the task so completing it can jump back to context. Reuses `note-links.ts`.

### 9. Visual + density refresh
- Tighten the Inbox header (current basket illustration + chips + bar stack feels tall on a 707px viewport). Collapse the illustration to a small mark when there are >0 items.
- Move the kind chips (Task/Home/Care/Meal/Note/Connect/Commute) into a **segmented icon strip** (28px tall, icon-only with tooltip) instead of pills — saves a row.
- Show the active kind's accent color as a 2px left border on the input — silent confirmation without using vertical space.

### 10. Empty & success states
- Things-style celebratory empty inbox ("Inbox zero — nicely done") instead of the current basket alone.
- After completing the last task of the day, animate a small Today-complete moment (existing `confetti.ts`).

## Suggested build order

1. **Quick Add token chips + collapsible Details drawer** (#1) — biggest perceived-quality jump, replaces today's stacked override row.
2. **Combined When picker** (#2) — small, self-contained.
3. **Sectioned Inbox + Process flow polish** (#4) — restructures the page.
4. **Mobile swipe actions on TaskRow** (#5).
5. **Saved filters sidebar** (#6).
6. **Time-block overlay** (#7).
7. **Magic Plus drag** (#3), **source backlinks** (#8), **density pass** (#9), **empty states** (#10).

## Technical notes

- NLP token highlighting: extend `parseTaskInput` to return span ranges; render with a transparent overlay div positioned over the `<input>` (common pattern; or switch the field to a `contentEditable` div).
- Sectioned inbox: add a `triageBucket` derivation in `task-grouping.ts` based on `(inbox, dueDate, projectId, area)`.
- When picker: new `<WhenPopover>` consuming `dayPart` + `dueDate` together; replace the two existing inline pickers in `Inbox.tsx`.
- Swipe actions: use `framer-motion` drag with snap thresholds; already a dep.
- Saved filters: persist via existing `loadPrefs/savePrefs` keyed by `filter:<name>`.
- All changes stay in `src/pages/Inbox.tsx`, `src/components/tasks/*`, `src/components/cards/TaskRow.tsx`, `src/lib/nlp-task.ts`, `src/lib/task-grouping.ts`. No schema changes required.

## Open questions before building

- Do you want to ship all 10 in sequence, or pick a starting subset (recommended: 1, 2, 4, 5)?
- For the token-chip NLP bar, should we keep a plain `<input>` with an overlay, or upgrade to a `contentEditable` editor (richer but heavier)?
- Should saved filters live in the left sidebar, or as a dropdown above the task list?
