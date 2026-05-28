## Goal

Add a smart, cycle-aware notification layer that helps the user plan in rhythm with her menstrual cycle — gently warning when she schedules heavy commitments during low-energy phases (especially menstrual), and surfacing phase-aligned planning hints throughout the week.

## Behavior

### 1. Inline "phase guard" when scheduling
When the user creates or reschedules a task/appointment whose `dueDate` falls in a non-ideal phase for its type, show a soft toast (sonner) with a one-tap **"Pick a better day"** action:

- Menstrual phase + commitment-style task (meeting, appointment, deadline, "high-effort" tag, or `energyRequired: high`) → 
  > 🌑 Menstrual phase on Tue Jun 2 — your body is asking for rest. Consider Fri (follicular) instead.
  Actions: **Move to suggested day** · **Keep anyway** · **Don't warn again today**
- Luteal + brand-new/creative-launch task → suggest follicular/ovulatory.
- Ovulatory + admin/solo-deep-work → gentle nudge that this is a "connect & ship" window.

The warning is advisory only — never blocks the save. Dismissals are remembered per-day via the existing `dismissed-notifications` store.

### 2. Phase-stage notifications (NotificationCenter section)
Add a new **"Cyclical rhythm"** section to `NotificationCenter.tsx`, above "Today":

- **Phase entry** (first day of a new phase): one card with glyph, archetype, invitation, affirmation from `PHASE_META`, and 2–3 planning hints pulled from `phase.planningHints`.
- **Mid-phase check-in** (day 3 of menstrual, ovulation peak day, day 3 of luteal): contextual nudge ("You're on cycle day 2 — protect your energy. 3 commitments scheduled today — review?").
- **Phase preview** (day before phase change): "Tomorrow you enter follicular — good window to start that project you parked."
- **Burnout guard**: if ≥ N commitments are scheduled in the menstrual window for the upcoming cycle, one summary card: "5 commitments land in your next menstrual window (Jun 1–5). Want to reshuffle?" → opens a small reshuffle dialog.

Each card is dismissible and stored in the existing dismissed store; cards re-appear next cycle.

### 3. Settings
New section in Settings → Cycle:
- Toggle: **Phase-aware planning warnings** (default on if cycle tracking enabled)
- Toggle: **Notify on phase changes**
- Slider: **Burnout threshold** (commitments per menstrual day, default 2)
- Toggle: **Warn for appointments only** vs **all tasks tagged high-effort**

All gated by `CycleSettings.enabled`.

## Technical Notes

**New files**
- `src/lib/cycle-planning.ts` — pure helpers:
  - `classifyTaskWeight(task)` → `"commitment" | "creative" | "admin" | "rest"` (uses tags, area, `energyRequired`, presence of `time`/appointment link)
  - `phaseFit(phase, weight)` → `"ideal" | "ok" | "discouraged"` mapping
  - `suggestBetterDate(currentISO, weight, history, settings)` → next date with `"ideal"` fit within 14 days
  - `commitmentsInWindow(tasks, appts, startISO, endISO)` count
- `src/lib/cycle-notifications.ts` — derives notification cards from `(today, history, settings, tasks, appts, dismissed)`. Pure selector, memoizable.
- `src/components/cycle/PhaseGuardToast.tsx` — toast renderer + "Move" handler.
- `src/components/cycle/CycleNotificationsSection.tsx` — section block reused inside `NotificationCenter`.
- `src/components/cycle/BurnoutReshuffleDialog.tsx` — small list of conflicting tasks with per-row reschedule buttons.

**Edits**
- `NotificationCenter.tsx` — render `<CycleNotificationsSection />` at top of the scroll area; include its count in the badge.
- `store.tsx` (or wherever `addTask`/`updateTask`/`addAppointment` live) — after a save where `dueDate` or `date` changed, call `evaluatePhaseFit(...)` and trigger `PhaseGuardToast` via sonner. No business-logic refactor — just a thin call site hook.
- `CycleSettings` type in `src/lib/cycle.ts` — add `warnOnCommitments`, `notifyOnPhaseChange`, `burnoutThreshold`, `warnScope` with sensible defaults; extend `DEFAULT_CYCLE_SETTINGS`.
- `src/components/settings/...` (Cycle settings panel) — add the new toggles.

**Reuse**
- `getPhaseInfo`, `phaseForDate`, `PHASE_META`, `predictNextPeriod` from `src/lib/cycle.ts`.
- `dismiss`/`getDismissed` from `src/lib/dismissed-notifications.ts` for per-card dismissal (keyed e.g. `cycle:phase-entry:2026-05-28`).
- `sonner` `toast(...)` with action button for the inline guard.
- Existing `useCycle` hook for state access.

**Data**
- No schema changes. Everything derives from existing `period_logs`, `tasks`, `appointments`, and local `CycleSettings`.

**Edge cases**
- Cycle tracking disabled → all behavior no-ops.
- No period history yet → skip phase warnings; show single onboarding card "Log your last period to unlock cyclical planning."
- Tasks without `dueDate` → ignored.
- Recurring tasks → evaluate per occurrence at scheduling time only.

## Out of scope
- Push/OS notifications (in-app only for now).
- Editing cycle data from the notification.
- Auto-rescheduling without confirmation.
