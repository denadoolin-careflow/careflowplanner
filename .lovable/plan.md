## Goal
Make every content section on the Today page collapsible to a compact header preview, so scrolling is effortless and users can focus on what matters right now.

## Approach
Build a single reusable `CollapsibleSection` wrapper that persists its open/closed state in localStorage. Apply it to every major section below the hero header on the Today page.

## Plan Details

### 1. Reusable `CollapsibleSection` component
Create `src/components/today/CollapsibleSection.tsx`:
- Wraps children in a `cozy-card` with a `Collapsible` from `@/components/ui/collapsible`
- Header shows: icon (optional), title, subtitle (optional), and a right-side preview slot (ReactNode, optional)
- Chevron rotates on open/close
- `id` prop controls the `localStorage` persistence key (`careflow:today-section:${id}`)
- `defaultOpen` prop (defaults to `true`)
- Uses smooth height animation via `CollapsibleContent`
- The card surface stays visible even when collapsed — only the body content is hidden

### 2. Add collapsible support to `SectionCard`
Modify `src/components/cards/SectionCard.tsx` to accept optional props:
- `collapsibleId?: string` — when provided, the entire card becomes a `CollapsibleSection` wrapper
- `defaultOpen?: boolean`
- Keeps existing non-collapsible behavior unchanged for all other pages

### 3. Update child components to forward collapsible props
Modify `CarePriorities` and `TodayHabitsCard` to accept and forward an optional `collapsibleId` prop to their internal `SectionCard`. No visual or functional changes when the prop is absent.

### 4. Wrap every section on the Today page
In `src/pages/Today.tsx`, wrap each major section (after the hero header) with `CollapsibleSection` or pass `collapsibleId` to components that use `SectionCard`:

| Section | Wrapper | Preview when collapsed |
|---------|---------|----------------------|
| DailyBrief | `CollapsibleSection` id="daily-brief" | Brief title + date |
| TodayEnergy | `CollapsibleSection` id="energy-weather" | "Energy & Weather" |
| TransitStrip | Grouped inside TodayEnergy (same toggle) | — |
| WeatherHeroCard (fallback) | Same as TodayEnergy | — |
| CarePriorities | `collapsibleId="care-priorities"` | Title + "X of Y complete" |
| TodayHabitsCard | `collapsibleId="today-habits"` | Title + "X of Y tended" |
| Schedule / Plan | `CollapsibleSection` id="schedule" | View mode label + event count |
| CalendarTasksPanel | `CollapsibleSection` id="tasks" | Task count |
| EndOfDaySummary | `CollapsibleSection` id="end-of-day" | Completion % |
| Widgets | Already uses `Collapsible` — leave as-is (already toggleable) |

Sections intentionally **not** made collapsible:
- Hero header (contains primary day navigation and layout controls)
- `MoonJournalReminderBanner` (transient banner, not a section)

### 5. Persist state across sessions
Each `CollapsibleSection` reads/writes its open state to `localStorage` under `careflow:today-section:${id}`. This means the user's preferred collapsed/expanded layout survives page reloads.

## Technical Notes
- No new dependencies — uses existing `@/components/ui/collapsible`
- `SectionCard` changes are fully backward-compatible
- Child component changes (`CarePriorities`, `TodayHabitsCard`) are additive only
- All animation comes from the existing `Collapsible` primitive
- Preview data for collapsed headers is computed in the parent (`Today.tsx`) where data is already available, avoiding prop drilling or context changes