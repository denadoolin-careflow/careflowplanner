# Implementation Plan

A large multi-area upgrade. I'll deliver in 4 focused phases so you see progress and can course-correct.

## Phase 1 — Week view: per-day weather + moon
- Add a small weather+moon strip to each weekday card in `src/pages/Week.tsx` using existing `WeatherWidget`/`weather-store` and `moon.ts` helpers.
- Compact format: icon + high/low + moon glyph + phase name on hover.

## Phase 2 — Advanced Calendar with time-blocking
- Extend `CalendarPage` Day and Week views with an hourly time grid (e.g. 6am–10pm, 30-min rows).
- Render appointments + Google events positioned by start time and duration.
- Click-drag (or click an empty slot) on the grid to create a time block: opens quick-create with date/time prefilled.
- Existing month/year views stay; polish hover states and current-time indicator.
- New `time_blocks` table (title, date, start_time, end_time, color, notes) with RLS for user-created blocks distinct from appointments. Surface them in Day/Week alongside appointments.

## Phase 3 — Movable/editable dashboard widgets
- Replace `Dashboard` with a grid powered by `react-grid-layout` (drag + resize).
- Widget registry: Today summary, Weather, Weekly weather, Moon, Top 3 tasks, Habits, Meals today, Calendar peek, Affirmation, Pomodoro.
- "Edit layout" toggle reveals drag handles, resize handles, add/remove widget menu.
- Multiple named layouts (e.g. "Morning", "Work", "Weekend"): create/rename/delete/switch. Persist per-user in a new `dashboard_layouts` table (name, layout JSON, widgets JSON, is_active).

## Phase 4 — Themes, header image, hover polish
- Themes: extend `ThemeProvider` beyond light/dark/system with named palettes (Dawn, Sage, Dusk, Mono). Stored in profile (`theme` column already exists). Apply via `data-theme` attribute and CSS variables in `index.css`.
- Header image: optional banner at top of `AppLayout` header — user picks from preset gradients/photos or uploads (Supabase Storage `header-images` bucket). Stored on profile (new `header_image_url` column).
- Hover polish: subtle lift, ring, and color transitions on cards/buttons via shared utility classes in `index.css` (`.hover-lift`, smoother `.cozy-card:hover`).

## Technical Notes
- New deps: `react-grid-layout` (+ types), `@dnd-kit/core` already not needed if we use react-grid-layout.
- Migrations: `time_blocks`, `dashboard_layouts`, `profiles.header_image_url`, storage bucket `header-images` with per-user folder policy.
- AI: stays on Lovable AI Gateway (`google/gemini-2.5-flash`) — no changes needed to existing meal AI; no new AI features added in this scope unless you want one.
- Each phase is a separate batch of edits; I'll report back after each so you can redirect.

## Order of work
1. Migrations (time_blocks, dashboard_layouts, profiles column, storage bucket) — single migration, requires your approval.
2. Phase 1 Week weather/moon (quick win, no deps).
3. Phase 2 Calendar time-blocking.
4. Phase 3 Dashboard grid + layouts.
5. Phase 4 Themes + header image + hover polish.
