# CareFlow Upgrade Plan

A large, multi-area upgrade. Grouped into 7 milestones — I'll ship them in order, each verifiable on its own. Aesthetic preserved: dark plum + gold, soft glow, rounded cozy cards.

## 1. Data model (one migration)

New tables / columns to support editable, schedulable, AI-generated checklists with subtasks and templates.

- `reset_checklists` — id, user_id, name, kind (`weekly`|`deep`|`quick`|`low_energy`|`custom`), week_start (nullable, for "this week" instances), is_template, sort_order
- `reset_items` — id, user_id, checklist_id, parent_id (subtasks), title, notes, category/zone, day_of_week (0-6, nullable), time_block (`morning`|`afternoon`|`evening`, nullable), start_time, est_minutes, recurrence_type, recurrence_days, due_date, done, sort_order
- Extend `cleaning_tasks` with `parent_id`, `time_block`, `start_time`, `est_minutes`, `category` (room), `subtasks` support via parent_id
- All RLS: `auth.uid() = user_id`

## 2. Weekly Reset (Week page) — fully editable

- New component `ChecklistTree` with:
  - inline edit (double-click), add/delete/duplicate, drag-reorder via `@dnd-kit`
  - nested subtasks (collapsible), checkable
  - per-item popover: notes, category, day, time block, start time, duration, recurrence, due date
- "Save as template" + "Load template" actions
- Auto-persist on every change (debounced)

## 3. Time blocking + drag-to-day

- Week page adds a 7-column × 3-row (morning/afternoon/evening) grid view toggle
- Drag reset items between day/block cells (dnd-kit), soft animated transitions
- Visual badges on items showing assigned day + block + time

## 4. Home Reset page — full editability + AI

- Replace static cleaning list with `ChecklistTree` per zone/cadence
- Sticky "Add Cleaning Task" FAB with quick form
- AI panel with 4 buttons: Generate Weekly / Deep / Quick / Low-Energy Reset
- New edge function `ai-cleaning-checklist` (Lovable AI, gemini-3-flash-preview, structured tool output) takes home size, family size, energy, time, caregiving load → returns nested checklist (zone, items, subtasks, est minutes, time block)
- Result is inserted as a new editable checklist the user can keep/discard

## 5. Focus timer on every checklist item

- Each item gets a ⏱ button → quick picker (5/10/15/25/custom) → starts existing pomodoro store with item title
- Reuses existing `FloatingPomodoro` + `FullScreenFocus` (already pinned + has overlay + completion chime)
- Add gentle confetti/glow celebration on session end

## 6. Meal page reset

- "Reset Meal Plan" button in Meals header
- AlertDialog confirm → delete `meals` for current week, delete `grocery_items` where `source_meal_id` belongs to that week (favorites/pantry untouched)
- After reset: offer "Generate New Meal Plan" (calls existing `ai-meal-plan` function)

## 7. Week page date picker + navigation

- Header: « prev | week range + month (click → mini calendar popover) | next » | "This week"
- All week-scoped queries (tasks, blocks, checklists, habits) keyed off selected `weekStart` state
- Smooth slide/fade transition on week change (framer-motion)

## Technical notes

- Add `@dnd-kit/core` + `@dnd-kit/sortable` (drag-and-drop)
- Add `framer-motion` if not present (already used in FullScreenFocus)
- New files (high level):
  - `src/components/reset/ChecklistTree.tsx`, `ChecklistItemRow.tsx`, `ItemDetailsPopover.tsx`
  - `src/components/reset/ScheduleGrid.tsx` (7×3 day/block grid)
  - `src/components/reset/AIGenerateMenu.tsx`
  - `src/components/reset/QuickTimerMenu.tsx`
  - `src/components/week/WeekNavigator.tsx`
  - `src/lib/reset-checklists.ts` (CRUD hook)
  - `supabase/functions/ai-cleaning-checklist/index.ts`
- Edits: `src/pages/Week.tsx`, `src/pages/HomeReset.tsx`, `src/pages/Meals.tsx`
- Auto-persist with debounced supabase upserts; optimistic local state

## Order of delivery in this run

1. Migration (await approval)
2. Install dnd-kit
3. Reset checklist core (ChecklistTree + hook) + wire into Week + HomeReset
4. Schedule grid + drag-to-day
5. AI cleaning edge function + buttons
6. Quick timer menu on items
7. Meal reset
8. Week navigator

I'll keep the dark plum/gold tokens already in `index.css`; no design-system changes needed.
