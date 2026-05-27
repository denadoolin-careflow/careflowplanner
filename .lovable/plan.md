# Hourly weather dropdown

Add a per-hour forecast disclosure to the weather card on Today, plus richer hour rows inside each day-part tile.

## What you'll see

1. **New "Hourly forecast" toggle** below the three day-part tiles (Morning / Afternoon / Evening) in `WeatherHeroCard`. Tapping it slides open a scrollable list of every hour from `snap.todayHourly` with:
   - Hour label in 12-hr format (e.g. `2 PM`)
   - Condition icon + short label
   - Temperature (respects °C/°F toggle)
   - Precipitation chance when ≥10% (💧 %)
   - **Current hour highlighted** with a primary tint, ring, and a small "Now" chip — auto-scrolled into view when opened
   - Night hours get a subtle moon-tinted background
2. **Day-part tiles** keep their tap-to-expand behavior, but the expanded panel now shows the hourly rows that fall inside that part (Morning shows 6 AM–11 AM, etc.) instead of the generic stats grid. Same row format and "Now" highlight.

## Files touched

- `src/components/today/WeatherHeroCard.tsx`
  - New `HourlyList` subcomponent (hour rows + current-hour highlight + auto-scroll via `ref` on the matching row)
  - Replace `DayPartDetails` body with the filtered hourly list for that part
  - Add a "Hourly forecast" disclosure button under the day-part grid that toggles a full-day `HourlyList`

No data-layer changes — `snap.todayHourly` already carries hour, temp, condition, isNight, and precip.

## Out of scope

- Multi-day hourly (only today, since `fetchWeather` currently fetches `forecast_days=2` but only buckets today)
- Wind/UV — not in the current snapshot shape
- Other places that show weather (WeatherWidget, DayPartsView) — keep this focused on the hero card the user is looking at
