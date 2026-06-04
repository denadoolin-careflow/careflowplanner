# Calendar → CareFlow Command Center

Transform `/calendar` from a utilitarian grid into the calm, glanceable life dashboard shown in the reference. The existing `CalendarPage` keeps its data model and editors — we wrap and restyle the surface, then add a new right-rail of life widgets and a mobile swipe deck.

## Scope

In: visual + structural redesign of `/calendar`, new right-rail widgets, hero, expanded filter chips, restyled day cards, mobile swipeable widgets, atmosphere theming.

Out: data model changes, new backend tables, calendar engine rewrite, drag/drop refactor (current behavior preserved), changes to other pages.

## Layout

```text
┌─────────────────────────────────────────────────────────────┐
│ HERO  CareFlow · Calendar 🌿                                │
│ "Appointments, birthdays, holidays — color-coded & gentle." │
│ [🌙 Moon phase]  [🌿 Element · verb]  [🪐 Atmosphere]       │
├──────────────────────────────────────────┬──────────────────┤
│ CONTROLS  ‹ Month › Today | D W M Y | Grid Sched Kanban Plan│
│ FILTERS   All · Tasks · Appts · Care · Meals · Birthdays ·  │
│           Holidays · Google · Family · Bills · Goals        │
│                                          │  RIGHT RAIL      │
│  CALENDAR SURFACE (grid / schedule /     │  • Goals month   │
│  kanban / planning — existing views,     │  • Intention     │
│  restyled cards)                         │  • Areas to grow │
│                                          │  • Birthdays     │
│                                          │  • Celebrations  │
│                                          │  • Highlights    │
└──────────────────────────────────────────┴──────────────────┘
            Floating Quick-Add (existing) anchored bottom-right
```

Desktop ≥1280px: 3-column (main + 320px rail). Tablet: main only, rail items become a swipe deck above the calendar. Mobile: same swipe deck plus existing bottom nav and FAB.

## Build steps

1. **New shell `CalendarHub`** — wraps existing `CalendarPage` body. Adds hero, right rail, and mobile swipe deck. Existing month/week/day/year/kanban views render inside unchanged but with refined card styles.
2. **Hero block** — display name + tagline + three small chips: moon phase (`moonPhaseFor`), seasonal element (`getRhythmForecast`), current atmosphere (`useAtmosphere`). Soft sage→cream gradient tinted by `useFlowAccent("planflow")`.
3. **Filter chips** — extend the existing `kindFilter` set with `family`, `bill`, `goal`. Render as pill chips with category color dots; keep multi-select behavior. "All" resets to default.
4. **Day cards** — restyle the per-event chips inside month grid cells: rounded-xl, soft category-tinted background (caregiving = blush, meals = sage, tasks = cream, appts = lavender, birthdays = gold, holidays = peach), icon prefix, dense one-line title, optional time + family-tag dot row.
5. **Right rail widgets** (new file per widget, all in `src/components/calendar/rail/`):
   - `GoalsThisMonthCard` — top 3–5 active goals from `state.goals` (progress bar, area color, +Add → opens goal sheet).
   - `IntentionCard` — pulls from existing intention store (or localStorage `careflow:intention`); shows seasonal label + focus word + moon phase emoji.
   - `AreasToGrowCard` — 5 circular icons (Home, Health, Finance, Creative, Family) using existing `area-resources`/`category-icons`, tap routes to `/areas/:slug`.
   - `UpcomingBirthdaysCard` — sorts `state.birthdays` by days-until, shows 3 with initials/avatar.
   - `CelebrationsCard` — merges `state.holidays`, family events tagged as "celebration", and trip ranges from `state.trips`; next 4 within 60 days.
   - `UpcomingHighlightsCard` — next appointment + next family event + next high-priority task in a mini timeline.
6. **Mobile swipe deck** — horizontal `snap-x` carousel that renders the same widgets at 85% width, slotted above the calendar surface on `<lg` screens. Re-uses the same card components.
7. **Empty states** — replace bare blank cells with kind copy: "No plans here yet. Leave room for life to happen." in the month grid when a day is empty and hovered; and a full-surface message for filtered views with zero results.
8. **Atmosphere theming** — derive accent via `useFlowAccent("planflow")`; apply to hero gradient, active filter chip ring, focus highlights, and "Today" cell ring so the page automatically retints with the active atmosphere.
9. **Persistence** — store selected view, layout, and filter set in `localStorage` under `careflow:calendar:*` so the page restores its state.

## Technical details

- Files added:
  - `src/components/calendar/CalendarHub.tsx` (new shell)
  - `src/components/calendar/rail/GoalsThisMonthCard.tsx`
  - `src/components/calendar/rail/IntentionCard.tsx`
  - `src/components/calendar/rail/AreasToGrowCard.tsx`
  - `src/components/calendar/rail/UpcomingBirthdaysCard.tsx`
  - `src/components/calendar/rail/CelebrationsCard.tsx`
  - `src/components/calendar/rail/UpcomingHighlightsCard.tsx`
  - `src/components/calendar/CalendarHero.tsx`
  - `src/components/calendar/CalendarFilterChips.tsx`
- Files edited:
  - `src/pages/CalendarPage.tsx` — extract main surface into a child component used by `CalendarHub`; keep editors, kindFilter state, and event aggregation. Expose `kindFilter`, `setKindFilter`, `cursor`, `view`, `layout` via props so chips/hero can drive them.
  - Add `family`, `bill`, `goal` to the `Kind` union and event sources (goal milestones from `state.goals[].dueDate` if present; bills from `state.bills` if present, else hidden chip).
- Reused: `useStore`, `useFlowAccent`, `useAtmosphere`, `moonPhaseFor`, `getRhythmForecast`, `MoonPhaseBadge`, `ElementBadge`, existing `AppointmentEditor`, `BirthdayHolidayEditor`, `TaskEditor`, `QuickAddCalendarPopover`, `InboxCapture`.
- Routing unchanged (`/calendar` still renders `CalendarPage`, which now renders `CalendarHub`).
- All colors via existing semantic tokens / atmosphere palette — no hard-coded hex outside `flow-accent`.

## Acceptance

- `/calendar` shows the hero, expanded filter chips, restyled day cards, and right rail on desktop; swipe deck on mobile.
- All 10 filter chips toggle event visibility; multi-select works; selection persists across reloads.
- Right-rail widgets pull live data from the store and route to their respective pages on click.
- Day, Week, Month, Year, Kanban, Schedule, Planning views all still work and keep current editing behavior.
- Atmosphere switch retints hero, active chips, and Today highlight without code changes.
