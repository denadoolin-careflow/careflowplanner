## Goal

Add a **Today / Week / Month** toggle to the Today view header so users can jump to the corresponding routes in one click.

## Changes

### `src/pages/Today.tsx`
- Import `useNavigate` from `react-router-dom`.
- Add a new pill-style toggle group next to the existing Schedule / Plan toggle (same visual treatment: rounded-full container, ghost buttons, primary background on the active option).
- Buttons:
  - **Today** → `/today` (active state on this page)
  - **Week** → `/week`
  - **Month** → `/month`
- Place it in the header action row at lines ~181–207 (the row that already contains the day stepper and Schedule/Plan toggle). On the narrow viewport it wraps naturally since the row is `flex-wrap`.

No changes to Week/Month pages, routing, or business logic.

## Out of scope

- Adding the same toggle to Week or Month pages (can be a follow-up if desired).
- Restyling the existing Schedule/Plan toggle.

## Verification

- On `/today`, the new toggle shows Today highlighted.
- Clicking Week navigates to `/week`; clicking Month navigates to `/month`.
- Toggle wraps cleanly at 705px width without breaking the header layout.
