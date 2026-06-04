# Weather upgrades — location picker, unit toggle, auto-refresh, hourly precip, warnings

Bring the Today weather cards under user control: pick a saved city/ZIP, toggle °C/°F inline, auto-refresh on a cadence, surface hourly rain probability, and call out any active weather warnings.

## 1. Location picker (city / ZIP)

New component `src/components/weather/LocationPickerPopover.tsx` (trigger = small "📍 {city}" chip):
- Search input that calls `geocodeCity(query)` from `src/lib/weather.ts` (already supports city + ZIP via Open-Meteo geocoding).
- Renders up to 5 results (name · admin1 · country); click saves via `savePlace()` and immediately refetches via `fetchWeather()` → `setWeatherSnapshot()`.
- "Use my location" button: `navigator.geolocation` + `reverseLabel()`, same save+refetch path.
- "Clear saved location" → removes localStorage key and falls back to auto-detect.

Wire the chip into:
- `SlotWeather.tsx` (header row of the per-slot card — only render on the first slot to avoid duplicates), and
- `HeaderNowStrip.tsx` (the temp pill becomes the trigger).

No changes to `weather.ts` data layer.

## 2. Inline °C / °F toggle

Tiny segmented control reusing the existing `useTempUnit()` store (already global):
- New `src/components/weather/UnitToggle.tsx` — same visual as the one in `WeatherPrefsSection`.
- Placed beside the location chip in the SlotWeather header and in `HeaderNowStrip`.

No new state, no migration — `setTempUnit()` already persists to localStorage and broadcasts.

## 3. Auto-refresh

Extend `src/lib/use-ensure-weather.ts`:
- After initial load, set an interval (default 15 min) that re-calls `fetchWeather()` for the saved place and `setWeatherSnapshot()`.
- Also refresh on `document.visibilitychange` when the tab becomes visible and the snapshot is older than 10 min (`snap.fetchedAt`).
- Cleared on unmount.

No new pref UI — interval is a constant; the existing `autoLocate` pref still governs first-load geolocation.

## 4. Hourly rain chance

Today's hourly data is already in `snap.todayHourly` (each entry has `precipChance`). Add a compact strip inside `SlotWeather`:
- Filter `todayHourly` to the slot's hour range (reuse the same ranges as `bucketHourly` in `weather.ts` — export `PART_RANGES` or duplicate the constant in the component).
- Render a horizontal row of small cells: hour label (`ha`), tiny rain-drop icon, `precipChance%`.
- Only show hours with `precipChance >= 10` to keep it calm; if none, show "No rain expected".

Renders below the existing tip line; mobile scrolls horizontally.

## 5. Weather warnings

New helper `src/lib/weather-warnings.ts`:
- Pure function `computeWarnings(snap, prefs)` returning `{ id, severity: 'info'|'caution'|'alert', label, detail }[]`.
- Rules driven by existing `WeatherPrefs` (`coldC`, `hotC`, `rainAlerts`, `snowAlerts`, `windAlerts`):
  - Thunderstorm anywhere today → alert.
  - Any hour ≥70% precip + rainAlerts → caution ("Heavy rain around 3 PM").
  - Snow in dayParts + snowAlerts → caution.
  - Min hourly temp ≤ `coldC` → info ("Cold snap — bundle up").
  - Max hourly temp ≥ `hotC` → caution ("Heat — hydrate & shade").
  - Fog in next 6 hours → info.
  - (Wind: Open-Meteo `wind_speed_10m` not currently fetched; add `wind_speed_10m_max` to the daily query in `fetchWeather` and gate on `windAlerts` ≥ 40 km/h.)

Render in a new `WeatherWarningsCard` placed above the three SlotWeather cards in `RhythmSection.tsx`. Each warning is a pill row with an icon + label + short detail. Empty list = component renders nothing.

## Technical notes

- `weather.ts`: extend the `fetchWeather` query string with `wind_speed_10m_max` (daily) only; add `windMaxKph` to `WeatherSnapshot`. No other data-layer changes.
- All temps continue to render through `useTempUnit()` + `cToF()`.
- No DB / edge function changes. Pure client.
- No changes to `WeatherPrefsSection` other than (optional) wording — the picker is now also reachable from Today, but Settings keeps the full pref panel.

## Out of scope

- Multi-location saving (only one active place).
- 7-day forecast UI.
- Push notifications for warnings (in-app banners only).
- Replacing the weather provider.

## Files

- new: `src/components/weather/LocationPickerPopover.tsx`
- new: `src/components/weather/UnitToggle.tsx`
- new: `src/components/weather/WeatherWarningsCard.tsx`
- new: `src/lib/weather-warnings.ts`
- edit: `src/lib/weather.ts` (add `windMaxKph` to snapshot + query)
- edit: `src/lib/use-ensure-weather.ts` (interval + visibility refresh)
- edit: `src/components/today/rhythm/SlotWeather.tsx` (header chips + hourly precip strip)
- edit: `src/components/today/rhythm/RhythmSection.tsx` (mount warnings card)
- edit: `src/components/layout/HeaderNowStrip.tsx` (chip becomes picker trigger + unit toggle)
