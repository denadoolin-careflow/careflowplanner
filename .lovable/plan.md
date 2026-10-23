# Planner phase ribbon, one smarter week strip, moon-sign energy and more month views

## 1. Phase ribbon (Month and Week)
- A thin ribbon sits under the date at the top of the Month and Week planner views. It shows the Plan, Grow, Care and Let go phases for the next three moon cycles, about 12 weeks.
- Each section is tinted in its phase color. Today has a small marker, and the selected week or month is lightly outlined.
- Tap a section to jump to the day that phase starts. The ribbon scrolls sideways on a phone.

## 2. One week strip on phone (Month view)
- The extra week strip added last time is removed. The existing day strip at the top becomes the only one.
- Each day in it shows:
  - its date
  - the moon emoji
  - the Plan, Grow, Care or Let go icon (sprout, leaf, heart, wind) with its phase color bar
  - the moon's zodiac sign
  - the day's weather: an icon and the high temperature
- Weather only shows for the next 5 days, which is as far as the forecast goes. Other days leave it blank.

## 3. Moon sign and one energy word per day (Month, phone and desktop)
- Each day in the month grid shows the moon's sign glyph plus one word for how to work with that energy. Examples: Aries "Start", Taurus "Savor", Gemini "Connect", Cancer "Nurture", Leo "Shine", Virgo "Tidy", Libra "Balance", Scorpio "Deepen", Sagittarius "Explore", Capricorn "Build", Aquarius "Innovate", Pisces "Rest".
- On phone this is the glyph only in the small grid, with the word shown in the strip and on the selected-day card. Desktop shows both in every day cell.

## 4. Month view options: Calendar, Agenda, List, Board
- Calendar, Agenda, List and Board buttons come back to Month on phone, and also appear on desktop and tablet.
- **Calendar:** on phone, the new layout (small month plus the improved strip); on desktop, the current grid.
- **Agenda:** only the days that have plans, each with its moon, sign and energy word.
- **List:** every day of the month, in order.
- **Board:** a column for each week of the month, with plans as cards. Drag a card to another day or week to move it.
- Your choice is remembered on this device.

## Technical details
- A new `PhaseRibbon` component uses `monthRhythmMoments` across three months (exact quarters) and is shared by the Month and Week headers.
- A new `MOON_SIGN_ENERGY` map from sign to word lives in `src/lib/cosmic`.
- The day strip (`MobileWeekAgendaStrip` / Planner header strip) gains optional phase icon, sign and weather slots, filled from `snap.daily` (5-day forecast).
- In `PlannerMonthView`, the mobile view setting is restored and extended to all screen sizes with a `board` option. The board reuses `DayDropZone` and `MonthItem`.
- Small tests cover the sign-to-word map and the ribbon's phase ranges.
- No database changes.
