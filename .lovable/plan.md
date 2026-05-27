## Goal

List Health under both **Rhythm** and **Exhale** in the Care Loop (`/care`), reflecting that the hub is daily/cyclical support while Patterns + Timeline are reflective.

## Changes

### 1. `src/pages/CareLoop.tsx`
Add Health entries to two phases:

- **Rhythm** links → append `{ to: "/health", label: "Health Hub" }`
- **Exhale** links → append:
  - `{ to: "/health?tab=reflections", label: "Health patterns" }`
  - `{ to: "/health?tab=timeline", label: "Health timeline" }`

### 2. `src/pages/Health.tsx`
Make the Tabs component URL-driven so Exhale deep-links land on the right tab:

- Read `?tab=` from `useSearchParams`.
- Replace `<Tabs defaultValue="dashboard">` with a controlled `<Tabs value={tab} onValueChange={...}>` that writes the value back to the URL (`setSearchParams({ tab })`, using `replace: true` to avoid history spam).
- Default to `"dashboard"` when the param is missing or invalid (validate against the known tab id list).

No backend, schema, or business-logic changes. Pure navigation/IA.

## Out of scope

- No redesign of the CareLoop card UI.
- No changes to Health tab contents.
- No changes to the bottom nav / sidebar.

## Verification

- `/care` shows Health Hub under Rhythm, and Health patterns + Health timeline under Exhale.
- Clicking each link lands on `/health` with the correct tab pre-selected.
- Switching tabs manually updates the URL; refreshing the page preserves the active tab.
