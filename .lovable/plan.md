# Mental Load + Decision Support

A new `/mental-load` surface in CareFlow that acts as a calm second brain for caregivers and neurodivergent planners. Tone: soft, supportive, never productivity-shaming.

## What ships in this phase

### 1. Mental Load page (`/mental-load`)
New route + sidebar entry (sage leaf icon). Calm hero with today's gentle check-in summary ("You're carrying a moderate load today — here's a softer plan"). Page is organized into 4 panels in a single flowing column on mobile, two columns on desktop:

```text
┌──────────────────────────────────────────────────┐
│  Today, gently — soft summary + tone copy        │
├────────────────────────┬─────────────────────────┤
│  Brain Dump Inbox      │  Overwhelm Check-in     │
│  Quick capture + AI    │  Energy · Emotional ·   │
│  sort into buckets     │  Caregiving sliders     │
├────────────────────────┼─────────────────────────┤
│  Priority Assistant    │  Decision Support       │
│  Today / Can wait /    │  Prompt cards →         │
│  Delegate / Low-energy │  AI gentle answer       │
├────────────────────────┴─────────────────────────┤
│  Minimum Viable Day · template + "Activate"      │
├──────────────────────────────────────────────────┤
│  Gentle rhythm — 14-day check-in heatmap         │
└──────────────────────────────────────────────────┘
```

### 2. Brain Dump Inbox
- Single textarea + mic button → drop thoughts without organizing
- Each capture saved instantly to `brain_dumps`
- "Sort gently" button calls AI to assign one of: `task`, `appointment`, `errand`, `worry`, `idea`, `someday`, `routine` + optional one-line cleaned title
- Sorted items show pills, can be one-click promoted to `tasks` (existing table) or archived
- Voice capture via Web Speech API (no extra dep)

### 3. Overwhelm Check-in
- Three soft sliders: energy (1–5 leaf icons), emotional weight (1–5 heart), caregiving load (1–5 hand). Optional note.
- Saved once per day to `mental_load_checkins` (upsert by date)
- Drives the Priority Assistant and the Minimum-Viable-Day auto-activation

### 4. Priority Assistant
- Pulls today's `tasks` (existing table) + latest check-in + caregiving counts
- AI returns 4 buckets: Most important · Can wait · Could delegate · Low-energy wins
- Each bucket is a gentle list with one supportive sentence at the top ("Two things would be enough today.")

### 5. Decision Support
- 5 preset prompt chips: "What matters most today?" · "What will reduce stress tomorrow?" · "What's actually urgent?" · "What can be simplified?" · "What would future me appreciate?"
- Tapping a chip streams an AI answer rooted in the user's current load + tasks
- Answers are ephemeral (not stored) so it stays low-pressure

### 6. Minimum Viable Day
- Editable list of 5 gentle defaults (drink water, feed family, one home reset, one important task, rest)
- Stored per-user in `minimum_viable_day`
- "Activate today" button surfaces only this list in the Priority Assistant and hides everything else with a soft "The rest can wait" banner (state stored in `mental_load_checkins.minimum_mode`)

### 7. Gentle rhythm strip
- 14-day heatmap of energy + overwhelm from `mental_load_checkins`
- Pure SVG, no chart lib. One supportive insight under it ("Thursdays tend to feel heaviest — consider a softer plan.")

## Database (new tables, all RLS-protected by user_id)

- `brain_dumps` — raw text, ai_category, ai_title, status (inbox/sorted/promoted/archived)
- `mental_load_checkins` — date (unique per user), energy 1-5, emotional 1-5, caregiving 1-5, note, minimum_mode bool
- `minimum_viable_day` — one row per user, items text[] (default 5 gentle items)

## Edge function: `ai-mental-load`
Single function, action-routed (`categorize_dump`, `prioritize`, `decision_support`, `simplify`). Uses Lovable AI gateway with `google/gemini-3-flash-preview`, tool calls for structured returns. System prompt enforces the tone rules (no shaming, soft phrasing, never use "should/must/overdue").

## Connected planning
- Reads from existing `tasks`, `cleaning_tasks`, `care_recipients`, `meal_plan_entries`
- Promote-to-task writes back into `tasks` with `area="Self"` and inherits Mental Load tag
- No changes to those existing tables

## Design system
- Reuses existing semantic tokens. Adds a `calm` accent variant for SectionCard if not present (sage→cream gradient).
- Sage/cream/tan palette already in tokens; uses `font-display` for soft headings, generous padding, rounded-3xl cards, motion-safe fade-ins.

## Out of scope this phase (can layer later)
- Streaming voice transcription via ElevenLabs (we use browser Web Speech free path)
- Cross-device push notifications for recovery suggestions
- Sharing minimum-viable-day with a partner

## Files

New:
- `supabase/migrations/<ts>_mental_load.sql`
- `supabase/functions/ai-mental-load/index.ts`
- `src/pages/MentalLoad.tsx`
- `src/components/mental-load/BrainDumpInbox.tsx`
- `src/components/mental-load/OverwhelmCheckin.tsx`
- `src/components/mental-load/PriorityAssistant.tsx`
- `src/components/mental-load/DecisionSupport.tsx`
- `src/components/mental-load/MinimumViableDay.tsx`
- `src/components/mental-load/GentleRhythm.tsx`
- `src/lib/mental-load.ts` (queries + types)

Edited:
- `src/App.tsx` (add route)
- `src/components/layout/AppSidebar.tsx` (or equivalent — sidebar link)
