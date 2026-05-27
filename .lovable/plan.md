## Goal

Make the Today/Week/Month switcher consistent across all planning/calendar views. The toggle already exists on `/today` and navigates between routes (per the earlier decision). Mirror the same toggle on `/week` and `/month` so users can jump between scopes from any of the three pages.

## Approach

1. **Extract shared component** `src/components/calendar/ScopeNavToggle.tsx`
   - Pill group with three buttons: Today / Week / Month
   - Prop `active: "today" | "week" | "month"` controls which button shows the primary-filled state and `aria-current="page"`
   - Inactive buttons use `useNavigate()` to push `/today`, `/week`, `/month`
   - Same visual treatment currently inlined in `Today.tsx` (rounded-full container, ghost buttons, `bg-primary text-primary-foreground` for active)

2. **`src/pages/Today.tsx`** — replace the inlined toggle block (~lines 198–220) with `<ScopeNavToggle active="today" />`. No layout change.

3. **`src/pages/Week.tsx`** — add `<ScopeNavToggle active="week" />` into the existing header action row (next to the Reset link / Schedule-Plan group, ~lines 175–199). Wraps naturally on narrow widths.

4. **`src/pages/Month.tsx`** — add `<ScopeNavToggle active="month" />` into the Month header action area (alongside the existing month nav arrows). Will read header location precisely when editing; visual placement matches the right-side action cluster.

## Out of scope

- No changes to routing, business logic, data, or the Schedule/Plan/Parts/Agenda view toggles.
- No restyling of existing controls.
- No inline week/month rendering on the Today page — user previously chose route-based navigation.
