# CareFlow Unified Calendar System

Rebuild `src/pages/CalendarPage.tsx` and its supporting components into one responsive command center. Same component tree on phone, tablet, and desktop — only layout containers change via Tailwind breakpoints. No separate mobile page.

## Scope

In: the `/calendar` route and the components under `src/components/calendar/*`, plus new shared widgets for the calendar rail. Reuses existing atmosphere, cycle, lunar, weather, tasks, caregiving, meals, notes, journal modules — does not rewrite them.

Out: backend/schema changes, sync infrastructure (already on Lovable Cloud + store), Today page, redesign of individual feature pages.

## Architecture

```text
CalendarPage (responsive shell)
├── CalendarHeader            ← title, date nav, Today, view+layout toggles, search, atmosphere chip, Quick Add
├── CalendarFilters           ← All / Tasks / Appointments / Caregiving / Meals / Birthdays / Holidays / Cycle / Moon / Journal
├── Main grid
│   ├── CalendarSurface       (≈100% mobile, ≈60% tablet, ≈70% desktop)
│   │    ├── MonthView  ← day cells with event dots, moon glyph, cycle dot, birthday/holiday markers
│   │    ├── WeekView
│   │    ├── DayView
│   │    ├── YearView
│   │    └── ScheduleView (list layout for any range)
│   ├── SummaryStrip          ← Upcoming · Birthdays · Appointments · Holidays
│   │                            desktop 4-col, tablet 2×2, mobile horizontal swipe
│   └── WidgetRail            (stacked mobile, 2-col tablet, single-col desktop sidebar)
│        ├── TodaysRhythmCard (atmosphere, moon sign+element+phase, cycle phase, weather, suggested focus)
│        ├── TasksWidget       (progress ring, due/overdue/done, quick add)
│        ├── FamilyTimelineWidget
│        ├── CaregivingWidget
│        ├── MealsWidget
│        ├── CycleWidget       (phase, fertility window, insights & reminders)
│        ├── LunarWidget       (phase, sign, element, illumination, next phase, actions)
│        ├── WeatherWidget
│        ├── NotesWidget
│        └── JournalWidget
└── DayDetail
     ├── desktop/tablet: right-side panel that slides in when a day is selected
     └── mobile: bottom-sheet drawer (existing Sheet primitive)
```

Selected day, view, layout, and filter set live in `CalendarPage` state and persist via a small `useCalendarPrefs` localStorage hook so they survive across devices and route changes.

## Responsive rules

One component tree, layout via Tailwind breakpoints:

- `< md` (mobile): single column. Calendar → SummaryStrip (swipe) → WidgetRail (stack). Day tap opens bottom sheet. FAB for Quick Add.
- `md` (tablet): calendar full width, WidgetRail underneath as 2-col grid. Day tap opens side drawer.
- `lg+` (desktop): two-column shell — `CalendarSurface` left (~70%), `WidgetRail` right (~30%) with independent scroll. SummaryStrip sits above the widget rail as a 4-col grid. Day selection populates an inline right-side detail panel inside the calendar column.

## Atmosphere integration

All colors come from existing atmosphere CSS variables (`--atmosphere-accent`, `--atmosphere-bg`, `--atmosphere-gradient`, etc., already wired in `AtmosphereAmbient`). Replace hardcoded `bg-primary-soft`, `bg-rose-100`, etc. in `CalendarPage.tsx` and `CalendarItemCard.tsx` with semantic + atmosphere tokens. Add any missing tokens to `index.css` / `tailwind.config.ts`.

Category visual language uses **icon + shape**, not only color, so atmosphere swaps stay legible:

| Category | Icon | Shape |
|---|---|---|
| Task | Check | rounded square |
| Appointment | CalendarClock | pill |
| Caregiving | Heart | rounded square |
| Meals | Utensils | pill |
| Birthday | Gift | circle |
| Holiday | Sparkles | diamond |
| Cycle | Flower | dot |
| Moon | MoonGlyph | crescent |
| Journal | Notebook | rounded tag |

## Reused vs new components

Reuse (wrap where needed):
- `MoonPhaseWidget`, `WeatherWidget`, `RhythmGuidanceCard` — TodaysRhythmCard composes these.
- `MealsPlannedWidget`, `FamilySnapshotCard`, `MoonPrioritiesCard` (today/widgets, today/rhythm) — drop into WidgetRail.
- `LunarPhaseWidget`, `cycle-store` / `cycle.ts` for cycle data.
- `TimeGrid`, `AppointmentEditor`, `TaskEditor`, `BirthdayHolidayEditor`, `InboxCapture`, `QuickAddCalendarPopover`.

New under `src/components/calendar/`:
- `CalendarHeader.tsx`
- `CalendarFilters.tsx`
- `SummaryStrip.tsx`
- `WidgetRail.tsx`
- `TodaysRhythmCard.tsx`
- `TasksWidget.tsx`, `FamilyTimelineWidget.tsx`, `CaregivingWidget.tsx`, `NotesWidget.tsx`, `JournalWidget.tsx`, `CycleWidget.tsx` (where not already covered).
- `DayDetailPanel.tsx` (renders inside a side panel on ≥md, inside a `Sheet` on mobile — single component, container chosen by parent).
- `useCalendarPrefs.ts` for view/layout/filter persistence.
- `useWidgetLayout.ts` for reorder/resize/collapse/hide; stored in localStorage keyed by user.

## Widget customization

`WidgetRail` reads ordered widget list from `useWidgetLayout`. Each widget renders inside a `WidgetFrame` with drag handle, collapse toggle, and hide menu. Edit mode toggled from header overflow menu. Layout persists per user.

## Implementation steps

1. Add `useCalendarPrefs` and `useWidgetLayout` hooks + atmosphere token audit (add missing soft/foreground variants).
2. Extract current `CalendarPage.tsx` header/toolbar into `CalendarHeader` + `CalendarFilters`. Move category icon/shape mapping into one helper.
3. Build `MonthView`, `WeekView`, `DayView`, `YearView`, `ScheduleView` as siblings under a `CalendarSurface` switch, lifting logic from the existing 1063-line page.
4. Build `SummaryStrip` (Upcoming, Birthdays, Appointments, Holidays) reading from the store with breakpoint-aware container.
5. Build `WidgetRail` + `WidgetFrame` and the new widget components, composing existing widgets where possible.
6. Build `DayDetailPanel` and wire it to render inside a right-side panel on `lg+` and a `Sheet` on `< lg`.
7. Replace `CalendarPage` body with the new responsive shell; delete dead code paths from the old page.
8. Verify atmosphere swap visually updates header, day cells, event chips, widgets, summary strip, and detail panel.
9. Verify mobile (375), tablet (820), desktop (1440) layouts; check filter persistence, day-detail behavior, Quick Add, and widget reorder.

## Out of scope / follow-ups

- Real cross-device layout sync (currently per-device via localStorage). Promoting widget layout to a Cloud table is a separate task.
- Drag-to-reschedule on the month grid — keep current click-to-edit flow.
- Year view heatmap density visualization beyond month thumbnails.
