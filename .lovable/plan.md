## Seasons & Celebrations — v1 (full module, in one pass)

A new top-level CareFlow module: dashboard, sub-pages for Seasons, Celebrations, Holidays, Traditions, Memory Book, Bucket Lists, plus Lunar Celebrations and Remembrance. Backed by new Cloud tables, surfaced in the Calendar as a new event source with its own filter chip, with AI generators and a dedicated mobile + desktop UX.

### Routes & navigation

Add sidebar group **Seasons & Celebrations** (sparkles icon) with sub-routes:

- `/seasons` — Dashboard (matches the attached mockup)
- `/seasons/seasons` — current season detail + seasonal goals
- `/seasons/celebrations` — list / planner
- `/seasons/celebrations/:id` — Celebration / Birthday planner
- `/seasons/holidays` — list with prep timelines
- `/seasons/holidays/:id` — Holiday planner detail
- `/seasons/traditions` — library + annual instances
- `/seasons/memory-book` — Timeline / Gallery / Story views
- `/seasons/bucket-lists` — seasonal + custom lists
- `/seasons/remembrance` — gentle remembrance pages

Sidebar entry is added to both the desktop sidebar and mobile bottom nav fly-out menu. Active route highlights via `NavLink`.

### Data model (new Cloud tables)

All tables get `user_id`, `created_at`, `updated_at` (+ trigger), and per-user RLS. Added to `supabase_realtime` so they sync across devices like the existing calendar tables.

- `celebrations` — id, kind (`birthday | anniversary | graduation | family_milestone | care_milestone | therapy_win | adoption | special_event | custom`), title, date, end_date, recipient_id, theme, color, icon, cover_url, budget_cents, status (`planning | in_progress | done`), notes, recurs_yearly, parent_celebration_id (for recurrences), person_age_anchor (birth year for birthdays).
- `celebration_tasks` — id, celebration_id, title, category (`decor | cake | gifts | food | invitations | other`), done, due_offset_days (so tasks shift with the date), linked_task_id (nullable mirror into `tasks`).
- `wishlist_items` — id, celebration_id (or person_id), title, link, price_cents, claimed_by, done.
- `holiday_plans` — id, holiday_id (FK to existing `holidays`) OR custom_name+date, category (`federal | religious | family | seasonal | custom`), budget_cents, color, icon, notes, status.
- `holiday_timeline_steps` — id, holiday_plan_id, days_before, title, notes, done, sort_order.
- `traditions` — id, title, description, anchor (`christmas_eve | thanksgiving | first_snow | birthday | custom_date | season`), anchor_date (mm-dd or full ISO when custom), category, icon, color, recurs_yearly, active.
- `tradition_items` — id, tradition_id, title, sort_order.
- `tradition_instances` — id, tradition_id, year, started_at, completed_at, notes (per-year checklist state in `item_state jsonb`).
- `bucket_lists` — id, season (`spring|summer|autumn|winter|all`), year (nullable for evergreen), title, color, icon, is_shared.
- `bucket_items` — id, list_id, title, done, done_at, photo_url, sort_order.
- `seasonal_goals` — id, season, year, title, done, notes, sort_order.
- `remembrances` — id, name, kind (`person | pet | date`), birth_date, remembrance_date, photo_url, story, show_prompts.
- `memory_book_entries` — id, title, body, date, group_type (`season | holiday | birthday | celebration | year`), group_key (e.g. `summer-2026`, `holiday:<uuid>`, `celebration:<uuid>`), media (jsonb array of {kind, url, caption}), cover_url, mood, linked_celebration_id, linked_holiday_id, linked_memory_id (FK to existing `memories` for cross-link).

`memory_book_entries` is its own table (separate from the existing journaling `memories`) so the scrapbook view can group, paginate, and cover-image without entangling journal flows. A `linked_memory_id` allows promoting an existing memory into the scrapbook.

### Calendar integration

Add a new event source `seasons` to `CalendarPage`:

- New filter chip "Celebrations" in `CalendarFilters`, persisted via `useCalendarPrefs`.
- A `useSeasonsCalendarEvents(range)` hook returns merged events from `celebrations`, `traditions` (expanded for the visible years), `bucket_items` with a due date, and lunar celebration anchors.
- Events render with category icon + soft tint; clicking opens the relevant planner detail page. Nothing is mirrored into `appointments`, so the existing realtime/LWW sync covers the new tables instead.
- `SummaryStrip` gains an "Upcoming Celebrations" tile and uses the same chip toggle.

### Pages

- **Seasons Dashboard** (matches the screenshot): hero "Summer is here!" with seasonal focus card, Today's Rhythm panel (reuses `TodaysRhythmCard`), Next Holiday card, Celebration Planner, Traditions This Month, Seasonal Bucket List, Memory Highlight carousel, Upcoming Birthdays, Care Milestones, Holiday Prep Progress, Celebration Budget. Multi-column grid on desktop, swipeable / stacked on mobile.
- **Seasons**: season detail + custom seasonal focus list + goals editor.
- **Celebrations**: filterable grid; "+ New celebration" opens an editor sheet with kind, date, recipient, theme, budget, cover.
- **Celebration Detail / Birthday Planner**: countdown, age (derived from birth year), wishlist, theme, checklist grouped by category (decor / cake / gifts / food / invitations), budget bar, memory timeline (linked `memory_book_entries` for this celebration).
- **Holidays**: federal/religious/family/seasonal/custom tabs, each card showing countdown + prep progress.
- **Holiday Detail**: prep timeline with seeded defaults (90 / 60 / 30 / 14 / 7 / 1 days) that the user can edit, plus checklist, budget, notes, gift list.
- **Traditions**: library + "This year" view; saving a tradition seeds a `tradition_instance` for the current year and auto-creates next year's on completion when `recurs_yearly`.
- **Memory Book**: Timeline / Gallery / Story toggle; group filters (season, holiday, birthday, celebration, year); entry editor supports photos, videos, voice notes, journal entries.
- **Bucket Lists**: seasonal lists with progress, completion confetti, sharing toggle.
- **Remembrance**: gentle pages with photo, story, annual reminder; opt-in prompts surface on the dashboard around the date.

### Lunar Celebrations

Reuse `lib/moon-phase.ts` / `LunarPhaseWidget`. Compute upcoming New / First Quarter / Full / Last Quarter dates for the next 90 days. Each gets a card with reflection prompt + family activity + journal prompt (saving the journal entry creates a linked `journal_entries` row). Surfaced on the Seasons Dashboard and in the Calendar feed.

### AI Assistant

Add a single new Edge Function `ai-seasons-assistant` (Lovable AI Gateway) with `mode` parameter for: `party_ideas`, `holiday_checklist`, `seasonal_activities`, `gift_suggestions`, `tradition_ideas`, `memory_prompts`, `journal_prompts`. Inputs include season, atmosphere, family ages (derived from recipients + birthdays), prior celebrations/traditions, calendar density. Output applied via "Insert" buttons that create celebration tasks / bucket items / journal entries.

### Mobile vs desktop

- Desktop: 3–4 column dashboard grid, persistent left sidebar nav, planner detail with split editor + sidebar.
- Mobile: swipeable hero cards (Celebration of the Day, Holiday Countdown, Bucket List, Memory of the Day, Quick Add Tradition), bottom-sheet editors, FAB for Quick Add.

### Future MoneyFlow hook

Celebrations and holidays carry `budget_cents`. A small `CelebrationBudgetCard` shows spent vs total using a placeholder `spent_cents` field (manual entries for now). A `linked_money_category` column is reserved so MoneyFlow can plug in later without a migration.

### Out of scope for this pass

- Full MoneyFlow integration (only manual budget tracking now).
- Sharing bucket lists across households (toggle exists; share link wiring is later).
- Native push notifications for remembrance prompts (in-app only this pass).

### Technical details

- New folder `src/components/seasons/` for dashboard widgets and editors; `src/pages/seasons/` for routes; `src/lib/seasons/` for hooks (`useCelebrations`, `useHolidayPlans`, `useTraditions`, `useBucketLists`, `useMemoryBook`, `useRemembrance`, `useSeasonsCalendarEvents`).
- Realtime: each new table added to `supabase_realtime` publication with `REPLICA IDENTITY FULL`; subscriptions extend the pattern already in `store.tsx` calendar-sync (or live in `src/lib/seasons/realtime.ts` to keep the store lean).
- Offline + conflict resolution: routed through the existing `syncOp` helper and LWW logic; same `updated_at` LWW pattern already used by calendar tables.
- Storage: photos / videos / voice notes for memory book and remembrance use a new `memory-book` private storage bucket with per-user RLS, surfaced via signed URLs.
- Edge function `ai-seasons-assistant` follows the existing pattern (`npm:@supabase/supabase-js@2/cors`, JWT validation, Zod input validation, Lovable AI Gateway).
- All colors via existing semantic tokens; category visual language extends the icon+shape system from the Calendar refactor (Celebration → Sparkles + diamond, Tradition → Repeat + rounded square, Bucket → Square check + circle, Remembrance → Heart + soft).
