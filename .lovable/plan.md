# Bring all six schedule styles into the real Planner

## What you'll get

When you pick **Schedule** in the Planner on Day or Week, a new **Schedule style** picker lets you choose any of the six designs, using your real tasks, events, meals and care items:

1. **Phase Timeline** – the day as four tinted phase sections; on Week, small phase bands for each day.
2. **Day Cards** – one card per day, with tasks grouped under phase pills; on a phone you swipe through the week.
3. **Agenda Ribbon** – times down the left side with a colored line joining the day.
4. **Phase Grid** – the day as a 2×2 grid of phase cards; on Week, days across and phases down.
5. **Hour Rails** – each phase has its hours down the side; items sit at their real time and length, with a "now" line.
6. **Block Pills** – events with start and end times on top, flexible tasks with time estimates below.

Your choice is remembered on this device. The current timeline stays available as **Classic**, so nothing is lost.

## Improvements in every style

- **Soft tint icons:** pale phase circle with a deep-color icon; the current phase gets a filled, ringed version.
- **Booked vs. open time** at the top of each phase ("1h 30m booked · 1h 30m open").
- **Events and tasks look different:** events show their start–end time and length; tasks have a check circle and a rough time estimate (30 min when none is set).
- **Check off** tasks and events right where they appear (saved the same way as today).
- **Add** at the bottom of each phase uses the same smart typing as Today ("call mom 3pm" lands in Care).
- **Open time** says so, and invites you to rest or block something.
- **Week view:** each day/phase box shows a "+N more" link and opens that day when tapped.

## Agenda Ribbon change

Times become small rounded pills in the same serif font as the date heading. Each pill takes the soft tint of its phase: green for morning, yellow for midday, orange for afternoon, rose for evening, with deep-color text so it's easy to read.

## Afterwards

The mockups page is removed once the real views are in place.

## Technical details

- New `src/components/planner/schedule/` folder: one component per style (Day + Week), plus shared `SoftPhaseBadge`, `PhaseHead` (booked/open), `TimeBlockPill`, `FlexTaskRow` and `AddToPhase` (reuses PhaseInlinePanel's NLP add).
- Data: reuse the existing day/week item sources already used by Today phase mapping (`today-phase-items`) and PlannerTimeline (tasks, appointments, meals, med doses); toggles go through existing task/appointment completion paths. No schema changes.
- Device-local pref `careflow.planner.scheduleStyle` (`classic | timeline | cards | ribbon | grid | rails | pills`); picker shown next to the Schedule/Cards switch in `PlannerScopeBar` when face = schedule on Day/Week.
- `Planner.tsx` renders the chosen component in place of `PlannerTimeline`/week grid when not `classic`.
- Ribbon time pill: `font-serif text-xs rounded-full px-2` with `--rhythm-{phase}-tint` background and `-deep` text.
- Add a test for the phase booked/open minutes calculation; record the rule in AGENTS.md; delete `ScheduleMockups.tsx` and its route.
