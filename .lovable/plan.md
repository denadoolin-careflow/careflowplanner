# One-pass plan: Inbox, Today header, quick-add wiring, Home Reset overhaul

Ships as a single milestone. Grouped by surface for review; implementation order at the bottom.

---

## 1. Inbox (`/inbox`)

- **Wrap long titles** in Today and Upcoming sections. Add `break-words whitespace-normal` (and remove any `truncate`) on the title node in `TaskRow` when `variant="card"`, plus on the inbox row container.
- **"Needs a date" / "Ready to plan" chips**: retint for dark theme. Replace hardcoded amber/emerald bg with semantic tokens (`bg-warning/15 text-warning-foreground`, `bg-primary/15 text-primary`) sourced from `index.css`, so contrast holds in both modes.
- **Mobile Today dropdown in header**: on the Inbox page header, add a collapsible "Today" summary (count + first 3 titles) visible only `md:hidden`, using `Collapsible` from shadcn. Persist open/closed in `localStorage`.

## 2. Today page header quick-view

Extend the header quick-add popover (currently task-only) to accept:
- **Meal** — reuses `addMeal` with slot picker (Breakfast/Lunch/Dinner/Snack), auto-linked to today.
- **Home & Cleaning task** — writes to `cleaning_tasks` OR creates a `reset_items` row tagged `Home`; picker chooses.

Implemented as a segmented control inside the popover; the existing task path stays default.

## 3. Weather widget

- Remove the standalone C/F toggle at the top of Today (delete the `<UnitToggle />` mount above the widget in `Today.tsx`).
- Move `UnitToggle` inside the weather widget header (top-right of the widget card). Keep the same `useTempUnit` store — no data migration.

## 4. Quick-add wiring (bottom sheet actions)

Currently the bottom sheet has buttons that no-op or misroute.

- **Photo**: opens native camera picker (`<input type="file" accept="image/*" capture="environment">`), uploads to `attachments` bucket, creates a Task with the photo attached as a note-image.
- **PDF**: file picker (`accept="application/pdf"`), uploads to `attachments`, creates a Task linked to the PDF; triggers existing `ai-pdf-summary` in background to prefill notes.
- **Checklist**: opens a lightweight modal to enter title + newline-separated items; creates a Task with `subtasks[]` populated (or reset_item children if the user picks "Home").
- **Note**: navigates to `/notes/new` (route-level page that pre-focuses the editor). If that route doesn't exist yet, add it as a thin wrapper around the existing `NotesFiles` editor.
- **Voice**: replaces current Carey redirect. Opens a `VoiceCaptureSheet`:
  1. Records via existing `use-audio-recorder` (WAV).
  2. POSTs to a new edge function `ai-voice-quickadd` that calls Lovable AI STT (`openai/gpt-4o-mini-transcribe`) then reuses the same NLP that powers `InboxCapture` (chrono-node + `detectKind`) to auto-create the right item.
  3. Shows preview toast with undo.

## 5. Home Reset page (`/home-reset`)

### Layout
- **Move "Peaceful home starts with one small reset" hero blurb to the very top** of the page (above Focus timer strip). Rest of the sections shift down.

### Kanban mode
- Add view switch `List | Kanban` next to existing `By Room / Routines / Zones` toggles. Kanban columns = **To do / Scheduled / In progress / Done**, populated from reset_items status/scheduled fields.
- Uses `@dnd-kit/core` (already installed via meals DnD). Drag between columns updates `done`/`due_date`.

### Checklist items = draggable, schedulable tasks
- Each checklist row gets a drag handle (HTML5 drag, like `InboxSortableRow`).
- Drop targets: (a) Kanban columns, (b) TimeBlockBoard slots (Morning/Afternoon/Evening), (c) an "Add to calendar" chip that opens ScheduleTaskPopover.
- **On schedule**, follow the confirmed model: promote the reset_item to a real `tasks` row via the existing `sync_reset_item_to_task` trigger (already writes `linked_task_id`), then set `due_date` + `time_block` on both records. Completion stays two-way synced by the existing triggers.

### Per-zone header controls
- Add **Schedule** button (opens ScheduleTaskPopover applied to all incomplete items in the zone).
- Add **Time-of-day** button (sets `time_block` for all incomplete items — Morning/Afternoon/Evening).
- Existing Reset zone + timer buttons stay.

### Cleaning supplies checklist
- New "Supplies" tab inside each zone card. Backed by a new column `reset_checklists.supplies jsonb` (array of `{name, have: boolean}`). Editable inline; "Add to grocery list" button pushes missing items into the active grocery list via `addGroceryItem`.

### Weekly status / patterns
- **Summary chip on Home Reset**: small card under the toolbar — "You reset Kitchen 3× this week · usually Sunday evenings" — computed client-side from `reset_history`.
- **Full view on `/insights`**: new `ResetPatternsCard` — 7-day heatmap per zone, most-completed zones, common time-of-day. Link out from the chip.

### Focus timer improvements
- **Next-up dropdown** on `FocusTimerStrip`: dropdown showing the next 5 incomplete items across the active zone; picking one sets it as the focus task.
- **Create/pick/edit task from timer popup**: add a "+ New task" and "Edit" affordance inside the timer control. Reuses `openTaskEditor` for edit; create uses inline input that writes to `reset_items` (or `tasks` if not in a zone).

### 3-dot menu → edit + reorder
- Replace current 3-dot menu on checklist rows with an inline edit-title action, a "Move to zone…" submenu, and a drag handle for manual reorder (persists via `reset_items.sort_order`).

### Quick-add per time-of-day
- Each block in `TimeBlockBoard` gets an inline `+ Add task` input. New tasks default to that time_block and today's date. Drag between blocks to reassign time_block.

---

## Technical details

### Edge function
- `supabase/functions/ai-voice-quickadd/index.ts` — multipart audio in, returns `{ transcript, parsed: { kind, title, date?, time? } }`. Client then calls the same store actions as InboxCapture. Uses `LOVABLE_API_KEY` + `openai/gpt-4o-mini-transcribe`. CORS + Zod validation as per edge-function rules.

### Schema migrations (single migration)
```sql
ALTER TABLE public.reset_items
  ADD COLUMN IF NOT EXISTS time_block text CHECK (time_block IN ('morning','afternoon','evening')),
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'todo'
    CHECK (status IN ('todo','scheduled','in_progress','done'));
ALTER TABLE public.reset_checklists
  ADD COLUMN IF NOT EXISTS supplies jsonb NOT NULL DEFAULT '[]'::jsonb;
```
No new tables, so no new GRANT block. Existing RLS on `reset_items`/`reset_checklists` covers new columns.

### New / edited files

Add:
- `src/components/reset/redesign/KanbanBoard.tsx`
- `src/components/reset/redesign/SuppliesChecklist.tsx`
- `src/components/reset/redesign/ZonePatternChip.tsx`
- `src/components/reset/redesign/FocusNextUp.tsx`
- `src/components/insights/ResetPatternsCard.tsx`
- `src/components/quickadd/PhotoCapture.tsx`
- `src/components/quickadd/PdfCapture.tsx`
- `src/components/quickadd/ChecklistCapture.tsx`
- `src/components/quickadd/VoiceCaptureSheet.tsx`
- `src/pages/NoteNew.tsx` (thin wrapper if not already routed)
- `supabase/functions/ai-voice-quickadd/index.ts`

Edit:
- `src/pages/Inbox.tsx` (mobile header dropdown, chip retint, wrap classes)
- `src/components/cards/TaskRow.tsx` (wrap title in card variant)
- `src/pages/Today.tsx` (drop top UnitToggle, extend header quick-add)
- Weather widget component (embed `UnitToggle`)
- `src/pages/HomeReset.tsx` (hero blurb move, view toggle, kanban mount, supplies, patterns chip)
- `src/components/reset/redesign/RoomCard.tsx` (schedule/time-of-day header buttons, inline edit, drag handles, supplies tab)
- `src/components/reset/redesign/FocusTimerStrip.tsx` (next-up dropdown, create/edit)
- `src/components/reset/redesign/TimeBlockBoard.tsx` (quick-add input, DnD drop targets)
- `src/components/reset/redesign/ResetToolbar.tsx` (List/Kanban toggle)
- `src/pages/Insights.tsx` (mount `ResetPatternsCard`)
- Quick-add bottom sheet component (wire the five buttons)
- `src/App.tsx` (register `/notes/new` if missing)

### Testing
- Verify inbox text wraps on 375-wide viewport via Playwright screenshot.
- Voice quick-add: record 2s of silence → expect validation error surfaced, not empty task.
- DnD from RoomCard row → Morning block updates `time_block` and creates linked task.
- Kanban drop → Done column sets `reset_items.done = true` and syncs the linked task.

---

## Implementation order

1. DB migration (adds columns needed by later steps).
2. Voice edge function + client sheet.
3. Quick-add wiring for photo/pdf/checklist/note.
4. Inbox polish + Today header + weather unit relocation.
5. Home Reset: hero move, header buttons, inline edit, quick-add per time block.
6. Kanban view + DnD scheduling.
7. Supplies checklist.
8. Focus timer next-up + create/edit.
9. Weekly pattern chip + Insights card.
10. Manual + Playwright verification.
