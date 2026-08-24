# Today page: people, meals, check-in history, gentle nudges

## What you'll get

**Meals tied to people**
- Each meal (breakfast/lunch/dinner) can be linked to one or more care people or loved ones, with an optional serve time.
- "What's for dinner" shows who it's for and when — e.g. "Dinner · Mom, 5:30pm" — and flags anyone with no meal planned today.

**Friends and connections**
- The people picker gets an "Add person" action so you can add a friend (name, relation, emoji/colour) without leaving Today.
- Friends appear alongside care recipients and loved ones everywhere the connection picker is used.

**Check-in history**
- Completing a "People to reach" item records a timestamped check-in (who, what, when, optional note).
- The Connections card gains a "Recent" strip: last few check-ins with relative time ("Mom · 2h ago"), and a per-person "last reached" hint so long gaps are visible.

**Gentle in-app reminders**
- Quiet, dismissible nudges driven by the Today cards' own status: no dinner planned by late afternoon, cleaning essentials still open in the evening, and anyone not reached for N days.
- Delivered as soft in-app banners (no push, no noise), each with a one-tap action and "not today" dismissal that lasts until tomorrow. Timing and on/off per nudge type live in a small settings popover.

**Remembered care people**
- The Today "Choose people" selection saves to your account instead of only this browser, so it follows you across devices and sessions (local storage stays as an instant fallback).

**Home / self-care / habits / routines**
- Inline "add" rows on the cleaning card and the self-care card — type and press Enter, no modal.
- Habits card visible on Today with streak dots.
- Routines get visuals (progress ring, step count, time-of-day icon) and smart sorting: due-now first, then nearly-finished, then untouched; completed ones sink.
- Completion animation: a check-pop with haptic feedback, reusing the existing completion visual/haptics helpers.

## Technical notes

Database (one migration):
- `meal_people` join table (`meal_id`, `person_id`, `person_kind`, `serve_time`) with RLS scoped to the owner, plus grants.
- `connection_checkins` table (`user_id`, `person_id`, `person_kind`, `task_id`, `note`, `checked_in_at`) with owner-scoped RLS and grants.
- `profiles.today_care_people` (jsonb array) for the remembered selection.

Frontend:
- `src/lib/meal-people.ts`, `src/lib/connection-checkins.ts` for data access; extend `src/lib/people-directory.ts` with a create action for friends.
- `src/lib/today-care-people.ts` reworked to read/write the profile column with local storage as cache.
- `src/lib/today-nudges.ts`: pure status → nudge rules, plus per-type prefs and per-day dismissal (reuses `dismissed-notifications.ts` pattern).
- Card updates: `DinnerTonightCard`, `CleaningTodayCard`, `ConnectionsCard`, `SelfCareCard`, `TodayHabitsCard`, `RoutinesPanel`, `dashboard/CareColumn`; new `TodayNudgeStrip` mounted on the Today dashboard.
- Animation/haptics via existing `completion-visual.ts` and `haptics.ts`; no new colour literals — semantic tokens only.
