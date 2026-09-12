# CareFlow Planner Month Calendar Redesign

## Goal
Redesign only the Planner month experience as a calm, premium planning notebook for family care, capacity, routines, meals, appointments, and reflection. Preserve existing routes, shared planner data, sidebar, bottom navigation, capture flows, seasonal features, notes, and editing dialogs.

The selected visual direction is **Sophisticated CareFlow Interface** with the requested right-side **Day Schedule / Upcoming** panel, refined to the locked CareFlow taste:

- **Palette:** Botanical Warmth — warm cream, sage, peach, muted gold, restrained lavender
- **Typography:** Lora for major headings, Nunito Sans for interface text
- **Composition:** asymmetric notebook canvas with the month grid primary and a fold-out planning panel
- **Tone:** supportive and capacity-aware; never clinical, corporate, horoscope-led, or judgmental

## Experience structure

### 1. Planner notebook navigation
- Create a reusable `PlannerNavigation` for **Week / Month / Overview / Notes**, with Month selected here.
- Keep Day / 3 Days / Week / Month controls as calendar-range controls rather than mixing them with notebook sections.
- Preserve the existing shared date, view preferences, routes, and underlying planner state.
- Desktop retains the existing CareFlow sidebar and global search/profile header; mobile retains the existing bottom navigation and primary Capture action.

### 2. Responsive month shell
- Recompose the month screen into:
  1. notebook navigation and month title/navigation,
  2. compact summary and monthly rhythm,
  3. category filters,
  4. Monday–Sunday calendar,
  5. a collapsible desktop right panel.
- Use the selected asymmetric layout: spacious calendar canvas plus a 300–340px right-side page on desktop.
- On tablet, collapse the right panel on demand.
- On mobile, use a true compact month grid and open the selected date in a large bottom sheet/full-height sheet.

### 3. Month summary, rhythm, and filters
- Add reusable `PlannerSummary`, `MonthlyRhythm`, and `CapacityIndicator` components.
- Derive monthly counts from the shared planner feed: appointments, tasks, meals, birthdays, bills/finance when available.
- Show a calm monthly load label and a five-part visual rhythm across the weeks without productivity scoring.
- Replace the current generic kind control on Month with a compact **Show:** row for Events, Tasks, Meals, Family/Care, Lunar & Astrology, and Finance.
- Persist filter choices through the existing calendar preferences.

### 4. Calendar grid and day cells
- Rebuild `PlannerMonthView` around a reusable `CalendarDayCell`.
- Desktop cells show date, five-step capacity, concise supportive load label, category counts, optional lunar indicator, daily-note marker, and `+X more`—not large colored blocks.
- Mobile cells show date, capacity dots, and tiny category indicators only; retain Dots / Chips / List options where useful without crowding the default view.
- Style Today with a peach outline, small badge, and slight elevation.
- Keep off-month dates quiet and preserve Monday-first navigation.
- Use restrained semantic category colors: blue events, sage tasks, peach meals, pink care, gold finance, lavender lunar.
- Completed items remain softly faded, never struck through.

### 5. Day Schedule / Upcoming panel
- Add a responsive `MonthPlannerPanel` with interactive **Day Schedule / Upcoming** tabs.
- **Day Schedule:** selected date, supportive day/load sentence, chronological 12-hour timeline, completion state, category icon, title, person/location when present, overflow actions, and **Add to this day**.
- **Upcoming:** next seven days, All / Tasks / Events / Meals / Care / Finance filters, chronological grouped rows, draggable entries, and View All.
- Add a compact `LunarAstrologyCard` beneath either tab with event, theme, plain-language meaning, optional guidance framing, and View Chart.
- Selecting a date updates the panel without leaving Month view; mobile opens the same content in a sheet.

### 6. Needs Attention, Capture, and supportive actions
- Replace the prominent overdue treatment in Month with a compact `NeedsAttentionCard`: items needing a new home, conflicts, unscheduled count, and Review.
- Keep it collapsed/quiet by default and use supportive language throughout.
- Extend the existing Capture menu to expose Task, Event, Meal, Care, Note, Expense, and Idea while reusing existing destination-specific flows.
- Add `LightenMyDay` when a day is very full. Suggestions are reviewable and never applied automatically.

### 7. Unified moving and rescheduling
- Create one planner move service used by Month, Week, Day, Upcoming, and Needs Attention so every move updates the same source record.
- Support moving tasks, appointments/events, meals, care items, and note blocks where their current models permit it.
- Preserve meal recipe/ingredient links and update date-dependent grocery relationships without recreating meals.
- Recompute feed counts, selected schedule, upcoming list, capacity, reminders, and related planner views immediately through shared state.
- Add item overflow actions for **Reschedule / Change date / Change time** so drag-and-drop is never required.

### 8. Desktop, keyboard, and touch dragging
- Desktop: draggable rows with soft lift, ghost preview, destination highlighting, and clear drop targets; support date moves in Month and Upcoming-to-calendar.
- Day/Week: route time changes through the existing timeline/block mechanics and show a subtle target-time marker.
- Mobile: short press-and-hold before lift, enlarged date targets, ghost preview, haptic feedback, edge auto-scroll, cancel behavior, and a confirmation for disruptive moves.
- Add keyboard move actions through each item menu and clear focus-visible states.

### 9. Safety around capacity and recurrence
- Before committing a move, inspect the destination load.
- Light/moderate days move directly; very full days open `CapacityWarning` with **Move anyway** or **Choose a lighter day**.
- Never block a user’s choice and never label a day as failure or overload.
- Recurring items open `RecurringMoveDialog`, defaulting to **Just this one**, with this-and-future and entire-series options only when supported by the source model.

### 10. Undo and feedback
- Route every planner move through the existing persistent planner history mechanism.
- Show an `UndoToast` such as “Moved to Sep 18” with Undo.
- Restore original date, time, recurrence choice, and dependent view calculations when undone.
- Use restrained motion and honor reduced-motion preferences.

## Technical implementation
- Refactor `Planner.tsx` so Month has its own responsive composition instead of inheriting the dense generic planner shell.
- Split the current large month renderer into focused components: `MonthCalendar`, `CalendarDayCell`, `PlannerSummary`, `MonthlyRhythm`, `MonthPlannerPanel`, `DaySchedulePanel`, `UpcomingPanel`, `UpcomingFilters`, `LunarAstrologyCard`, `NeedsAttentionCard`, `DragPreview`, `DropZone`, `RescheduleDialog`, `RecurringMoveDialog`, `CapacityWarning`, and `LightenMyDay`.
- Keep the shared normalized planner feed as the read model, then extend its category/source metadata where care, finance, routines, and notes need explicit representation.
- Reuse the existing item openers, quick capture, calendar preferences, capacity calculations, note markers, seasonal/cosmic helpers, planner history, haptics, and store mutations.
- Extend the existing touch-drag utility with edge scrolling, explicit cancel state, confirmation hooks, and stable source snapshots.
- Express the locked palette, shadows, and category roles as semantic design tokens; preserve dark-theme compatibility.
- Use existing Button, Sheet, Dialog, Popover, Tabs, Checkbox, and dropdown primitives for accessible behavior.

## Confirmed current-state gaps this work addresses
- The current Month grid reads from the shared feed, but direct date moves currently update only tasks and appointments.
- The existing touch interaction supports long-press pickup and a ghost, but not edge auto-scroll, capacity confirmation, recurrence choice, or unified undo.
- Month currently does not enable the right context panel; the new Month panel will be purpose-built for Day Schedule and Upcoming.
- Existing filters and capacity tools can be reused, but the Month screen does not yet present the requested summary, weekly rhythm, category counts, or supportive load language.

## Verification
- Run TypeScript checks and focused planner tests.
- Verify authenticated desktop at 1440px: Month selection, summaries, filters, selected-day panel, Upcoming toggle, capture, item menus, drag moves, capacity warning, recurring choice, and Undo.
- Verify tablet panel collapse and touch targets.
- Verify authenticated mobile at 384×711: compact month readability, no overlap with bottom navigation/Capture, date sheet, schedule/upcoming tabs, long-press drag, cancellation, confirmation, and edge scrolling.
- Refresh after changes to confirm persisted view/filter/panel preferences and planner data.
- Check keyboard navigation, labels, focus visibility, 44px mobile targets, readable contrast, and reduced-motion behavior.
