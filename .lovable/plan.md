## Goals
Five connected improvements to the Inbox / Task system.

---

### 1. Fix "Capture" + Enter reliability
**Problem:** Pressing Enter after typing sometimes doesn't fire because the recipient-suggestion strip / kind chips / area override controls steal focus and `submitCapture` short-circuits (`captureKind` reset, blur firing before submit).

**Fix** in `src/pages/Inbox.tsx`:
- In the input's `onKeyDown`, capture the current `draft`/`captureKind`/`overrideDue` into local consts before awaiting, and call `submitCapture` synchronously with `e.preventDefault()` + `e.stopPropagation()`.
- Make `submitCapture` accept a `raw` argument so the Enter handler passes the trimmed value directly, bypassing any race with `setDraft("")` from a blur.
- Defer `handleCaptureBlur`'s "hide controls" with a `requestAnimationFrame` guard so it doesn't run between keydown and submit.
- Add a button-level guard: keep `onMouseDown`/`onTouchStart` (already present) but also bind `onPointerDown` to cover stylus / hybrid devices.

---

### 2. Sync Inbox tasks → Notification Center
In `src/components/notifications/NotificationCenter.tsx`:
- Add a new "Inbox" bucket: tasks where `t.inbox === true && !t.dueDate && !t.done && !t.parentTaskId`, deduped against dated buckets.
- Render the bucket above "Overdue" with an `InboxIcon` and the same row UI as other tasks.
- Wire the row's title click to `openTaskEditor(t.id)` (already imported but unused) and close the popover.
- Include inbox count in the bell `count` so the badge reflects unprocessed items.
- Add per-row "Schedule today / tomorrow" via the existing `ReschedulePopover` (already works because it just sets `dueDate`).

---

### 3. Focused Task Editor (sidebar hidden, centered)
In `src/components/tasks/TaskEditor.tsx`:
- When the editor opens on desktop, dispatch a `careflow:focus-mode` event that `Sidebar.tsx` listens for and collapses (restoring previous state on close).
- Widen the desktop `DialogContent` to `max-w-3xl`, center it with extra top padding, and make the notes/subtasks column the primary area (full width below the title; metadata moves to a slim collapsible drawer on the right).
- Add a "Focus" toggle in the editor header so users can opt out.
- Persist focus-mode preference in `localStorage` (`careflow:editor-focus-mode`).

`src/components/layout/Sidebar.tsx`:
- Subscribe to `careflow:focus-mode` (`{ on: boolean }`); when `on`, collapse and remember prior state; when `off`, restore.

---

### 4. New top-of-Inbox sections: Today · Upcoming · Needs scheduling
In `src/pages/Inbox.tsx`, add a new `InboxOverview` block above "Held in your inbox":
- **Today** — tasks where `dueDate === today` OR `appointments` occurring today (uses `apptOccursOn`). Groups by morning/afternoon/evening via existing `dayPart`.
- **Upcoming** — next 7 days (tasks + appointments + birthdays + holidays from store), grouped by date.
- **Needs scheduling** — inbox tasks with no `dueDate` (limit 8, "View all" jumps to "Held in your inbox" anchor).
- Each row reuses `TaskRow` for tasks and a compact `EventRow` for appointments/events. Click opens `openTaskEditor` or the appointment editor (`openAppointmentEditor` if present, else navigates to `/calendar?appt=`).
- Section headers show counts; sections collapse with state persisted in `localStorage` (`careflow:inbox-overview`).

---

### 5. Follow-up reminders on tasks
Schema + types:
- Add `follow_up_at timestamptz` and `follow_up_note text` columns to `public.tasks` (migration with appropriate GRANTs already in place — table exists).
- Extend `Task` in `src/lib/types.ts` with `followUpAt?: string; followUpNote?: string;`.
- Update store mappers (`src/lib/store.ts` + Supabase row converters) to read/write the new fields.

UI:
- New `FollowUpPopover` component (in `src/components/tasks/FollowUpPopover.tsx`) with presets: "In 1 hour", "Tonight", "Tomorrow morning", "In 3 days", "Next week", custom date+time.
- Integrate in `TaskEditor` (metadata column) and as a small bell icon in `TaskRow` hover controls.
- When `followUpAt <= now()` and the task is still active, surface it in the Notification Center as a new "Follow up" section (similar styling to "Overdue", icon `BellRing`); dismissing clears `followUpAt`.
- Toasts on set/clear; haptics on set.

---

## Technical notes

```text
Inbox page
├── InboxOverview (new)              ← Today / Upcoming / Needs scheduling
├── Quick Capture (Enter fix)
└── Held in your inbox (existing buckets)

NotificationCenter
├── Cycle
├── On this day
├── Inbox (new — undated inbox tasks)
├── Follow up (new — followUpAt due)
├── Overdue / Today / Tomorrow / Upcoming
└── Appointments today
```

Files touched:
- `src/pages/Inbox.tsx` — Enter fix, new overview section
- `src/components/notifications/NotificationCenter.tsx` — Inbox + Follow-up buckets, editor open on click
- `src/components/tasks/TaskEditor.tsx` — focus mode, wider centered layout
- `src/components/layout/Sidebar.tsx` — listen for focus-mode collapse
- `src/components/tasks/FollowUpPopover.tsx` — new
- `src/components/cards/TaskRow.tsx` — follow-up bell trigger
- `src/lib/types.ts`, `src/lib/store.ts` — `followUpAt` field
- Supabase migration — add `follow_up_at`, `follow_up_note` to `tasks`

No design-system tokens are hardcoded; all uses semantic atmosphere colors.
