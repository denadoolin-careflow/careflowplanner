## Goal

1. Show a clear weather card on Morning, Afternoon, and Evening rhythm sections with the temperature and conditions for that part of the day.
2. Always-visible date, live time, and current weather in the top app header (sticky on every page) so it's available outside the Today hero.

## Changes

### 1. Weather card per rhythm slot
File: `src/components/today/rhythm/SlotWeather.tsx`

Today this renders a thin inline strip that's easy to miss and silently returns `null` when conditions look empty. Promote it to a proper card:

- Always render when a forecast for that day-part exists (don't hide on `"—"` label — show a neutral "Forecast unavailable" state instead).
- Layout: rounded card matching other Today cards (`cozy-card`-style border + bg), with:
  - Left: large condition icon + day-part label ("Morning", "Afternoon", "Evening").
  - Middle: big temp (avg) + "Feels / H ° · L °" line + condition label.
  - Right: precip chance (with droplet) and the existing day-part suggestion as a soft caption underneath.
- Keep using `useWeatherSnapshot()` + `useTempUnit()` + `dayPartSuggestion()` — no data-layer changes.
- Visual only — the card is still placed inside `RhythmSection` via the existing `showWeather` prop (already enabled on all three slots in `Today.tsx`).

### 2. Header date / time / weather
File: `src/components/layout/AppLayout.tsx`

Add a compact info cluster inside the existing sticky `<header>` (between the page title block and the action buttons, hidden on the smallest screens to keep mobile clean):

- Live clock: `h:mm a`, updating every 30s via a small `useEffect` + `setInterval` (or a tiny new `HeaderNowChip` component to keep AppLayout tidy).
- Today's date: `EEE, MMM d`.
- Current weather: condition icon + temp (using `useWeatherSnapshot` + `useTempUnit`, same pattern as `RhythmHeader`). Hidden gracefully if snapshot unavailable.
- Styled as pill chips with `bg-muted/40` / border, matching `DateBarStrip` so it feels consistent across the app.

A new small component `src/components/layout/HeaderNowStrip.tsx` will hold the clock + date + weather chips so `AppLayout.tsx` stays readable. It will call `useEnsureWeather()` so weather is fetched on every page, not only Today.

## Out of scope

- No changes to the weather data layer, providers, or units logic.
- No changes to `RhythmHeader` (it already shows time + temp inside the Today hero; we're adding to the global header so it's visible on every page).
- No changes to Today.tsx wiring (already passes `showWeather` to all three slots).
