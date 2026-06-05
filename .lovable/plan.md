## Vision

Turn CareFlow into a CARE-shaped life OS: every module funnels into one loop — **Capture → Anchor → Rhythm → Exhale**. The CARE Hub becomes the home base; anchors give every action a "why"; Care Guide AI narrates the loop.

Because this is a full rollout, the work is staged across 4 milestones. Each milestone ships a usable slice — you'll see progress between turns rather than waiting for one giant build.

---

## Milestone 1 — CARE Hub + Anchor model

**Goal:** Replace `/care-loop` with the new hub and give the app a shared anchor concept.

- **Nav + route**
  - Add `CARE Hub` as a primary nav item (sidebar + bottom nav `More`).
  - Replace `src/pages/CareLoop.tsx` route content with the new hub experience; keep `/care-loop` URL for back-compat.
  - Hub layout: 4 large interactive cards (Capture · Anchor · Rhythm · Exhale) using atmosphere theme + `framer-motion` reveal, plus a top "Care Guide brief" slot (filled in M3) and a bottom "Today's loop" strip linking to Inbox / Today / Routines / Journal.

- **Anchor model (reuse pillars)**
  - Treat the existing `care_profile.pillars_enabled` (Home, Health, Care, Heart, Wealth, Mind, Time) as the canonical anchor list.
  - New shared module `src/lib/anchors.ts` exposing `ANCHOR_META`, `useAnchors()`, default anchor → pillar mapping, icons, colors, and the spec's 6 friendly labels (Home, Family, Wellness, Finances, Growth, Reflection) layered as display aliases over the pillars.
  - Allow custom anchors via a lightweight `anchors` table (id, user_id, key, label, icon, color, pillar) so users can add to defaults without touching the pillar enum.
  - Add nullable `anchor_id uuid` to `tasks`, `goals`, `routines`, `habits`, `journal_entries`, `meals`, `notes` (single migration with GRANTs already covered by existing tables).

- **Anchor dashboard card** on CARE Hub: per-anchor % "flow" derived from last-30-days counts of completed tasks + logged habits + routine completions per anchor.

Acceptance: nav shows CARE Hub, hub renders 4 phase cards + anchor flow, every existing pillar appears as an anchor, anchors can be tagged on tasks via the existing task editor.

---

## Milestone 2 — Capture + Anchor wiring

**Goal:** Make capture truly universal and connect actions to anchors with one click.

- **Capture experience** (`/care/capture`, also rendered from the hub card)
  - Unified entry with tabs: Quick add · Voice · Note · Photo · Grocery · Task · Event · Idea · Journal — reusing existing `QuickAddFab`, `AIAssistantFab` voice path, `Inbox`, `Notes`, `GroceryList`, `BrainDumps`.
  - "Captured Successfully" confirmation surface (✓ chips) after each save.

- **AI Capture Assistant (edge function `ai-capture-route`)**
  - Input: free-form text or transcript. Output: array of routed items `{ module: "meal"|"family"|"plan"|"home"|"well"|"money"|"cosmic", action: "grocery"|"task"|... , payload }`.
  - Uses Lovable AI Gateway (`google/gemini-3-flash-preview`) with structured output (Zod schema).
  - Client applies the actions via existing stores (`store.tsx`, `grocery-*`, `tasks`, `appointments`).

- **Anchor suggestion on task create**
  - Extend `TaskEditor` + `nlp-task.ts` to call a small client-side keyword classifier; on save, if `anchor_id` is empty, show a soft prompt: *"This looks connected to Home — Add?"*.
  - Same prompt added to goal create and meal plan create.

Acceptance: pasting *"I need milk, Isaac needs shoes, schedule dentist, call Nana's doctor"* into the Capture box routes 4 items and shows the confirmation chips; new tasks suggest an anchor.

---

## Milestone 3 — Rhythm + Care Guide AI

**Goal:** The proactive Care Guide and a rhythm dashboard.

- **Rhythm dashboard** (`/care/rhythm`) composes existing widgets:
  - `CareLoopIndicator` (rhythm phase), `RoutinesStrip`, `RhythmForecastCard`, calendar week strip, cycle/moon if enabled, family commitments list.
  - New `RhythmInsights` cards (daily morning/afternoon/evening + weekly productive/recovery/family/home-heavy days) computed from tasks + completions + appointments.

- **Care Guide AI (replaces AI Assistant FAB)**
  - Rename `AIAssistantFab` → `CareGuideFab` with new icon + tone; keep the same drawer shell.
  - New edge function `ai-care-guide` returning a structured daily brief: `focus[]`, `anchor_reminder`, `rhythm_insight`, `dinner_suggestion`, `exhale_prompt`. Cached per-day per-user in a new `care_guide_briefs` table.
  - Hub "Good morning" card uses the brief; FAB chat uses the same system prompt + can call existing AI capture + anchor tools.
  - Proactive nudges (Thursday-overloaded, light-Friday, after-lunch chores) generated as part of `rhythm_insight`.

Acceptance: opening CARE Hub in the morning shows a generated brief; the floating assistant is now Care Guide and answers within the CARE frame.

---

## Milestone 4 — Exhale + cross-module CARE language

**Goal:** Reflection surfaces and consistent CARE vocabulary across every flow.

- **Exhale**
  - Daily Exhale: end-of-day card (4 prompts) writing to `journal_entries` with `phase = "exhale"`.
  - Weekly Exhale: generated summary card (counts of tasks/family events/home resets/habit streaks + 2-3 narrative highlights via `ai-care-guide` mode `weekly`). Saved to `weekly_reviews`.
  - Monthly Exhale: visual report page (`/care/exhale/month`) with simple charts using existing recharts: home progress, wellness trends, money progress, goal completion, memory highlights.

- **Module integration (light-touch, copy + linking)**
  - Add a small "Where am I in the loop?" header (`CareLoopIndicator`) to: Today, Inbox, Routines, Journal, HomeHub, Meals, Caregiving, WealthHub, Health, CosmicFlow.
  - Add an "Anchor:" pill to relevant detail editors (task, goal, routine, habit, meal, journal).
  - Add CARE-labelled section headers in each module as listed in the spec (PlanFlow / HomeFlow / MealFlow / FamilyFlow / WellFlow / MoneyFlow / CosmicFlow).

- **Atmosphere integration**
  - CARE Hub copy variants per atmosphere (calm / focus / soft / cosmic) read from a new `src/lib/care-copy.ts` keyed by `atmoId`.
  - Animation intensity respects existing `applyAnimIntensity`.

Acceptance: every primary page shows the loop indicator; daily/weekly/monthly exhale flows work; tone shifts with atmosphere.

---

## Technical details

**New files (high level)**
- `src/pages/CareHub.tsx`, `src/pages/CareCapture.tsx`, `src/pages/CareRhythm.tsx`, `src/pages/CareExhale.tsx`, `src/pages/CareExhaleMonth.tsx`
- `src/components/care/{PhaseCard,AnchorFlowCard,CareGuideBrief,RhythmInsights,DailyExhale,WeeklyExhale}.tsx`
- `src/lib/anchors.ts`, `src/lib/care-copy.ts`, `src/lib/care-guide.ts`
- `src/components/ai/CareGuideFab.tsx` (renamed AIAssistantFab)
- Edge functions: `ai-capture-route`, `ai-care-guide`

**Schema migrations (one per milestone)**
- M1: `anchors` table (+ GRANTs + RLS); add `anchor_id uuid` to `tasks`, `goals`, `routines`, `habits`, `journal_entries`, `meals`, `notes`.
- M3: `care_guide_briefs` table (user_id, date, brief jsonb, model, created_at) with `unique(user_id, date)`; full GRANT + RLS block.
- M4: add `phase text` to `journal_entries` (nullable; "capture"|"anchor"|"rhythm"|"exhale").

**AI**
- Both functions use Lovable AI Gateway via the shared helper; default model `google/gemini-3-flash-preview`; structured output via `Output.object` with Zod; CORS + JWT-in-code; surface 402/429 in UI.

**Backwards compatibility**
- `/care-loop` stays as a redirect to `/care`.
- Existing pillar UI keeps working; anchors are an additive concept.
- Tasks without `anchor_id` continue to render fine; the anchor pill is optional everywhere.

---

## What ships first

If you approve, I'll implement **Milestone 1** in the next turn (CARE Hub page, nav entry, anchor module + migration, anchor flow card). Then we can decide milestone order from there — happy to reorder if, say, you want Care Guide AI before Exhale.