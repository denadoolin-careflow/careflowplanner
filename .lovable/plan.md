## Cosmic Flow — v1 build plan

A new module at `/cosmic-flow` that becomes the single home for astrology in CareFlow. It reuses `src/lib/transits.ts`, `src/lib/moon.ts`, `src/lib/zodiac.ts`, and `src/lib/lunar-phases.ts`. Existing Rhythm/Insights pages stay; we cross-link from them to Cosmic Flow instead of duplicating content.

### Routes

```text
/cosmic-flow                    Dashboard (matches the uploaded mockup)
/cosmic-flow/timeline           Transit timeline (30/90 days)
/cosmic-flow/event/:id          Event detail (meaning, prompt, save-to-journal, create-task)
/cosmic-flow/birth-chart        Birth chart settings + natal overlay
```

Added to `nav.ts` under a new `cosmicflow` group (violet accent, reuses `lunarflow` palette). Mobile nav unchanged.

### Pages

**1. Dashboard (`/cosmic-flow`)**
- Hero "Today's Cosmic Weather" card: moon phase + glyph, moon sign + element, theme, "Good for" list, gentle reminder, void moon / sunrise / sunset / moonrise / moonset strip.
- Moon & Cycle card: illumination, days to full/new, suggested-care chips that link to existing rituals.
- Active Transits column: ingresses, retrogrades, exact dates — pulled from `getTransitsForDate`.
- Cosmic Journal Prompt card → opens `/journal` prefilled.
- Planning Focus card → drives daily theme into Today.
- Alignment Tip (AI-generated).
- Upcoming Cosmic Events (next 30 days, scanned daily).
- Transit Timeline strip (7 days, links to full timeline).
- 7-day Cosmic Forecast (favorable / challenging / reflective scoring per day).

**2. Timeline (`/cosmic-flow/timeline`)**
Vertical list grouped by day, filters: Moon phases · Ingresses · Retrogrades · Void moon · Eclipses. Each row links to event detail.

**3. Event detail (`/cosmic-flow/event/:id`)**
Encodes kind+planet+date in the URL (no row needed). Shows meaning, emotional theme, planning guidance, AI-generated journal prompt, suggested task type, related life areas, and three actions:
- Save to journal → inserts `journal_entries` with cosmic tags
- Add reminder → creates a task with cosmic tag + due date
- Create a task from this transit → prefills task editor

**4. Birth Chart (`/cosmic-flow/birth-chart`)**
Form for birth date / time / location (Google Places). Computes natal sun/moon/asc + houses (Placidus, local). Once set, dashboard adds a "Personalized" section: which natal planet/house each active transit hits.

### Data model (new tables)

```text
cosmic_birth_chart           one row per user — birth_dt, lat, lng, tz, computed natal_json
cosmic_journal_entries       FK → journal_entries.id, event_id, kind, planet, sign, phase, date
cosmic_event_saves           per-user bookmarks: event_id, kind, payload, reminder_at
cosmic_settings              feature flags: show_in_calendar, default_prompts, atmosphere
```

All RLS-scoped to `auth.uid()`, with the standard GRANTs.

### AI integration

New edge function `ai-cosmic-themes`:
- Input: date, list of active transits/phases, optional natal context, atmosphere.
- Output: `{ theme, good_for[], gentle_reminder, journal_prompt, alignment_tip, suggested_action }`.
- Model: `google/gemini-3-flash-preview`, JSON-mode, cached per (user, date) in `localStorage` for 24h to keep cost low.

### Cross-feature integrations

**Cosmic tags on tasks** — `src/lib/task-icons.ts` gains an optional `cosmic_tag` enum (🌑 Seed / 🌓 Build / 🌕 Release / 🌗 Clear / ☿ Review / ♀ Beautify / ♂ Act / ♄ Structure / ♃ Expand). Stored as plain text in `tasks.cosmic_tag` (migration adds column). New filter chip in task lists.

**Journal auto-entries** — "Save to journal" on any cosmic event creates a `journal_entries` row with prefilled prompt + tag chips (phase, planet, sign) recorded in `cosmic_journal_entries`.

**Calendar feed** — Extends `calendar-prefs.ts` with a "Cosmic Flow" source toggle + filter chip. Cosmic events render as ghost items in `CalendarPage` via a new `cosmic-calendar-feed.ts` adapter (computed, not persisted).

**Planning suggestions** — `CelebrationEditor`, `TaskEditor`, goal/habit/routine editors gain a collapsible "Cosmic timing" hint: shows the relevant key-phase suggestion for the chosen due date.

### Technical notes

- All transit/ingress/retrograde/void/eclipse computation stays local in `src/lib/transits.ts` (extended with eclipse + 90-day projection helpers).
- Natal chart math added in a new `src/lib/natal.ts` (Placidus houses, aspects to transiting planets).
- AI only generates copy (themes/prompts/tips), never astronomy.
- Tone everywhere: compassionate, never fear-based. Retrogrades framed as "review seasons".
- Old `/rhythm`, `/insights`, lunar pages keep working; each gets a small "Open in Cosmic Flow" link.

### Files (new)

```text
src/pages/CosmicFlow.tsx
src/pages/CosmicFlowTimeline.tsx
src/pages/CosmicFlowEventDetail.tsx
src/pages/CosmicFlowBirthChart.tsx
src/components/cosmic/CosmicWeatherCard.tsx
src/components/cosmic/MoonCycleCard.tsx
src/components/cosmic/ActiveTransitsList.tsx
src/components/cosmic/UpcomingEventsList.tsx
src/components/cosmic/TransitTimelineStrip.tsx
src/components/cosmic/CosmicForecastChart.tsx
src/components/cosmic/CosmicTimingHint.tsx
src/components/cosmic/CosmicTagPicker.tsx
src/lib/cosmic/events.ts            (catalog: phases, ingresses, retros, voc, eclipses)
src/lib/cosmic/forecast.ts          (7-day scoring)
src/lib/cosmic/natal.ts             (birth chart math)
src/lib/cosmic/copy.ts              (sign/planet/phase narrative library)
src/lib/cosmic/calendar-feed.ts
src/lib/cosmic/hooks.ts             (useTodayCosmicWeather, useUpcomingEvents, useNatal)
supabase/functions/ai-cosmic-themes/index.ts
supabase/migrations/<ts>_cosmic_flow.sql
```

### Files (edited)

```text
src/App.tsx                         add routes
src/lib/nav.ts                      add Cosmic Flow group + entries + descriptions
src/lib/calendar-prefs.ts           add cosmic source toggle
src/pages/CalendarPage.tsx          render cosmic feed when enabled
src/components/calendar/CalendarItemCard.tsx   cosmic chip
src/lib/types.ts                    Task gains optional cosmic_tag
src/components/tasks/...            cosmic tag filter chip + picker in editor
src/components/seasons/CelebrationEditor.tsx   show CosmicTimingHint
src/pages/RhythmOverview.tsx        link out to /cosmic-flow
src/pages/Insights.tsx              link out to /cosmic-flow
```

### Out of scope for v1

- Predictive yearly forecast.
- Synastry / compatibility between household members.
- Push notifications for upcoming transits (uses in-app only).

If this looks right I'll implement it in one pass after approval.