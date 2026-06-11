
# Phase 2 — Ship items 5, 6, 7

Three additive changes. No DB, no edge functions, no removed APIs.

## 5. Unified card primitive — `FlowCard`

**New:** `src/components/ui/flow-card.tsx`

A thin wrapper over the existing `Card` that standardizes the look used today across Cosmic, Carey, and Today panels:

- One shadow token (`shadow-soft`/`shadow-cozy`), one border radius (`rounded-2xl`), one border (`border-border/60`), one bg (`bg-card/70 backdrop-blur`).
- Variants via `cva`:
  - `tone`: `default | cosmic | carey | today | calm` — sets a soft top-gradient (e.g. cosmic uses violet, today uses primary, carey uses rose) sourced from existing flow-accent tokens.
  - `size`: `sm | md | lg` (padding).
  - `interactive`: adds hover lift + focus ring.
- Sub-parts re-exported: `FlowCardHeader`, `FlowCardTitle`, `FlowCardEyebrow`, `FlowCardActions`, `FlowCardBody`, `FlowCardFooter`. Eyebrow is the small uppercase tracked label already used everywhere.
- Replaces no existing usage in this phase — net-new primitive. Migration of individual call-sites is a follow-up; Capacity sheet (below) and a single representative card on Today + Carey + Cosmic adopt it now so the shared style is visible.

Touched today (light migration, ~3 sites):
- `src/components/today/rhythm/RhythmHeader.tsx` — wrap the affirmation/quick-add region.
- `src/components/carey/CareyChat.tsx` — chat container header card.
- `src/components/cosmic/TransitDetailSheet.tsx` — inner section cards.

## 6. Collapsed-sidebar count dots

**Edit:** `src/components/layout/Sidebar.tsx`

When `collapsed` is true, each Flow group icon in the rail shows a small dot (8px) when there is "something for today" inside that flow. Counts are cheap and read from the store:

| Flow | Signal |
|---|---|
| planflow | tasks where `dueDate === todayISO()` and not done |
| careflow | open caregiver checkins for today (`state.checkins`) |
| homeflow | overdue/today meals slots or pantry low-stock count |
| wellflow | habits not yet completed today |
| growthflow | goals with a milestone due today |
| moneyflow | bills due today (skip if data absent) |
| lunarflow | any cosmic event today (`eventsOnDay(new Date())`) |
| seasonsflow | celebrations/holidays in the next 7 days |
| cosmicflow | same as lunarflow |

Implementation:
- New helper `src/lib/sidebar-signals.ts` exporting `useFlowSignals(): Record<groupId, { count: number; tone?: "urgent" | "info" }>`. Pure read of `useStore()` + existing libs; memoized by date string and relevant slices.
- In `Sidebar.tsx`, when rendering a collapsed group rail button, render a dot:
  - `count > 0` → 8px filled circle in the flow's accent color (`FLOW_ACCENTS[id].bg`).
  - `count >= 5` → small numeric badge instead of plain dot, capped at `9+`.
  - Positioned top-right of the icon, `aria-label` includes the count for screen readers.
- Expanded sidebar is unchanged (counts there would feel noisy; we already show items inline).

## 7. Capacity score chip

A 0–100 score fusing four signals into one header chip with a tap-to-explain popover.

**New:** `src/lib/capacity.ts`
- `computeCapacityScore({ date, state, cycle, energy }): { score: number; band: "rest" | "soft" | "steady" | "high"; reasons: { label: string; delta: number }[]; suggestion: string }`
- Inputs (all already in repo):
  - **Energy:** `useEnergyStore` last reading (0–10 → 0–40 weight).
  - **Cycle:** `getPhaseInfo` from `src/lib/cycle.ts` — luteal/menstrual reduce, ovulatory/follicular boost (±15).
  - **Moon:** `getMoonPhase` from `src/lib/moon.ts` — new/full ±5 down, waxing crescent/first quarter +5.
  - **Transit intensity:** `getActiveAspects(today)` count of hard aspects (square/opposition, orb <3°) reduces; harmonious adds. Reuse `src/lib/cosmic/active-aspects.ts`. (±15)
  - **Scheduled load:** reuse `computeCapacity` from `src/lib/carey/capacity.ts` (overloaded → −10, light → +5).
- Pure function, deterministic, memoized by ISO day + energy reading id.
- `band` thresholds: <30 rest, 30–55 soft, 56–80 steady, >80 high.

**New:** `src/components/header/CapacityChip.tsx`
- Compact pill in `HeaderNowStrip`-style: gradient ring colored by band (rose/amber/emerald/sky), shows score number + band label on `md+`, just the ring + score on mobile.
- `<Popover>` with the explainer:
  - Big number + band heading + suggestion sentence ("Soft day — protect one Top 3.").
  - List of reason rows with up/down arrows and the contributing factor (Energy 6/10, Luteal day 22, Mars square Saturn 2°, …).
  - "What to do" links: `Defer to a better day` (Phase 3 placeholder, just routes to `/today`), `View Cosmic` (→ `/cosmic-flow`), `Log energy` (opens existing energy logger).
- Uses `FlowCard` (item 5) for the popover surface.

**Edit:** `src/components/layout/AppLayout.tsx`
- Drop `<CapacityChip />` into the header just before `<HeaderNowStrip />`. Hidden on `<sm` to keep the 702px viewport tidy (already a documented constraint).

## Out of scope (future phases)
- Defer-to-a-better-day — shipped (capacity.ts `findBetterDay` + CapacityChip hint when band ≤ soft).
- Cosmic Flow mobile polish — shipped (CurrentTransitsTable stacks on <sm; padding p-4 sm:p-5 across cosmic cards; DailyOverviewCard horizontal moon+theme on mobile; CosmicCalendar header no longer overflows).
- Caregiver load meter — shipped (`src/components/carey/CaregiverLoadMeter.tsx`, surfaced on the Carey welcome screen). Reads 14d of `mental_load_checkins`, scores 0–100, bands light → very heavy, renders ring + 7d spark + delta vs prior week.
- Archetype dashboard pack — shipped earlier (`src/lib/apply-archetype-setup.ts`); reapply UI lives in Settings → Archetype & theme.
- Archetype habit + task starter pack — shipped (`src/lib/archetype-starter-pack.ts`). Each archetype has a curated set of habits, daily tasks, and weekly tasks; `applyArchetypePack` seeds them with title-based dedupe. Settings → Archetype & theme gets a "Generate daily & weekly plan" button + per-section preview; `applyArchetypeSetup` also runs the pack as part of re-apply.
- Migrating every existing card to `FlowCard` — done opportunistically as we touch files.

## Phase 4 — Writing focus + sidebar quiet mode

- **Note focus mode (shipped):** `src/pages/NoteDetail.tsx` gets a Maximize/Minimize button in the header. Toggling enters a fixed full-viewport overlay (`fixed inset-0 z-[60] bg-background`) that hides the app sidebar, header chrome, and the right context rail / TOC — just title + BlockEditor. Esc exits. State persists in `localStorage` as `careflow.notes.focusMode`.
- **Sidebar notification dots toggle (shipped):** new `src/lib/ui-prefs.ts` exposes `useSidebarDotsEnabled()`. `Sidebar.tsx` skips the per-flow count dot when disabled. New SectionCard in `src/pages/Settings.tsx` lets users turn the dots off.
- **Next:** caregiver-facing quick capture from focus mode (voice → today's daily note); writing streaks surface on Notes hub; per-flow "quiet day" mode mirroring focus mode for other flows.

## Verification
- Visual: open `/today`, collapse sidebar, see dots on PlanFlow/LunarFlow.
- Capacity chip renders on desktop; popover opens and lists reasons.
- No build/type errors (`tsc --noEmit` runs in CI).
