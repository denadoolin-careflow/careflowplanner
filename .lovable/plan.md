# Recurring planner, gentle reminders, and cycle alignment

## Goal
Make repeating family-care plans dependable across Month and Week, add compact mobile filtering, and connect cycle tracking with meals, moon phases, capacity, and scheduled work without making the planner feel clinical or crowded.

## Recurring planner items
- Use one shared recurrence model for tasks, appointments, meals, and caregiving routines: daily, selected weekdays, weekly, monthly, yearly, interval, start date, optional end date/count, and optional time or meal slot.
- Extend the existing task and appointment repeat controls to meal and caregiving editors and quick-add flows.
- Project occurrences into the shared planner feed so they automatically appear in Month agenda/calendar and every Week/3 Day layout without pre-creating unlimited rows.
- Give each series a stable identity and store exceptions for moved, edited, skipped, or completed occurrences.
- When a repeated item is edited, moved, completed, or deleted, ask whether the change applies to **this occurrence**, **this and future occurrences**, or **the entire series**. Keep drag/drop, capacity checks, conflict confirmation, and Undo working for each choice.
- Keep existing one-off items and existing task, appointment, cleaning, and routine recurrence behavior compatible while moving calendar projection through one shared path.

## Compact Month and Week filters
- Add one mobile filter button with an active-count badge and a compact bottom sheet for:
  - Category: task, appointment, meal, caregiving, home, cleaning, and cosmic items.
  - Priority: high, medium, low, or unset.
  - Energy: high, medium, low, or unset.
  - Status: open, completed, or all.
- Reuse one synchronized filter state across Month agenda and Week/3 Day cards so switching views keeps the same choices.
- Extend normalized planner items so non-task categories expose their available category/status metadata; unsupported priority or energy values remain “unset” rather than disappearing unexpectedly.
- Show removable active-filter chips without adding another tall toolbar row.

## Gentle reminders
- Add private, cross-device reminder preferences for planner items, moon phases, cycle milestones, and saved journal prompts.
- Support the selected channels: quiet in-app reminders, device notifications when permission is granted, and one configurable email digest.
- Include global quiet hours, digest time/time zone, default lead times, per-category toggles, snooze, and “open item” actions.
- Allow item-level reminder overrides on tasks, appointments, meals, and caregiving routines; recurring reminders follow their occurrence unless overridden.
- Add moon-phase choices for Sow, Grow, Glow, and Let go; cycle choices for predicted phase starts and period timing; and opt-in reminders for saved journal prompts.
- Keep language supportive, deduplicate each reminder occurrence, and avoid medication-style urgency. Device delivery will degrade to in-app reminders when browser permission is unavailable.
- Add a scheduled backend delivery path for the email digest and durable due reminders; confirm the project’s existing email sender configuration before activating outbound email.

## Moon timeline updates
- Replace plain lunar rail marks with recognizable phase emoji and visible dates at the four monthly milestones:
  - 🌑 Sow · New Moon
  - 🌓 Grow · First Quarter
  - 🌕 Glow · Full Moon
  - 🌗 Let go · Last Quarter
- Keep moon sign, element, guidance, journal prompts, and selected-day behavior connected to each milestone.
- Make the rail readable on narrow screens with compact labels or an accessible horizontal detail view rather than shrinking text below legibility.

## Better cycle tracking
- Correct phase emoji at the source and use them consistently: **🌸 Follicular, 🌻 Ovulation, 🍂 Luteal, 🥀 Menstrual**.
- Keep cycle details compact in Month and Week: phase-change markers and a concise selected-day summary open the full editor instead of exposing sensitive details everywhere.
- Build an editable cycle map where users can correct period start/end dates, flow, symptoms, mood, energy, temperature, cervical mucus, intimacy, and notes.
- Recalculate forecasts from corrected history while clearly distinguishing recorded days from predictions; permit manual cycle-length and luteal-length adjustments.
- Add a combined alignment view with parallel Moon, Cycle, Meals, and Plans lanes. Selecting a day shows meals, tasks, appointments, caregiving, capacity, cycle signals, and moon context together.
- Add phase-aware planning suggestions as optional guidance only. Users can apply a suggestion to schedule or reschedule a meal/task, but predictions never silently move plans.
- Add comparison summaries for recurring patterns across cycle phase, lunar phase, meals, symptoms, energy, completed work, and capacity, using neutral language and an insufficient-history state.
- Preserve the existing private/off state and do not show fertility information unless its current preference is enabled.

## Data and technical work
- Add authenticated, owner-scoped tables for recurrence series/exceptions, reminder preferences/deliveries, and saved-prompt reminder state. Include explicit authenticated/service grants and row-level policies in the same migrations.
- Extend existing planner entities only where needed to reference a recurrence series and item-level reminder override; retain current appointment recurrence data during migration.
- Centralize occurrence expansion and exception resolution in the planner feed so Month, Week, 3 Day, lists, tables, boards, drag/drop, and reminders resolve the same occurrence IDs.
- Extend the existing cycle store rather than creating a second cycle data source; retain current cycle settings, period history, and daily logs.
- Regenerate database types after schema changes and keep offline/in-app scheduling compatible with the durable reminder path.

## Verification
- Verify create/edit/move/complete/delete for all four recurring item types, including all three edit scopes and month boundaries.
- Verify Month agenda/calendar and Week Schedule/Board/List/Table show identical occurrences and filters at narrow phone and desktop sizes.
- Verify filter persistence, empty/unset values, completion visibility, and no regressions to two-axis Week scrolling.
- Verify each reminder category, quiet hours, snooze/deduplication, permission-denied fallback, email digest timing, and links back to the correct item/day.
- Verify moon emoji/dates and cycle phase emoji, corrections, predicted-versus-recorded styling, private/off behavior, Moon/Cycle/Meals/Plans alignment, and journal prompt tracking.
- Run focused recurrence/cycle/reminder tests, a full TypeScript check, authenticated browser checks, and database security validation.
