# CareFlow Upgrade Plan

You picked all four focus areas. To keep quality high, I'll ship them in **4 phases**, each a self-contained working release. After each phase the app is fully usable; nothing is left half-built.

Aesthetic stays: dark plum, gold accents, soft shadows, rounded calm UI. New animations use the existing token system in `index.css` / `tailwind.config.ts`.

---

## Phase 1 — AI Meal Planner + Grocery Generator
- New edge function `ai-meal-plan` calling Lovable AI Gateway (`google/gemini-3-flash-preview`) with structured tool-calling output.
- Inputs: dietary prefs, allergies, picky eaters, budget, family size, prep time, low-energy flag.
- New table `meal_preferences` (per user, single row, JSONB).
- "Plan My Week" button on Meals page → generates 7 days × 4 slots (B/L/D/Snack), writes to existing `meals` table.
- Auto-populates `grocery_items` (categorized: produce / pantry / protein / dairy / other), de-duped.
- Recipe card drawer per meal: ingredients, steps, prep time, "save favorite", "regenerate this meal".
- New table `favorite_meals`. New table `pantry_items` (simple list, checkable).
- "Low energy meals" tag filter.

## Phase 2 — Advanced Calendar (day / week / month / year + time-blocking)
- Refactor `CalendarPage.tsx` into a unified `<CalendarShell>` with view switcher + date picker (already partly there).
- **Day view**: hourly grid (6am–11pm), click-and-drag to create time block, drag edges to resize, drag body to move. Backed by new `time_blocks` table (start/end timestamps, category, color, optional task_id).
- **Week view**: 7-column hourly grid, same interactions.
- **Month view**: existing grid + colored dots per category.
- **Year view**: 12 mini-months heatmap by event density.
- **Recurring events**: RRULE-lite (`recurrence_type`, `recurrence_interval`, `recurrence_days`) — reuse pattern from `tasks`.
- **Category colors**: `event_categories` table (user-defined) + 8 sensible defaults seeded.
- Unified feed merges: appointments, birthdays, holidays, goal deadlines, habits, meals, cleaning tasks, caregiving notes, Google Calendar events (already wired).
- Embed matching view on Today / Week / Month / Year pages via the same component.
- Framer-motion view transitions (already installed? — will check; otherwise CSS-only via existing `animate-fade-in`).

## Phase 3 — Movable/Editable Dashboard (full grid)
- Add `react-grid-layout` (the de-facto choice; works with Vite/React 18).
- New table `dashboard_layouts` (id, user_id, name, is_default, layout JSONB, hidden_widgets TEXT[]).
- "Customize Dashboard" toggle in header → enables drag/resize handles, glow plum borders, "+ add widget" picker, "save layout", "new layout", layout switcher dropdown.
- Widget registry pattern: each existing dashboard section becomes a `<Widget id="...">` entry. Widgets list matches your spec (Today Focus, Appointments, Meals, Weekly Reset, Habit Snapshot, Budget*, Weather, Moon Phase, Journal Prompt, Goals Progress, Focus Analytics*, Home Reset, AI Meal Suggestions, Calendar Preview, Caregiving Notes). *Budget and Focus Analytics ship as placeholder widgets in this phase — full features deferred to a later round (out of scope here).
- Per-widget edit dialog where it makes sense (e.g. journal prompt source, weather location).
- Optimistic save with debounce.

## Phase 4 — Themes, Dashboard Header Image, Hover Polish
- 6 themes via CSS variable swap on `<html data-theme="...">`: dark-plum (current), moonlight, sage, warm-cream, midnight, rose-dusk. All defined in `index.css` using HSL tokens — no component color changes needed.
- Theme picker in Settings; persists to `profiles.theme` (column exists).
- Dashboard hero/header: image (Unsplash search via their public source URL OR upload to a new `dashboard-headers` storage bucket), gradient overlay, blur slider, optional inspirational text overlay, "change mood" reroll button. Stored in `profiles` (new JSONB `dashboard_header`).
- Hover polish pass: add `.hover-glow` utility (plum ring + soft scale) to widgets, cards, calendar cells, checklist items. Smooth checkbox completion animation utility class.

---

## Out of scope for this round (call out so it's not forgotten)
- Budget/finance system (full)
- AI home reset generator
- Goals/habits deep upgrade
- Focus analytics graphs
- Apple Calendar sync (Google already done)
- Kanban horizontal week toggle (week view changes will be in Phase 2 calendar; full kanban can be a later round)

These are real items from your message — I'll queue them for the next round once Phases 1–4 land.

---

## Technical notes (skim if non-technical)

- All new tables get RLS `auth.uid() = user_id` policies, matching existing pattern.
- All AI calls go through edge functions, never client-side. Tool-calling for structured output (per Lovable AI guidelines).
- New deps: `react-grid-layout` (Phase 3), `framer-motion` if not present (Phase 2). I'll check before installing.
- No changes to `src/integrations/supabase/client.ts` or `types.ts` (auto-managed).
- Existing data preserved; migrations are additive.

---

## What I need from you

1. **Approve this phased plan** (or tell me to combine/cut phases).
2. Confirm I should start **Phase 1 (AI Meal Planner)** immediately after approval.
3. Any dietary defaults you want pre-seeded for your own account? (optional)
