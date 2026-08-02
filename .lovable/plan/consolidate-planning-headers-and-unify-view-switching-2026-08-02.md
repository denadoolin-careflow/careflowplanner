# Consolidate planning headers and unify view switching

Week and Month currently stack four header-like blocks (`PageHeaderImage` → `PlanHeader` → `PlanningHeader` → `ScopeHero`). The period title is printed three times, Week ships two week navigators, and both pages repeat the same placeholder subtitle. This plan collapses that into one sticky header plus one slim context strip, and makes view switching read the same way on Today, Week and Month.

## Target header anatomy (Week and Month)

```text
PageHeaderImage       decorative banner (unchanged)
PlanHeader (sticky)   < [Aug 4 - Aug 10] >  This week | Today.Week.Month | view pills | + quick add | gear
PlanContextStrip      greeting . time . temp . moon/element . Reset & reflect (. Monthly overview)
page content
```

Everything below the strip (rhythm journal, transit strip, calendar card, sidebar) stays as it is.

### Where each existing piece goes

| Source | Content | Destination |
| --- | --- | --- |
| `ScopeHero` | big duplicate title, eyebrow, greeting, clock + temp chip, "Reset & reflect" / "Monthly overview" links | title/eyebrow dropped (PlanHeader owns it); greeting, clock, temp and links move into the new context strip |
| `ScopeHero` children on Week | `WeekNavigator` | removed - PlanHeader already has prev/next, date picker and "This week" |
| `PlanningHeader` -> `PlanningHero` | greeting, duplicate title, clock, weather, placeholder subtitle | removed from Week/Month; greeting/clock/weather covered by the strip |
| `PlanningHeader` -> Rhythm triptych (Moon/Energy/Cycle) | rhythm collapsible | Week: keep as a collapsible below the strip, Review view only. Month: drop (Month already has the moon overlay and `/month/overview`) |
| `PlanningHeader` -> Capacity check-in, Daily debrief | day-scoped check-in and debrief | removed from Week/Month - they are day-scoped and already live on Today. Week keeps weekly reflection via `RhythmJournalPrompt` and `/reset/week` |
| `PageHeaderImage` | banner | unchanged |

The repeated subtitle string is deleted outright, not reworded.

`PlanningHeader` itself is **not** deleted - `src/pages/Year.tsx` still uses it.

## Unified view switching

Two levels, same shape on all three pages, both living in `PlanHeader`:

1. **Scope** - `ScopeSegmented` (Today / Week / Month), already in `PlanHeader`. This becomes the only way to change scope.
2. **View** - one pill group of period-appropriate views, always in `PlanHeader`'s `views` slot, visible on mobile too (replacing the separate mobile toggle currently rendered inside the calendar card).

| Page | View pills |
| --- | --- |
| Today | Plan / Board (unchanged) |
| Week | Timeline / Time of day / Agenda / Review |
| Month | Grid / Agenda |

Naming fix on Week: the current layout toggle labelled "Schedule" becomes **Review** vs. the calendar views, so "Schedule" no longer names both a layout and a view. Week's four pills flatten today's two-level control into one - picking Timeline / Time of day / Agenda implies the calendar layout; picking Review shows `WeekPlanningDashboard`.

Week's **Month** view pill is removed; the `Grid3x3` option disappears from `CalendarViewToggle` and `MonthGridView` is no longer rendered inline on Week. Scope switching to `/month` covers it, and `WeekPlanningDashboard`'s `onJumpToDay` keeps working.

Because `CalView` persists to `localStorage` and can currently hold `"month"`, the reader must coerce a stored `"month"` back to a valid value so returning users don't land on a dead view.

## Month astrology strip follows the visible month

`src/pages/Month.tsx` computes `todayForecast = getRhythmForecast(new Date())` and labels it "This week" regardless of `cursor`. Anchor it to the visible month instead: when `cursor` is the current month keep today's forecast and the "This week" label; otherwise use the first day of the visible month and label it with that month (e.g. "Sep 2026"). The element tint pill keeps the same styling.

## Today swipe gestures

In `src/pages/Today.tsx`, `onTouchEnd` sends a left swipe to `/week` and a right swipe to the previous day. Make it symmetric: left = next day, right = previous day. Scope switching stays with `ScopeSegmented` in the header (already rendered on a second row on mobile), so no gesture is needed for it.

## Cleanup after the change

- `src/components/layout/ScopeHero.tsx` - no remaining usages; delete.
- `src/components/week/WeekNavigator.tsx` - no remaining usages; delete.
- `src/components/calendar/MonthGridView.tsx` - Week is its only caller today; delete once the usage check confirms nothing else renders it.
- `src/components/today/rhythm/PlanningHero.tsx` - still reachable through `PlanningHeader`, which `Year.tsx` renders; keep.
- Unused imports left behind in `Week.tsx` and `Month.tsx` (`ScopeHero`, `WeekNavigator`, `MonthGridView`, `PlanningHeader`, `Flower2`, `Link`, `DayPickerButton` where no longer needed).

## New file

- `src/components/layout/PlanContextStrip.tsx` - one-row strip: greeting, time, temperature, optional moon/element chip, and a slot for scope links. Reuses the rounded-pill / soft-card language lifted from `ScopeHero`, so no new visual vocabulary is introduced.

## Risks

- **Lost surfaces on Week/Month.** Capacity check-in and daily debrief disappear from those pages. They remain on Today, but if you use them from Week this will feel like a regression - say so and I'll keep the debrief collapsible on Week.
- **Persisted view state.** Users with `"month"` stored in `careflow:cal-view:v1` need the coercion above, or Week renders an empty calendar card.
- **Week's flattened toggle** changes muscle memory for anyone used to the Schedule/Plan pair.
- **Mobile row count.** Moving view pills into `PlanHeader` risks a second wrapped row on small screens; the pills will scroll horizontally rather than wrap, keeping the one-row header rule intact.

## Size

Medium. Two page header rewrites (roughly 120 lines removed from each), one small new component, one toggle change with a migration guard, two small behavioural fixes (astrology anchor, swipe direction), plus deletions. No backend or data-model changes.