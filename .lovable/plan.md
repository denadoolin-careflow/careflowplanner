# Carey — Intelligent Life Companion

Carey replaces the generic "AI" surface with a named companion that lives inline across notes, tasks, projects, goals, habits, journal, and a dedicated command center. It uses Lovable AI (Gemini flash by default) with persistent threaded chat and a long-term memory profile.

Rollout is split into 6 phases so each ship is usable on its own. We'll execute one phase per turn — you approve, I build, we move on.

---

## Phase 1 — Foundation (rebrand + data + chat backbone)

Goal: stand up Carey's identity, persistence layer, and reusable chat primitive.

- Rename floating AI button + AICaptureDialog UX copy to **Carey**. Keep the FAB; new Carey-leaf icon + warm tone copy.
- New AI Elements-based `<CareyChat />` component (Conversation/Message/PromptInput/Tool, no Sparkles, custom Carey avatar asset).
- New edge function `carey-chat` using AI SDK `streamText` + `toUIMessageStreamResponse`, system prompt defining Carey's personality (warm, encouraging, non-judgmental, capacity-aware).
- Database (one migration):
  - `carey_threads` (id, user_id, title, context_type, context_id, last_message_at)
  - `carey_messages` (id, thread_id, role, parts jsonb, created_at)
  - `carey_memory` (id, user_id, kind enum: preference|pattern|goal|fact|wellness, key, value jsonb, confidence, source, updated_at) — the stored memory profile
  - `carey_insights` (id, user_id, kind, payload jsonb, surfaced_at, dismissed_at) — for proactive cards
  - RLS scoped to `auth.uid()`, GRANTs to authenticated + service_role.
- Live-context loader (`src/lib/carey/context.ts`) that snapshots goals, today's tasks, recent journal, cycle phase, caregiving load on each request; combined with stored `carey_memory` rows in the system prompt.

## Phase 2 — Carey Command Center (`/carey`)

- New route `/carey/:threadId?` with sidebar of threads + chat pane (threaded, DB-backed, route-driven active thread).
- Daily Briefing card at top: Today's Focus, Deadlines, Wellness Check, Habit Snapshot, Family Commitments. Generated on first visit each day, cached in `carey_insights`.
- Quick-ask chips: "What should I focus on today?", "Why am I overwhelmed?", "Plan my week", "What am I forgetting?".
- New thread auto-titles from first message.

## Phase 3 — Embedded Carey actions

Reusable `<CareyButton context={...} />` (leaf icon, replaces existing per-surface AI buttons over time):

- **Notes**: summarize, extract action items → create tasks, create project from note, generate tags, rewrite, brainstorm, find related, identify decisions, "ask Carey about this note" (opens thread with note pinned as context).
- **Tasks**: break into subtasks, estimate effort/time, suggest priority, schedule, detect blockers, suggest next action, delegation hint. Postpone-counter trigger: "This task has been postponed N times…".
- **Projects**: plan generation, milestones, timeline, stalled-work detector, risk surfacing, next steps panel.
- **Goals**: connect to projects, weekly action suggestions, neglected-goal detector ("X hasn't received attention in 18 days").
- **Habits**: consistency trends, habit stacking, easier-version suggestions, drop-off analysis.
- **Journal**: summarize, recurring themes, emotion tracking, wins, reflection prompts, link insights to goals.

Each action calls `carey-chat` with a structured `action` + `context` payload so server controls the prompt.

## Phase 4 — Carey Insights Dashboard widget

- New `CareyInsightsWidget` for Dashboard: Current Focus, Goal Momentum, Energy Forecast, Stress Signals, Family Balance ring (family / caregiving / home / personal / wellness / projects time distribution), Pattern Detection list.
- Backed by nightly-ish refresh function `carey-insights-refresh` (called on dashboard open if stale > 6h) writing into `carey_insights`.

## Phase 5 — Intelligent planning + proactive Carey

- **Capacity engine** (`src/lib/carey/capacity.ts`): historical completion rate vs scheduled hours → "you scheduled 12h but typically complete 4–5h. Rebalance?"
- **Burnout detector**: 3-week trend of workload + journal sentiment + missed self-care habits → recovery-day suggestion.
- **Cross-system bridges** (suggestions surfaced as toasts/inbox cards): notes→tasks, journal→wellness, goals→projects, habits→wellness, tasks→calendar (better-day suggestion).
- **Proactive cards** on Today page: forgotten work, celebrations, neglected goals, weekly reflection auto-generated Sunday, monthly review on the 1st.

## Phase 6 — Command palette + polish

- ⌘K command palette extension: "Ask Carey", "Plan my week", "Review goals", "Summarize project", "Find notes" with Carey routing.
- Carey avatar/illustration asset (generated), warm color accent token `--carey`.
- Tone QA pass on every Carey-authored string. Add cycle-awareness toggle in settings.
- Telemetry: per-action counters in `ai_usage` already; add Carey-specific kind tagging.

---

## Technical details (per phase, condensed)

```text
edge functions: carey-chat, carey-insights-refresh, carey-action (one-shot non-streaming)
client lib:    src/lib/carey/{context.ts, memory.ts, capacity.ts, prompts.ts, actions.ts}
components:    src/components/carey/{CareyChat.tsx, CareyButton.tsx, CareySidebar.tsx,
                                     CareyBriefing.tsx, CareyInsightsWidget.tsx,
                                     CareyAvatar.tsx, CareyThreadList.tsx}
routes:        /carey, /carey/:threadId  (React Router, params drive active thread)
ai sdk:        useChat + DefaultChatTransport → /functions/v1/carey-chat
models:        google/gemini-3-flash-preview (chat), google/gemini-2.5-flash-lite (briefing/insights batch)
memory writes: server-side after each thread turn, model is asked to emit optional
               {memory_updates:[{kind,key,value}]} JSON tail that we parse and upsert
```

## What I'd ship first

Phase 1 only — that's the foundation everything else builds on, and it's already meaningful (rebranded Carey FAB + working threaded chat with live context + memory persistence). Approve and I'll build it; we'll iterate on Phases 2–6 in subsequent turns.
