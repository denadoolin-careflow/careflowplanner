# Notes: sturdier toggles, a richer Notebook, and a live planner panel on period notes

## What you'll get

### 1. Toggles that stay put
- **Headings**: the fold caret moves from the far-left gutter (currently at -56px, easy to miss and impossible on mobile) to a fixed slot just left of the heading text. It fades in on hover and stays fully visible while the section is collapsed, so you always know something is hidden. Clicking it hides everything under the heading until the next heading of the same or higher level (this already works; only the caret placement/visibility changes).
- **Every `-` bullet is a toggle**: any bullet item shows the same caret on hover. If it has nested lines, the caret folds them. If it has none, clicking the caret turns the bullet into a toggle block (same as pressing Tab today) so you can start nesting text under it right away. Checklist items keep their checkbox and are not affected.
- Fold state keeps saving with the note (existing `data-collapsed` / `<details open>` attributes).

### 2. Notebook view: expand and edit in place
- Each month / week / day row gets a **caret** on the left. Tapping the row title still opens the note page; tapping the caret expands the note **inline** under the row.
- The expanded area is the real editor (same one as the note page), with autosave and the save-status pill, so you can write a day's or week's note without leaving the Notebook. Blank periods show a "Start with template…" chooser inline.
- Under the expanded day/week you also see that period's **planner summary** (see section 3) so the note and the plan sit together.
- **Hover preview** on any Notebook date row (desktop): a card with the first lines of the note, the count of tasks / events / meals that day, and cosmic events. Uses the existing hover-card pattern.

### 3. "On the planner" panel on daily / weekly / monthly notes
Each day in the panel becomes a mini day plan:
- **Grouped by time of day**: All day · Morning (5–12) · Afternoon (12–17) · Evening (17–22), using the same ranges as the planner. Each task shows its scheduled time.
- **Meals planned** for the day (Breakfast / Lunch / Dinner / Snack / Drink) from the planner meals, shown as a compact line with the meal name; tapping opens the meal editor.
- **Tasks look like planner tasks**: a checkbox to mark done (with the little pop animation and undo toast), title, time chip, area color. Same row component the planner uses.
- **Add a task to a day**: an "Add to this day…" line under each day (and under each time-of-day group) creates a task due that date, at the group's default time (9:00 / 13:00 / 18:00, or no time for All day), and links it to the note.
- **Hover previews** on tasks, events and cosmic events: a small card with the details. For cosmic events this shows the glyph, title and the subtitle/meaning text; for tasks the notes, area and time; for events the time and location.

### 4. Checklists in a note become tasks
- Any checkbox line in a daily / weekly / monthly note gets a small "→ Task" action on hover (and in the toolbar's existing checklist menu). It creates a real task **due on that note's date** (for weekly/monthly notes, a picker offers the days in that span), links it back to the note, and turns the line into a task chip so it isn't created twice.
- A "Send all unchecked to planner" action at the top of the planner panel does this for every open checkbox in the note.
- Checking the chip in the note or the task in the planner keeps the two in sync (task done ⇄ box checked) — best effort, on load and on change.

---

## Technical details

**Toggle carets (BlockEditor.tsx + index.css)**
- Replace the `h1/h2/h3::before` gutter rule (left: -56px) with a caret positioned at `left: -1.6rem` inside the heading's box, `opacity: 0` → `0.8` on `:hover`/`:focus-within`, `opacity: 1` + rotated when `[data-collapsed="true"]`. Update the click hit-zone in `handleClick` (currently `dx >= -72 && dx <= -24`) to the new range; on coarse pointers widen to 40px.
- Add the same caret rule to `li:not([data-type="taskItem"])` (replacing the `::marker` color trick). Click in the caret zone: if the item has a nested `ul/ol`, flip the `collapsed` attr via `setFoldAttr`; otherwise run the existing Tab-to-toggle conversion path (extract into a `convertListItemToDetails(pos)` helper used by both the keymap and the click).
- Reuse the existing `cfFoldAttributes` global attribute; no schema or serializer changes.

**Notebook inline editing (NotesNotebookView.tsx)**
- Row gets `expanded` state (Set of `kind:key`, kept in `sessionStorage`). Expanded row renders `<BlockEditor body onChange noteId showFooter={false} toolbarPlacement="top" minHeight="160px">` wrapped by a small `InlineNoteEditor` that reuses the drafts + debounced-save logic already in `NoteDetail.tsx` (extract that into `src/lib/notes/useNoteAutosave.ts` and use it in both places) and shows `SaveStatus`.
- Blank rows: inline template chooser using `TEMPLATES_BY_KIND[kind]` and `openPeriodNoteWithTemplate`, then expand.
- Hover preview: new `PeriodNotePreview.tsx` (HoverCard) using `NoteMarkdownPreview` + a `useDayPlanSummary(iso)` hook (below).

**Planner panel (PeriodContextPanel.tsx → refactor)**
- New `src/lib/planner/day-plan.ts`: `useDayPlan(iso)` returns `{ allDay, morning, afternoon, evening, meals, events, cosmic }` using the same `hmToMin` ranges as `PlannerPeriodList` and `state.meals` filtered by date. Cosmic entries carry the full `CosmicEvent` (extend `buildCosmicCalendarIndex` items with `subtitle`, `tone`, `kind`).
- New `PeriodDayPlan.tsx` renders one day: groups, `PlannerTaskRow` (compact) for tasks, meal line opening `WeekMealDialog`, `Add to this day…` input calling `addTask({ title, dueDate, startTime, area: "Personal" })` then `linkNote(noteId, "task", id)`.
- Hover cards: `TaskPeek`, `EventPeek`, `CosmicPeek` (small components in `src/components/notes/PlannerPeeks.tsx`) using the shadcn HoverCard; on touch they open on long-press via the existing `QuickPeek` pattern.

**Checklist → task (BlockEditor.tsx)**
- Generalise `promoteTaskItemToTask` to accept `{ dueDate }` and to link the note (`linkNote(noteId, "task", task.id)`), and to store the task id on the chip (`data-task-id`). Expose `promoteAllUnchecked(dueDate)`.
- `NoteDetail.tsx` passes `defaultDueDate` (note date for daily; picker for weekly/monthly) to `BlockEditor`; the planner panel gets a "Send unchecked to planner" button wired to `promoteAllUnchecked`.
- Sync: on note load and on task change, toggle `data-checked` on chips whose `data-task-id` matches a done task; checking a chip calls `updateTask(id, { done })`.

**Files touched**
- `src/components/notes/BlockEditor.tsx`, `src/index.css`
- `src/components/notes/NotesNotebookView.tsx`, new `InlineNoteEditor.tsx`, `PeriodNotePreview.tsx`, `PlannerPeeks.tsx`, `PeriodDayPlan.tsx`
- `src/components/notes/PeriodContextPanel.tsx`, `src/pages/NoteDetail.tsx`
- new `src/lib/notes/useNoteAutosave.ts`, `src/lib/planner/day-plan.ts`; `src/lib/cosmic/calendar-feed.ts`
- No database changes: tasks, meals, notes and note links already exist.

**Verification**
- Type-check; Playwright (authenticated) run: fold a heading and a bullet via caret, expand a Notebook day and type (check save pill), add a task from the panel and tick it, promote a checkbox and confirm it appears on the planner for that date, hover a cosmic event and confirm the preview text.
