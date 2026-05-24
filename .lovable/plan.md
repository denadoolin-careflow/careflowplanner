# Areas Upgrade Plan

I'll ship this in 4 focused parts. Each part is independently shippable so you can preview as we go.

---

## Part 1 — Area page polish & project reordering

**Files**: `src/pages/AreaPage.tsx`, `src/components/areas/*`, `src/lib/store.tsx`

- Remove the active/selected highlight on Area cards/rows (find the `ring`/`bg-primary/10` styling tied to selected state and drop it).
- Drag-and-drop project reordering inside an Area using `@dnd-kit/sortable` (already a common stack pattern). Persist via `projects.sortOrder` (already exists in `Project` type).
- View switcher above projects: **List | Board | Grid**, with controls:
  - **Sort**: name, deadline, recently updated, manual (sortOrder)
  - **Group**: none, status, deadline bucket (this week / month / later), favorites
  - **Filter**: status (active/paused/done/someday), favorites only, has deadline
- Persist view prefs per area in `localStorage` (key: `area-view:{areaId}`).

## Part 2 — Auto task icons (replace emoji field)

**Files**: `src/lib/task-icons.ts` (new), `src/components/cards/TaskRow.tsx`, `src/components/tasks/*` editors

- New `inferTaskIcon(title, notes?)` using a keyword → Lucide map (~80 mappings: phone/call→Phone, buy/grocery→ShoppingCart, doctor/appt→Stethoscope, email→Mail, clean→Sparkles, pay/bill→CreditCard, gym/workout→Dumbbell, etc.). Falls back to `CheckSquare`.
- Remove emoji input from task editors. `task.icon` still stored but now optional override.
- `TaskRow` renders: `task.icon` (manual override, looked up via existing lucide map) → else `inferTaskIcon(title)` → else default.
- Add a small icon-override popover for users who want to pin a specific icon.

## Part 3 — Trello-style Kanban + Unsplash cover images

**Files**: `src/components/tasks/KanbanBoard.tsx` (rewrite), `src/components/common/CoverImagePicker.tsx` (new), `src/lib/covers.ts` (new), migration for `cover_url` columns.

Kanban redesign:
- Card visuals: cover image at top (if set), title, labels (tags as colored chips), due date pill, icon, avatar/recipient, subtask progress bar.
- Vertical drag-reorder within a column + cross-column drag (already drag works between columns; add `sortOrder` write-back within a column).
- "Add column" disabled (columns are semantic: Inbox/Today/Upcoming/Waiting/Done) — but allow collapsing columns.
- Inline card open → side sheet with full editor.

Cover images (free Unsplash via `source.unsplash.com`):
- `CoverImagePicker` dialog: keyword search input → grid of `https://source.unsplash.com/400x240/?{keyword}&sig={i}` thumbnails (6 results, regenerate button), plus "Remove cover" and "Paste URL".
- Apply to: tasks, projects, notes, areas. Add `cover_url text` column to each of these tables via migration.

## Part 4 — Area Hub

**Files**: `src/pages/AreaPage.tsx` (new "Hub" tab), `src/components/areas/AreaHub.tsx` (new), `src/components/areas/AreaResourceEditor.tsx` (new), migration.

- New tab in AreaPage: **Hub**. Sections:
  - **Pinned Resources** — custom links/files/embeds (new `area_resources` table: `id, user_id, area_name, kind (link|file|embed|note_ref), title, url, icon, color, sort_order`).
  - **Linked Goals** — goals where `category` matches area or manually linked (use existing `goals`).
  - **Linked Habits** — habits filtered by area tag.
  - **Linked Notes & Journal** — notes/journal entries tagged with area name.
  - **Projects** — quick list with covers.
- Resources support drag reorder, edit, delete, open-in-new-tab.

---

## Technical notes

- **DnD library**: use `@dnd-kit/core` + `@dnd-kit/sortable` (lightweight, mobile-friendly).
- **Migrations** (one combined migration):
  - `ALTER TABLE tasks ADD COLUMN cover_url text;`
  - `ALTER TABLE projects ADD COLUMN cover_url text;`
  - `ALTER TABLE areas ADD COLUMN cover_url text;`
  - `ALTER TABLE home_notes ADD COLUMN cover_url text;`
  - `CREATE TABLE area_resources (...)` with RLS `auth.uid() = user_id`.
- **Type sync**: after migration, `src/integrations/supabase/types.ts` regenerates automatically.
- **Backward compat**: keep `task.icon` (manual override wins over inference).

---

## Suggested order

I'll ship **Part 1 first**, then pause for you to preview. Reply "next" to continue to Part 2, or steer me if priorities shift.
