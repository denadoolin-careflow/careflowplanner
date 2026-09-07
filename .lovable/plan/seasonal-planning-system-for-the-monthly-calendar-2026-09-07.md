# Seasonal Planning System for the Monthly Calendar

Turn the monthly calendar into a calm family command center guided by a gentle zodiac-season planning rhythm: capture, plan, prepare, care, celebrate, reflect.

## Where it lives

- The full experience is built on the existing **Full month plan** page (`/month/overview`), which becomes the Seasonal Month Hub.
- The planner's month view gets a compact seasonal banner at the top that links into the hub, so nothing is duplicated.

## What you'll see

**Seasonal header**
- Month + year, previous / next / today controls.
- Season line, e.g. "Libra to Scorpio — Balance • Connect • Prepare • Transform". When a month spans two seasons both are shown, with today's season emphasized.
- Element color accent (fire = terracotta/coral, earth = sage, air = soft blue, water = teal) applied to the banner and season cards.

**Season overview card**
- Theme, short overview, planning focus, household focus, holiday role, and a mindset line for the active season.

**Suggested for you**
- 3-5 season-appropriate suggestions at a time, never a wall of tasks. Each has Add, plus "Add all essentials", Dismiss, and "Not relevant". Dismissals are remembered.

**Holiday runway**
- The next three major upcoming events with a date, a soft progress line, and their prep checklist (e.g. Halloween: candy, costume, activities, photos).
- Big holidays surface about two seasons early, medium ones one season early, small ones inside the current season.
- Built-in US holiday list (already in the app) plus your own added celebrations; each holiday can be turned off, hidden, or renamed.

**Mom capacity**
- Light / Full / Survival selector for the month. Full trims suggestions to essentials; Survival shows only appointments, deadlines, critical family needs, and essential household tasks. Language stays supportive — "The plan adapts to you."

**3-2-1 this month**
- 3 priorities, 2 preparation windows, 1 seasonal intention — saved with the month.

**Monthly focus**
- Pick 1-3 of Home, Family, Well-being, Money, Food, Appointments, Holidays, Fun, Rest. Choices shape which suggestions appear.

**Monthly reset**
- What worked, what felt heavy, what to simplify, what carries forward, what you're proud of, what to prepare for next month. Saved per month.

**Coming next month**
- Next season, next major holiday, when to start preparing, and a few early actions you can add with one tap.

**Calendar filters**
- All / Tasks / Family / Home / Appointments / Shopping / Holidays / Seasonal / Lunar, shown as small dots and chips rather than big labels.

**Family**
- Existing family members, care recipients, birthdays, appointments and care tasks continue to show in the one shared month calendar — colored per person, no separate family calendar.

## Layout

- Mobile: month + year, seasonal banner, calendar, selected-day agenda, holiday runway, 3-2-1, capacity, and a floating + capture button (task, event, reminder, holiday prep, shopping, meal, note).
- Desktop: three columns — left navigation/filters/season overview, center large calendar, right runway, capacity, 3-2-1, focus.
- Cream backgrounds, sage green, warm gold and terracotta accents, rounded cards, soft shadows, generous whitespace, friendly rounded type — matching the existing CareFlow identity, no dark mystical astrology styling.

## Technical notes

- New `src/lib/seasons/zodiac-seasons.ts`: the 12 seasons with sign, element, glyph, start/end dates, theme, overview, planningFocus, householdFocus, holidayRole, mindset, suggestedTasks (tagged essential / helpful / optional and by focus area), and element color token. Helpers: `seasonForDate`, `seasonsInMonth`, `nextSeason` — all computed from the date, valid for any year.
- Element colors added as semantic tokens in `index.css` / `tailwind.config.ts` (no hardcoded color classes in components).
- New `src/lib/seasons/holiday-runway.ts`: merges the built-in US holiday list, user celebrations and custom events, computes prep lead time by holiday size, and derives readiness from the linked prep checklist items.
- Suggestion engine `src/lib/seasons/suggestions.ts`: filters by season, month focus, capacity band, upcoming holidays and dismissals; caps output at 5 and orders essential → helpful → optional.
- Persistence extends the existing `monthly_plans` row with new columns via one migration: `capacity` (text), `focus_areas` (jsonb), `prep_windows` (jsonb), `suggestion_state` (jsonb for added/dismissed), `reset` (jsonb for the monthly reset answers), `holiday_prefs` (jsonb for disabled/hidden/custom holidays). Existing columns (word, intention, priorities, season) are reused. Owner-scoped RLS already applies.
- Holiday prep checklists reuse the existing `holiday_plans` / `holiday_timeline_steps` tables; added suggestions become normal tasks through the existing store so they appear on the planner.
- New components under `src/components/seasons/`: `SeasonBanner`, `SeasonOverviewCard`, `SeasonSuggestions`, `HolidayRunwayPanel`, `CapacitySelector`, `ThreeTwoOneCard`, `MonthlyFocusPicker`, `MonthlyResetCard`, `NextMonthPreview`, plus a `MonthCaptureFab` for mobile.
- Verification: type-check, plus a mobile and desktop pass over `/month/overview` and the planner month view.

## Not included

No horoscope predictions or personal-chart interpretation — the zodiac is used purely as a planning lens.
