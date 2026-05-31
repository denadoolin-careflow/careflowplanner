## Tasks Redesign — Reminders × Things 3 × TickTick × Craft, CareFlow-soft

Shipping the full set in one pass. Visual + behavior + organization land together so the page stops feeling stitched together.

### What's already in place (won't be rebuilt)
- `tasks` table already has `energy`, `icon`, `priority`, `area`, `parent_task_id`, `snoozed_until`, etc. — **no DB schema migration needed**.
- `src/lib/task-icons.ts` already maps keywords → Lucide icons. We'll keep it, expand the rules, and add `inferEnergyFromTitle()` next to it.
- framer-motion is already used in the project (kept for celebrations); `react-swipeable-list` is the new dep for row swipes.

### 1. New row component — `TaskRowV2`
Replace `src/components/cards/TaskRow.tsx` consumers in the main list with a new `TaskRowV2`. Old row stays in place for any non-list usages until we sweep them.

Layout (mobile-first, ~64px tall):
```text
[●]  [icon]  Task title                        [swipe→]
            Area · 🟢 Today · ⭐⭐
            ▓▓▓▓▓░░░  3/5
```
- **No left green border.** Replace with: 6px circular status dot (color = area color); priority shown as 0–3 small filled dots to the right of the title; area as a faint text tag in the metadata row.
- Title is `text-base font-medium text-foreground` — the loud element.
- Metadata row is `text-xs text-muted-foreground` with `·` separators.
- Subtask progress bar only renders when `hasSubs` — animated width transition via Tailwind `transition-all duration-500`.
- Glass card: `bg-card/60 backdrop-blur-sm border border-border/40 rounded-2xl px-4 py-3`, subtle hover lift.
- Tap target ≥44px; whole row taps to expand inline (no modal).

### 2. Smart due date chip — `SmartDueChip`
New `src/components/tasks/SmartDueChip.tsx`. Given `dueDate`, returns:
- Overdue → red dot + "Overdue · 2d"
- Today → green dot + "Today"
- Tomorrow → amber dot + "Tomorrow"
- ≤7d → blue dot + "Fri"
- >7d → muted "Mar 14"
- No date → renders nothing (hides pill entirely).

### 3. Contextual icons + auto energy
- Extend `task-icons.ts` with the explicit set the user listed (📞🚗🏕️🧺🍽️🛒❤️📚🌙).
- Add `inferEnergyFromTitle(title): "high" | "medium" | "low"` using keyword buckets (workout/clean/repair → high; call/email/admin → medium; rest/read/water → low).
- On task create (and via a one-shot "Auto-tag" backfill button in settings), if `energy` is unset, persist the inferred value. User override always wins; stored on the existing `tasks.energy` and `tasks.icon` columns.

### 4. Swipe + hover actions
Install `react-swipeable-list`. Remove the permanent settings cog from rows.
- **Mobile swipe left (trailing):** Complete · Snooze (1d) · Reschedule (opens date popover).
- **Mobile swipe right (leading):** Edit · Priority cycle · Move (area picker).
- **Desktop:** same actions reveal on row hover as a compact icon group on the right; row remains clickable to expand.
- Each action plays existing `haptics` + `completion chime` where appropriate.

### 5. Expand-in-place
Tapping a row toggles an inline expansion (replacing the current modal-only editor for quick edits):
- Notes textarea, subtasks list w/ inline add, attachments thumbnails, voice-note recorder (reuses existing recorder if present, else hidden), comments placeholder, Pomodoro timer button.
- Smooth height animation (Tailwind `data-[state=open]:animate-accordion-down`).
- "Open full editor" link still opens existing `TaskEditor` for power features.

### 6. Today Focus card
New `src/components/tasks/TodayFocusCard.tsx` rendered above the task list on `Today` and `TaskListPage`.
- Pinned focus tasks (1–5). Reuses existing `is_top_three` flag, raised limit to 5 via a derived `isFocus` boolean stored in the same column (no schema change) plus a client cap.
- Sections: **Must Do**, **Progress** (today's completed/total), **Energy** (today's average from new helper).
- Glass card with gentle gradient using existing tokens (`bg-gradient-to-br from-primary/10 via-card/60 to-accent/10`).

### 7. Grouping + views — `TaskListControls`
Extend the existing sort/group menu with new groupings:
- Area · Project · Due Date · Priority · Status · **Energy** · **Time of Day** (🌅 Morning / ☀️ Afternoon / 🌙 Evening using `dayPart`) · Custom Sections.
- Persist last-chosen grouping per-list in localStorage (already a pattern in `ViewOptionsMenu`).

### 8. Energy view
A grouping preset that buckets tasks into 🔥 High / ⚡ Medium / 🌱 Low with collapsible headers and a one-tap "Show me only Low energy" filter chip (useful for low-spoons days).

### 9. Enhanced Quick Capture (`QuickCapturePlus`)
Replace the floating `+` with an expandable speed-dial:
- Task · Note · Voice Note · Habit · Reminder · Project.
- Sticky **Quick Entry Bar** at top of task list — `<input placeholder="Add a task… try 'Call Alex tomorrow 5pm'">` that submits on Enter.
- Natural-language parser: small client util `parseQuickTask()` that extracts date ("tomorrow", "fri", "5pm"), priority ("!", "!!"), area (`#home`), person (`@alex`). No AI call required for the basic case; falls back to plain title if nothing matches.

### 10. Visual + motion polish
- Tokens only (no hardcoded colors). Adds soft gradients via existing CSS variables, larger radii (`rounded-2xl`), 12–16px row spacing.
- Animations:
  - Completion: existing `CompletionBurst` + checkbox scale.
  - Progress bar: width transition + subtle shimmer when crossing 100%.
  - Expand/collapse: accordion keyframes from `tailwind.config.ts`.
  - Swipe reveal: handled by `react-swipeable-list` defaults, themed with our tokens.
- Respect `prefers-reduced-motion` (skip burst + shimmer).

### 11. Accessibility
- All swipe actions have equivalent buttons on the expanded row (keyboard reachable).
- `aria-label` on every icon-only button (status dot button = "Mark complete: <title>").
- Text-size toggle (S/M/L) in Settings → Appearance writes a CSS var consumed by the new row.
- High-contrast mode toggle flips a `data-contrast="high"` attribute that overrides metadata/foreground opacities.

### Files (new)
- `src/components/cards/TaskRowV2.tsx`
- `src/components/tasks/SmartDueChip.tsx`
- `src/components/tasks/TodayFocusCard.tsx`
- `src/components/tasks/QuickCapturePlus.tsx`
- `src/components/tasks/QuickEntryBar.tsx`
- `src/lib/quick-task-parser.ts`
- `src/lib/task-energy.ts` (inferEnergyFromTitle + bucket helpers)

### Files (edited)
- `src/lib/task-icons.ts` — add explicit emoji/icon rules from the spec.
- `src/components/tasks/AllTasksViews.tsx` — render `TaskRowV2`, add Energy & Time-of-Day grouping, mount Quick Entry Bar.
- `src/components/tasks/TaskListControls.tsx` — new grouping options.
- `src/pages/TaskListPage.tsx` & `src/pages/Today.tsx` — mount `TodayFocusCard` and `QuickCapturePlus`.
- `src/components/cards/TaskRow.tsx` — keep but stop importing from main lists.
- `tailwind.config.ts` — small additions: `shimmer` keyframe.
- `src/pages/Settings.tsx` — text size + high-contrast + reduced-motion toggles.

### Out of scope (call out)
- No DB schema changes.
- No new realtime/collab features.
- Voice notes UI mounts the existing recorder if available; if none exists I'll stub a disabled state and flag it for a follow-up rather than build a recorder.

### Risks
- `react-swipeable-list` bundle (~12KB gz) — acceptable.
- `TaskRowV2` will diverge from `TaskRow` briefly; we'll migrate remaining consumers in the same pass where trivial, leaving the old row only for legacy embedded contexts.
