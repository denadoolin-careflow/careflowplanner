# Daily Intention Planning Page

Mirror the weekly planning experience at the day level, persisted per‑date so each day shows as a timeline of plans tied to the calendar.

## What you'll get

A new **Plan** layout on the `/today` page (toggled like Week's Schedule / Plan switch), plus a dedicated `/plan/:date` route reachable from any day in Today/Week/Month so you can scroll back through previous daily plans like a timeline.

The Plan layout assembles editable cards:

- **Intention hero** — word of the day, theme, intention, emotional focus, free notes
- **Top 3** + **Priorities** (chip lists, add/remove inline)
- **Day schedule** preview (reuses `TimeGrid` for the single day, click-through to edit)
- **Meals** for the day (reuses meal cells, editable in place)
- **Home reset** checklist (today's cleaning/reset items, tick to complete)
- **Journal / Moon / Cycle check-in** — moon phase chip, cycle log opener, mood + energy + gratitude one-liner that writes a `journal_entries` row for the date
- **Weather check-in** — today's forecast from the existing weather store, with a one-tap "feels like" note
- **Reflection** (end‑of‑day) — wins, challenges, gratitude, tomorrow's focus, 1–5 rating

Every card uses the existing `WidgetFrame` + `WidgetThemePicker` so you can change accent color / density / hide the card, the same way dashboard widgets work today. Layout (order + visibility + theme per card) is saved per user in a new `daily_plan_layouts` row so your customization sticks.

## Persistence

Two new tables — daily intentions and daily reviews — keyed by `(user_id, date)` so each day's plan is its own record. A simple "Plan timeline" view on `/plan` lists every saved daily plan in reverse chronological order with the word, top 3, and rating, jumping into the editor on click. Meals, tasks, journal entries, cleaning, cycle logs and weather already persist in their own tables and are simply surfaced/edited from the page.

## Technical details

**New DB tables (migration):**

```text
daily_intentions(id, user_id, date, word, intention, theme, emotional_focus,
                 priorities jsonb[], top_three jsonb[], notes, mood, energy,
                 gratitude jsonb[], weather_note, created_at, updated_at,
                 unique(user_id, date))

daily_reviews(id, user_id, date, wins, challenges, gratitude, lessons,
              tomorrow_focus, rating int, created_at, updated_at,
              unique(user_id, date))

daily_plan_layouts(id, user_id, widgets jsonb, updated_at,
                   unique(user_id))   -- single layout shared across days
```

All three with RLS `auth.uid() = user_id` (all commands) and `set_updated_at` triggers.

**New files:**

- `src/hooks/useDailyPlan.ts` — mirrors `useWeeklyPlan` (load/save intention + review for a date)
- `src/hooks/useDailyPlanLayout.ts` — load/save widget order/visibility/theme
- `src/components/calendar/DailyPlanningDashboard.tsx` — the page body
- `src/components/calendar/daily-widgets/` — small widget components: `IntentionHero`, `TopThreeCard`, `PrioritiesCard`, `DayScheduleCard`, `MealsCard`, `HomeResetCard`, `CheckInCard` (journal+mood+gratitude), `MoonCycleCard`, `WeatherCard`, `ReflectionCard`
- `src/pages/PlanTimeline.tsx` — `/plan` index listing saved daily plans
- `src/pages/PlanDay.tsx` — `/plan/:date` standalone editor

**Edited files:**

- `src/pages/Today.tsx` — add Schedule/Plan toggle like Week, render `DailyPlanningDashboard` when `plan`
- `src/App.tsx` — register `/plan` and `/plan/:date`
- `src/components/layout/Sidebar.tsx` — add "Daily Plan" nav entry (optional, secondary)
- `src/components/calendar/WeekPlanningDashboard.tsx` — make each day-card in "Day by day" link to `/plan/:date` instead of jumping to schedule view (so the timeline is reachable from week view)

**Widget customization:** reuse `WidgetFrame` (already used by dashboard widgets) and add a tiny per-page `useDailyPlanLayout` hook to persist order/theme/hidden state. Drag-to-reorder via existing `react-grid-layout` pattern from `CustomizableGrid` is out of scope for v1 — instead each card has a small "⋯" menu (theme, hide). If you want full drag reorder, say so and I'll wire it.

**Inline editing:** all text fields are `Input`/`Textarea` save-on-blur (same pattern as `WeekPlanningDashboard`). Meal cells reuse `MealCell`; cleaning items reuse the existing toggle from `HomeReset`; journal check-in writes a `journal_entries` row with `type='daily'` for that date.

## Open questions

1. Should the `/plan` timeline be the new homepage, or stay as a separate `/plan` route with Today/Week unchanged? (Plan above assumes the second.)
2. Full drag-to-reorder widgets, or just per-widget theme + hide menu? (Plan above assumes the latter.)
