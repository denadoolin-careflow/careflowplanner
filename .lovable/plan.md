
# Daily Check-In — Morning Ritual

A calm, glassmorphic morning conversation that auto-opens once per day and becomes the emotional heartbeat of CareFlow, feeding directly into Plan My Day.

## Scope & flow

`Daily Check-In → Plan My Day → Focus → Evening Reflection`

Auto-open once per calendar day on first app load (before 2pm local); dismissible; re-openable from Today header and Command Bar. Persists per-day state so it never re-prompts after completion.

## Route & entry points

- New route: `/check-in` (full-screen ritual) + modal variant that overlays Today.
- Auto-launcher hook in `App.tsx` reads `careflow:checkin:<iso>` and opens the modal if `completedAt` is missing and it's morning.
- Entry chips: Today header "Morning check-in" pill, Command Bar action, Planner rhythm header button.

## Layout (single scrollable ritual, 7 sections)

Reuses existing atmosphere tokens, `reset-glass`, `font-display`, sage/cream/plum palette. No new palette.

1. **Hero header** — time-aware greeting ("Good morning, {name} ☀️"), date, live clock, weather chip, moon phase + sign, one-line transit summary. Reuses `RhythmHeader` primitives + `MoonCycleModule`.
2. **Daily Energy card** — energy meter (Calm/Active/Intense), mood theme, focus theme, challenge, hidden opportunity. Powered by `ai-today-guidance` extended output.
3. **Personal Moon Guidance** — moon sign, phase, activated Whole Sign house from stored natal chart, 6-line life-area impact (relationships, work, family, health, creativity, spiritual, financial). Collapsible "Learn more".
4. **CareFlow Method — 4 cards** (Capture / Anchor / Rhythm / Exhale) rendered as a 2×2 glass grid:
   - Capture: reflective question + text/voice/photo/tag entry → saves to journal.
   - Anchor: one intention suggestion (accept or edit) → writes to `daily-intention`.
   - Rhythm: top-3 priorities + timeline of suggested work/rest/meal/water/med/movement blocks → optional "Add to Planner".
   - Exhale: release / boundary / self-care / breathing / evening preview.
5. **AI Daily Insight** — one supportive paragraph weaving moon + transits + goals + habits + calendar + recent journal + season.
6. **Today's Mantra** — one affirmation, "Save to favorites" heart.
7. **Mood check-in + Gratitude + Yesterday's wins** — mood selector with personalized response, 3 gratitude inputs (text/voice), auto-populated wins list with celebration animation.

Sticky footer: **Today's Planner Preview** (schedule/tasks/focus blocks/habits/meals condensed) + **End-of-day preview** with 4-step progress ring (morning ✓, planning, midday, evening).

## Personalization engine

New `src/lib/carey/checkin-context.ts` extends `buildCareySnapshot` with: profile, family, natal chart, whole-sign houses, active transits, moon, weather, location, calendar today, tasks, habits, recent journal, health goals, cycle phase, energy history, sleep, meals, caregiving load. Single builder consumed by all AI sections so nothing double-fetches.

## New edge function

`supabase/functions/ai-daily-checkin/index.ts` — one call returns a structured payload for all sections:

```
{ energy, moonGuidance, method: { capture, anchor, rhythm, exhale },
  insight, mantra, moodResponses, recommendations }
```

Uses `google/gemini-3-flash-preview` via Lovable AI Gateway with `Output.object` schema. Cached per `user_id + iso` in a new `daily_checkins` table so reopening is instant and free.

## Persistence

New table `public.daily_checkins` (RLS: owner-only, with GRANT + policies per project rules):
- `id, user_id, iso_date, ai_payload jsonb, mood, gratitude jsonb, capture_text, capture_media, chosen_intention, saved_mantra, completed_at, created_at, updated_at`
- Unique `(user_id, iso_date)`.

Local fallback via existing `daily-checkin.ts` for offline / anonymous.

## Files to add

- `src/pages/DailyCheckIn.tsx`
- `src/components/checkin/CheckInModal.tsx`
- `src/components/checkin/sections/{HeroHeader,EnergyCard,MoonGuidanceCard,MethodGrid,DailyInsight,MantraCard,MoodGratitude,YesterdayWins,PlannerPreview,EndOfDayRing}.tsx`
- `src/components/checkin/method/{CaptureCard,AnchorCard,RhythmCard,ExhaleCard}.tsx`
- `src/hooks/useDailyCheckIn.ts` (load, save, AI fetch, completion tracking)
- `src/lib/carey/checkin-context.ts`
- `src/lib/daily-checkin-store.ts` (Supabase + local mirror, event bus)
- `supabase/functions/ai-daily-checkin/index.ts`
- Migration for `daily_checkins` table with grants + RLS.

## Files to touch

- `src/App.tsx` — register route + auto-launcher.
- `src/lib/nav.ts` — add nav entry (optional, under Today section).
- `src/components/layout/HeaderNowStrip.tsx` — "Morning check-in" chip when not yet completed.
- `src/components/planner/PlannerCommandBar.tsx` — command action.
- `src/pages/Today.tsx` — small "Start check-in" prompt if incomplete.
- Anchor & Rhythm outputs write through existing `daily-intention`, `time-blocks`, and `top-three` stores so Plan My Day picks them up automatically.

## Non-goals

- No new palette, fonts, or design tokens.
- No changes to Planner/Focus/Evening Reflection surfaces beyond wiring the outputs.
- No push notifications in this pass (auto-open is in-app only).
