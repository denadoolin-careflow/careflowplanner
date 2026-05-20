## Today Energy — Unified Weather + Rhythm Guidance

Transform the Today view into a cohesive "Today Energy" experience combining weather, clothing guidance, moon/rhythm forecast, tarot, affirmations, and AI-powered planning. Preserve the existing CareFlow aesthetic (sage, tan/gold, cream, plum) and keep the current Schedule/Plan flows intact — this lives **above** them as the calm morning header.

### New "Today Energy" stack (in order, on `/today`)

1. **Weather Hero Card** (replaces/augments current weather usage on Today)
   - Big current condition + temp + location
   - Three day-part tiles: Morning / Afternoon / Evening — each with icon, temp range, precip %, wind, one-line summary
   - Sunrise-gradient morning, warm tan afternoon, dark plum evening backgrounds
   - Click any day-part → expands an inline detail strip (hourly-style summary, feels-like, UV, wind dir)
   - Smooth height transition, soft glow on hover

2. **Clothing Guidance Strip**
   - Pure derived UI from the day's weather + user thresholds
   - 2–4 short caregiver-friendly suggestions ("Light jacket recommended", "Bring an umbrella", "Rain boots may help")
   - Small lucide icons (Umbrella, Shirt, CloudSnow, Wind, Sun) with subtle fade-in
   - Uses new `getClothingAdvice(snapshot, prefs)` helper

3. **Today Rhythm Forecast** (expanded card)
   - Moon phase + zodiac + element badge in one row
   - "Focus" line (organizing / creating / reflecting / connecting based on element)
   - Affirmation block (italic, cream background, tap → "Save to journal" toast that creates a journal entry)
   - Tarot card block (name + one-line meaning, click → expands fuller meaning panel)
   - "Plan with this energy" button → opens existing `PlanWithEnergyDialog`

4. **AI Daily Guidance Card**
   - One short paragraph generated server-side from weather + moon + today's task load + energy
   - "Regenerate" + "Plan my day" buttons
   - Calls new edge function `ai-today-guidance` (Lovable AI Gateway, `google/gemini-3-flash-preview`)
   - Cached in localStorage per `yyyy-MM-dd` so it doesn't re-spend on every visit

### Weather settings (Settings → Profile)

New "Weather & Rhythm" section:
- Temperature unit (°C / °F) — already exists, surfaced here too
- Default location (search + "Use my location")
- Cold threshold slider (default 60°F / 15°C)
- Hot threshold slider (default 80°F / 27°C)
- Toggles: Rain alerts, Snow alerts, Wind alerts
- All persisted to `localStorage` under `careflow:weather-prefs` (no DB migration needed — UI prefs only)

### Files

**New**
- `src/lib/weather-prefs.ts` — typed prefs + `useWeatherPrefs()` hook (localStorage)
- `src/lib/clothing-advice.ts` — `getClothingAdvice(snap, prefs)` returning `{ icon, label, tone }[]`
- `src/lib/tarot.ts` — small 22-card deck (name + short meaning + extended meaning) + `tarotForDate(date)` deterministic pick
- `src/components/today/TodayEnergy.tsx` — orchestrates the four cards
- `src/components/today/WeatherHeroCard.tsx` — expanded day-part weather with gradients
- `src/components/today/ClothingStrip.tsx`
- `src/components/today/RhythmGuidanceCard.tsx` — moon + element + affirmation + tarot
- `src/components/today/TarotCard.tsx` — click-to-expand
- `src/components/today/AIDailyGuidance.tsx`
- `src/components/settings/WeatherPrefsSection.tsx`
- `supabase/functions/ai-today-guidance/index.ts` — uses `LOVABLE_API_KEY` via AI gateway

**Edited**
- `src/pages/Today.tsx` — insert `<TodayEnergy />` above the existing Schedule/Plan card; remove the now-redundant inline RhythmForecastCard + ElementBadge + RhythmJournalPrompt block (replaced by the richer card)
- `src/pages/Settings.tsx` — add new section
- `src/lib/weather.ts` — extend `WeatherSnapshot` consumers if needed (already has dayParts, precip, wind — minimal changes)

### Design notes

- All colors via existing semantic tokens (`--primary` sage, `--secondary` tan, `--accent`, `gradient-dawn`, `gradient-calm`). No raw hex.
- Day-part gradients use existing CSS vars; add three small utility classes in `index.css` if needed (`bg-gradient-morning`, `bg-gradient-afternoon`, `bg-gradient-evening`) built from existing HSL tokens.
- Rounded `cozy-card` style stays consistent.
- Subtle motion via Tailwind transitions (no framer-motion dependency added).
- Mobile-first: stacks vertically under 640px, 3-col day-parts above.

### Out of scope (intentionally)

- Push notifications for rain/snow (toggle stored but not wired to a notification service yet — can be added later when we add a service worker / push)
- New zodiac/moon calculations beyond what `src/lib/moon.ts` and `src/lib/rhythm-forecast.ts` already provide
- DB schema changes (everything is derived or stored in localStorage)
