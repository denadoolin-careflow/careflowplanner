## Scope

Large multi-feature request spanning Inbox composer, Kanban, templates, task editor, completion UX, notifications, and AI daily brief. I'll group into 8 deliverables and ship them in one pass.

### 1. Quick date dropdown on Inbox composer
- Add a "Date" pill next to Area/Tag/Time in `InlineTaskComposer.tsx` with presets: Today, Tomorrow, This Weekend, Next Week, Next Weekend, No date, Pick date…
- Stores `dueDate` override; sticky until cleared. Pick date opens a popover calendar.

### 2. Kanban color-by (tag / project)
- Extend `ProjectKanbanBoard` and `KanbanBoard` with a `colorBy` option ("none" | "tag" | "project") via small select next to group-by.
- Apply a left accent bar / chip color on `KanbanCard` derived from first tag color or project color. Persist in `localStorage` per board.

### 3. Task & Section templates
- New `src/lib/templates.ts` storing user templates in Supabase table `task_templates` (name, kind: 'task' | 'section', payload jsonb).
- New `TemplatePicker` dialog accessible from QuickAdd menu and project section header. "Save as template" action from task/section context menus.
- Apply template = create task(s) with prefilled title/tags/est/priority, or insert a section with N child tasks.

### 4. Person link on task editor
- Add `linked_person_id uuid` column on `tasks` referencing `care_recipients` (or new `people` table if not present — check first; fall back to existing recipients table).
- In `TaskDetailDialog` add "Linked person" combobox.
- Show small avatar/name chip on `KanbanCard` and `TaskRow`.

### 5. Asana-like gradient completion + sound
- In `TaskRow` checkbox: on check, animate a gradient sweep + confetti burst (reuse existing motion). Add `playCompletionChime()` in `src/lib/completion-sound.ts` (WebAudio, like pomodoro chime).
- Setting toggle in Settings → Sounds to mute.

### 6. Notification Center
- New `src/components/notifications/NotificationCenter.tsx` — bell icon in topbar opens sheet listing:
  - Overdue tasks
  - Due today
  - Due tomorrow
  - Upcoming appointments (next 3 days)
  - Today's AI brief (link to brief)
- Browser Notification API opt-in for upcoming task reminders (in-app polling every 60s).

### 7. Daily AI update
- New edge function `ai-daily-update` returning a short narrative summarizing today's plan, overdue, upcoming this week.
- Surfaced inside Notification Center and Today page (new card `DailyAIUpdate`). Cached per-day in localStorage.

### 8. Daily Brief
- New `src/components/today/DailyBrief.tsx` combining weather snapshot, moon phase, today's plan count, top 3, AI update text. Rendered at top of Today page; shareable/printable.

## Technical Notes

- DB migration: `task_templates` table (user-scoped RLS), add `linked_person_id` + optional `people` table only if no recipients table exists.
- Reuse existing `useStore` for tasks; templates go through Supabase directly with realtime invalidation.
- Edge function `ai-daily-update` uses Lovable AI Gateway via existing pattern in `ai-today-guidance`.
- Completion sound mirrors `src/lib/pomodoro-chime.ts` (no assets needed).
- Notification permission requested lazily on first opt-in click.

## Out of scope
- Push notifications (browser-only).
- Cross-device template sharing.
- Editing existing templates inline (delete + recreate).

Confirm and I'll start with the DB migration, then ship the rest in one pass.