# Caregiver Dashboard Redesign

A full redesign of the Today + Home dashboards around 8 caregiver-first widgets. All widgets register into the existing customizable grid so users can reorder, resize, hide, pin, and theme them on both pages.

## What ships

### 1. Widgets (all new, all registered)

| Widget | Type id | Source data |
|---|---|---|
| 🌔 Moon Guidance (hero) | `moon-guidance-hero` | `lib/moon`, `useCycle`, `useWeekForecast`, `getRhythmForecast`, daily affirmation |
| ❤️ What Needs Me Today | `who-needs-me` | `care_recipients` + `tasks` (people-tagged) + `appointments` + `loved_ones` |
| ✨ Today's Focus | `todays-focus` | `tasks` (top 3/5/all toggle), reuses `TopThreeStrip` logic + AI top-3 picker (existing `ai-today-guidance`) |
| 🍽 What's For Dinner | `whats-for-dinner` | tonight from `meals` table; fallback to new `ai-dinner-tonight` edge fn |
| 🧠 Mental Load Dump | `mental-load-dump` | existing `mental_load_inbox` + `ai-voice-capture` |
| 💜 Mom Check-In | `mom-checkin` | new `caregiver_checkins` table (water/food/meds/outside/mood/energy) |
| 📅 Upcoming Events | `upcoming-snapshot` | `appointments` + `tasks` with times (next 3) |
| 🏡 Home Reset | `home-reset-quick` | existing `reset_items` with 5/15/Full mode toggle |

Each is a separate file under `src/components/dashboard/widgets/caregiver/`, registered in `WidgetRegistry.tsx`, with its `WidgetType` added to `dashboard-layouts.ts`. All use semantic tokens (sage / cream / lavender from index.css) — no hardcoded colors.

### 2. Default layouts

`dashboard-layouts.ts` gets a new default preset `caregiver-default` applied to both `home` and `today` page keys when the user has no saved layout. Order:

```
[Moon Guidance Hero — full width]
[Who Needs Me] [Today's Focus]
[What's For Dinner — full width on mobile, half on desktop]
[Mental Load Dump] [Mom Check-In]
[Upcoming Events] [Home Reset]
```

Existing widgets remain available in the Add Widget sheet — nothing is deleted.

### 3. Moon Guidance Hero

Animated `MoonGlyph` (CSS-only phase shading + soft glow pulse), gradient (sage→cream→lavender), three buttons:
- **Read More** → opens `DayLunarSheet`
- **Lunar Insights** → navigates `/today` lunar tab
- **Plan With This Energy** → fires existing cycle planning listener

Shows: phase name, illumination %, energy line (`Low/Steady/High Energy • Day N {follicular|luteal|…}`), weather (from `useWeekForecast` today), affirmation (cycle affirmation else moon affirmation).

### 4. What's For Dinner

Three states:
1. **Planned tonight exists** → show meal card with prep/cook time, ingredients-available % computed from `pantry_items` ∩ meal.ingredients, `Cook This` (opens recipe) + `Swap Meal` (calls suggester).
2. **No plan** → calls new edge function `ai-dinner-tonight` returning 3 suggestions filtered by today's energy + active filters (toddler / sensory / low-energy / 15-min / freezer / healthy / budget); each card has `Save Favorite`, `Add To Weekly Plan`, `Create Grocery List`.
3. **Use What I Have** toggle → posts pantry to same fn with `mode:"pantry_only"`.

Missing-ingredients block lists items not in pantry with `Add To Grocery List` (existing `grocery_items` insert) plus stub deep-link buttons:
- Instacart: `https://www.instacart.com/store/s?k=<query>`
- Walmart: `https://www.walmart.com/search?q=<query>`
- Kroger: `https://www.kroger.com/search?query=<query>`

Caregiver mode banner ("Low Energy Day" / "Give Yourself A Break") shown based on today's `caregiver_checkins` row — supportive copy only, no guilt phrasing.

### 5. Mom Check-In

New table + new widget. Tracks daily binary (water/food/meds/outside) + 1–10 energy + emoji mood. Gentle insight line shown when a tracker hasn't been hit in N hours; copy bank lives in `src/lib/caregiver-checkin-copy.ts` and is exclusively supportive ("Take two minutes for yourself", never "you forgot").

### 6. What Needs Me Today

Groups today's tasks + appointments by `person_tag` / `care_recipient_id` (existing tables). For each person: avatar, name, list of items (medication, appointments, reminders). `+ Add` button per person opens task editor pre-tagged. Toggle Today / Week / Upcoming.

### 7. Mental Load Dump

Existing `BrainDumpInbox` logic refactored into a compact widget variant. Single text input + mic button (reuses `VoiceCaptureDialog`). Submissions go to `mental_load_inbox` and `ai-mental-load` auto-categorizes into tasks/notes/calendar/grocery/follow-ups.

Also exposed as a floating global FAB via existing `CombinedFab` — adds a new "Brain dump" entry.

### 8. Upcoming Events + Home Reset

Thin wrappers over existing data. Home Reset adds 5-min / 15-min / Full mode selector that filters `reset_items` by `est_minutes`.

## Technical Details

### New files
- `src/components/dashboard/widgets/caregiver/MoonGuidanceHero.tsx`
- `src/components/dashboard/widgets/caregiver/WhoNeedsMeWidget.tsx`
- `src/components/dashboard/widgets/caregiver/TodaysFocusWidget.tsx`
- `src/components/dashboard/widgets/caregiver/WhatsForDinnerWidget.tsx`
- `src/components/dashboard/widgets/caregiver/MentalLoadDumpWidget.tsx`
- `src/components/dashboard/widgets/caregiver/MomCheckinWidget.tsx`
- `src/components/dashboard/widgets/caregiver/UpcomingSnapshotWidget.tsx`
- `src/components/dashboard/widgets/caregiver/HomeResetQuickWidget.tsx`
- `src/lib/caregiver-checkin-copy.ts`
- `src/lib/caregiver-checkins.ts`
- `src/lib/dinner-suggester.ts` (client wrapper)
- `src/lib/retailer-links.ts` (Instacart/Walmart/Kroger URL builders)
- `supabase/functions/ai-dinner-tonight/index.ts`

### Edited
- `src/lib/dashboard-layouts.ts` — add 8 new `WidgetType`s + `caregiver-default` preset for `home` and `today`.
- `src/components/dashboard/WidgetRegistry.tsx` — register 8 widgets.
- `src/pages/Today.tsx` — replace bespoke today layout with `<CustomizableGrid pageKey="today" />` (mobile keeps existing MobileTodayCard? No — it's superseded by the hero + grid which is already mobile-first).
- `src/pages/Dashboard.tsx` — switch to `pageKey="home"` using new preset.
- `src/components/quick-add/CombinedFab.tsx` — add "Brain dump" entry.

### Database (one migration)

```sql
CREATE TABLE public.caregiver_checkins (
  id uuid PK default gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL,
  water boolean default false,
  food boolean default false,
  meds boolean default false,
  outside boolean default false,
  movement boolean default false,
  sleep_hours numeric,
  energy int,
  mood text,
  created_at/updated_at timestamptz,
  UNIQUE(user_id, date)
);
-- GRANTs to authenticated + service_role; RLS: auth.uid() = user_id for all ops.
```

No other schema changes — meals, pantry, mental_load_inbox, reset_items, care_recipients, appointments, tasks all already exist.

### Edge function `ai-dinner-tonight`
Inputs: `{ energy, filters[], mode: "smart"|"pantry_only", family_size }`. Reads pantry + meal prefs + recent meals (avoid repeat). Calls Lovable AI Gateway (`google/gemini-3-flash-preview`) with structured output → returns `{ suggestions: [{name, prep_minutes, cook_minutes, ingredients[], easy_tag, reason}] }`. `verify_jwt = false` (validates JWT in code per project pattern).

### Out of scope
- Real Instacart/Walmart/Kroger API integrations (deep-link only).
- Accessibility audit beyond reusing existing tokens + large touch targets.
- Migration of legacy `MobileTodayCard` — it stays available but the new caregiver grid is the default Today.

## Risks
- Schema-only addition is `caregiver_checkins`; no destructive changes.
- Default-layout reset only applies to users with no saved `home`/`today` layout — existing customizations are preserved.
