## Goal
Clicking the weather chip in the top header opens a rich weather card (today's conditions, what-to-wear, hourly + 3–5 day forecast) with a color scheme that shifts with the weather.

## UX flow
- The weather chip in `HeaderNowStrip` becomes the trigger for a new popover (replaces its current role as the location-picker trigger).
- A small "📍 Change location" link inside the new card still opens the existing `LocationPickerPopover`, so location editing stays available.
- 4–5 day mini strip in the header stays as-is (added in the previous task) and also acts as a secondary entry into the same card.

## The weather card contents
1. **Header band** – big glyph, current temp, condition label, today's H/L, location, "feels like" if available, precipitation chance.
2. **What to wear today** – 2–3 short caregiver-toned suggestions derived from today's temp range, precipitation, and condition (reuses `dayPartSuggestion` logic generalized for the day).
3. **Hourly forecast (today)** – horizontal scroll row using `snap.todayHourly`: hour label, condition icon, temp, small precip % under temp when ≥20%.
4. **3–5 day forecast** – rows from `snap.daily`: weekday, icon, condition label, precip %, H / L bar.
5. **Footer** – location chip (opens `LocationPickerPopover`), unit toggle, "Updated Xm ago".

## Color scheme by condition
A `weatherTheme(condition, isNight)` helper returns Tailwind classes for `bg`, `accent`, `ring`, and `text`:
- `clear` (day) → yellow/amber gradient
- `clear` (night) / `partly-cloudy` night → indigo/slate
- `partly-cloudy` day → sky / amber blend
- `cloudy` / `fog` → slate / zinc grey
- `drizzle` / `rain` → blue
- `thunderstorm` → deep blue + violet accent
- `snow` → purple / lavender

Applied to the card header band and the glyph aura only — body stays neutral so text remains readable in light & dark mode.

## Technical plan
- **New file** `src/components/weather/WeatherDetailCard.tsx`
  - Props: none (reads `useWeatherSnapshot`, `useTempUnit`).
  - Renders the four sections above.
  - Exposes `weatherTheme()` locally or in `src/lib/weather-theme.ts`.
- **New file** `src/components/weather/WeatherDetailPopover.tsx`
  - Wraps a `Popover` with the chip as trigger and `WeatherDetailCard` as content (width ~`w-[22rem]` / `sm:w-[26rem]`, max-h with internal scroll for the hourly row).
- **Edit** `src/components/layout/HeaderNowStrip.tsx`
  - Replace the `LocationPickerPopover trigger={…}` wrapping the temp chip with `WeatherDetailPopover trigger={…}`.
  - Keep the existing mini 4-day strip; optionally make it also trigger the popover.
- **Edit** `src/lib/weather-store.ts` (small)
  - Add a tiny helper `formatRelative(fetchedAt)` for "Updated 4m ago" (or inline).
- No edge functions, no schema changes, no new dependencies — all data already comes from `snap.todayHourly` and `snap.daily` (already extended to 5 days).

## Out of scope
- No changes to the location picker behavior.
- No new weather API fields beyond what `fetchWeather` already returns.
- No backend, auth, or AI work.
