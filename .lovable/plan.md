# Inbox Redesign Plan

Refactor `src/pages/Inbox.tsx` (currently 1021 lines, contains the existing combined Quick Capture/Quick Add UI) into a calmer, mobile-first command center that matches the attached reference. Keep all existing data wiring (`useStore`, `addTask`, AI triage, voice capture, tag picker, ProcessInboxDialog) — this is a presentation/layout rewrite, not a logic change.

## Page sections (in order)

1. **Capture Card** — hero with `✨ Capture something` + subtitle `Get it out of your head. We'll help with the rest.` A single large multiline textarea (`What's on your mind?`) with mic + green `+ Add` button inside. No metadata fields pre-capture. After submit, the existing AI triage suggests action/priority/category/tags/date/project/area on the new row. Keep Task, Home, Care, Meal, Note, Connect, Commute options. With morning/afternoon/evening time allocation.
    

2. **Quick Actions** — 11 small pill chips (h≈32px, rounded-full, white bg, soft ring, colored icon + label): Call, Text/Email, Medication, Grocery, Appointment, Errand, Paperwork, Pay, Help, Cook, Clean. Wrap on ≥md; horizontal scroll on mobile. Selecting a pill prefills the Action when the next task is created.
3. **AI helper line** — centered `✨ I'll suggest details after you add it.` in muted text.
4. **Held in your inbox** — section header with count + inline `✨ Organize this for me` button (triggers existing triage). Right side: `Sort: Recently added` dropdown. Table below with columns: checkbox · Task (title + category chips) · Action (icon+label) · Date (icon+label) · Priority (icon+label, no colored badge) · ⋯ menu. Row hover elevation, entire row clickable to open TaskEditor.
5. **Daily Rhythm card** (right rail) — `Good afternoon, Dena` greeting + 3 metric rows (Tasks scheduled, Ideas captured, Inbox items).
6. **Suggested for you** — single AI suggestion card with tags, date, priority + Accept/Edit buttons.
7. **Priority Check-in** — rename subtitle to `How's your workload right now?`. Four cards: 🍃 Gentle, ☀️ Normal, 🔥 Focus, 🌙 Someday with task counts. Click to filter inbox by priority; highlight active.
8. **Let AI help you** — CTA card with `Ask CareFlow` primary button (routes to Carey).

## Responsive behavior

- **Desktop (≥lg):** 2-column grid — main column (1–4) on left, right rail (5–8) stacked on right.
- **Tablet (md):** single column; right-rail cards stack below the inbox.
- **Mobile (<md):**
  - Capture card pinned near top.
  - Quick Actions horizontally scrollable (snap, hide scrollbar).
  - Inbox table becomes task **cards** (title, chips, action, date, priority, checkbox, ⋯).
  - Gestures on task cards: swipe-left → schedule, swipe-right → complete, long-press → AI organize.

## Visual system

- Reuse existing CareFlow tokens (cream `bg-card`, forest green primary, semantic `text-foreground`/`text-muted-foreground`). No hardcoded colors.
- Card radius `rounded-3xl` (~24px), soft shadow `shadow-sm`/`shadow-md`, generous `p-6` / `p-8` spacing, `gap-6` between cards.
- Animations: 150–250ms ease transitions, fade-in for new rows, subtle hover lift. Respect `prefers-reduced-motion`.
- Min 44px tap targets, aria-labels on icon buttons, keyboard-accessible row activation.

## Technical implementation

- Rewrite the `InboxInner` render in `src/pages/Inbox.tsx`. Extract three new presentational components in `src/components/inbox/`:
  - `CaptureHero.tsx` — textarea + mic + Add, owns nothing; receives draft/setDraft/onSubmit/onMicHold from parent (parent keeps all existing recorder + AI logic).
  - `QuickActionPills.tsx` — pill row with 10 actions; takes `active` + `onSelect`. Defines the new `QUICK_ACTIONS` array (icon, label, action key, tint).
  - `InboxTaskRow.tsx` / `InboxTaskCard.tsx` — desktop row + mobile card variants. Card variant wraps body in a swipe handler using existing `long-press-drag` util or a small inline pointer handler (translateX with threshold ~80px; left=schedule via `updateTask({status:'scheduled'})`, right=complete via `updateTask({done:true})`, long-press 600ms → trigger triage on that single task).
- Add an `actionKey` field to the in-memory task draft only when a Quick Action is selected; map it to the existing `tags`/`area` flow already in `submitCapture` (no schema change).
- Daily Rhythm metrics derived from `state.tasks` (scheduled count for today, ideas captured = inbox notes today, inbox items = `inboxTasks.length`).
- Priority Check-in counts derived from `state.tasks` filtered by `priority`. Clicking sets local `priorityFilter` state used by the inbox list.
- Reuse `ProcessInboxDialog` for "Organize this for me" and `VoiceReviewSheet` for mic capture — unchanged.
- Keep `TaskSelectionProvider`, `BulkActionBar`, `TaskDetailPane` wiring intact.
- No new dependencies. No DB/edge function changes. No changes to `src/lib/store.ts` or types.

## Files touched

- `src/pages/Inbox.tsx` — rewrite render, keep state/effects/handlers.
- `src/components/inbox/CaptureHero.tsx` — new.
- `src/components/inbox/QuickActionPills.tsx` — new.
- `src/components/inbox/InboxTaskCard.tsx` — new (mobile card + swipe).
- `src/components/inbox/DailyRhythmCard.tsx`, `SuggestedForYou.tsx`, `PriorityCheckinCard.tsx`, `AskCareFlowCard.tsx` — new small right-rail cards extracted from existing markup where present.

## Out of scope

- No backend, schema, or AI-prompt changes.
- No changes to global navigation, sidebar, or top bar.
- Dark mode uses existing tokens — no new theme work.