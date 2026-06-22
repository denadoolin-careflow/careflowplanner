## Goal

Tighten the Inbox tag/category row on mobile, expand the tag editor with more icons and an Atmosphere-aware color palette, and let users override each Flow page's accent color from Settings.

## 1. Inbox: mobile-friendly tags + categories

Edit `src/pages/Inbox.tsx`.

- **Selected chips row (above input):** wrap selected categories + extra tags into a single horizontally scrollable lane with `no-scrollbar snap-x` instead of `flex-wrap`, so a long set never pushes the input off-screen. Compact "Clear" pill stays sticky to the right edge of the lane.
- **Categories & Tags lane:**
  - Keep the horizontal scroller, but shrink chip padding on `<sm` (`px-3 py-1.5 text-[12px] min-h-[34px]`) so 4-5 chips peek on a 360 px screen.
  - Add a soft fade-out mask (`mask-image: linear-gradient(to right, black 85%, transparent)`) hinting more chips to the right.
  - Move "Manage" out of the header on mobile into a trailing "…" chip at the end of the lane so the header collapses to just the section label.
  - Replace the "More tags" button with a leading round icon chip (`+` only) on `<sm`, full label on `≥sm`.
- **TagPicker popover:** add `w-[min(20rem,calc(100vw-2rem))]` so it never overflows narrow viewports; pin to `align="end"` when triggered from the end of a scroll lane.

## 2. Tag editor: more icons + atmosphere color palette

Edit `src/components/tags/tag-icon.tsx`, `src/lib/tags.ts`, and `src/components/tags/TagPicker.tsx` (creation panel) + `src/components/tags/TagManagerDialog.tsx`.

- **Icons:** grow the curated set from 16 → ~32. Add: `Home, Briefcase, Baby, GraduationCap, ShoppingBag, Plane, Coffee, Music, BookOpen, Brush, Camera, Pill, Stethoscope, Dumbbell, Calendar, Clock, MapPin, Smile`. Group icons by theme (Essentials, Home & Family, Health, Work, Play, Travel, Symbols) and render in a tabbed/grouped grid inside both the creation panel and tag-manager dialog.
- **Colors:**
  - Keep `TAG_COLORS` (curated swatches).
  - Add a new "Atmosphere" group: reads the current `atmosphere.palette` via `useAtmosphere()` and exposes each swatch as a selectable color, labelled with the atmosphere name. Updates live as the user changes atmosphere.
  - Render two sub-rows in the picker: "Atmosphere" (top, current palette swatches), "Library" (existing curated swatches).
  - Each swatch shows a tiny check on selection; selected swatch keeps the scale-up affordance.

## 3. Per-Flow color customization in Settings

New Settings section + small store.

- **Storage:** new `src/lib/flow-color-prefs.ts`:
  - `getFlowColorOverrides(): Record<flowId, number>` — palette index per flow.
  - `setFlowColorOverride(flowId, index | null)` — null clears.
  - LocalStorage key `careflow:flow-color-overrides`. Emits `careflow:flow-colors-change` event.
  - `useFlowColorOverrides()` hook subscribes to storage + custom event.
- **Wire into accent resolver:** update `getFlowAccent` / `useFlowAccent` / `useFlowAccents` in `src/lib/flow-accent.ts` to consult overrides first, falling back to `FLOW_PALETTE_INDEX`.
- **New component:** `src/components/settings/FlowColorPicker.tsx`. For each flow in `FLOW_PALETTE_INDEX`:
  - Show flow label + icon.
  - Render the current atmosphere's palette as 6-8 swatches; selected one is ringed. A "Reset" pill restores the default.
  - Live preview chip on the right (accent fill + soft + ring sample) so users see the result before leaving Settings.
- **Settings placement:** add this above the existing "Flow colors" link card in `src/pages/Settings.tsx` (rename existing card to "Preview across atmospheres" to disambiguate). Atmosphere section stays untouched.

## Files

- Edit: `src/pages/Inbox.tsx`, `src/components/tags/TagPicker.tsx`, `src/components/tags/TagManagerDialog.tsx`, `src/components/tags/tag-icon.tsx`, `src/lib/tags.ts`, `src/lib/flow-accent.ts`, `src/pages/Settings.tsx`
- New: `src/lib/flow-color-prefs.ts`, `src/components/settings/FlowColorPicker.tsx`

## Out of scope

- No DB schema changes (overrides are client-only, per-device, just like atmosphere prefs).
- No changes to atmosphere palettes themselves or to Tag CRUD endpoints.
- No redesign of the inbox capture input, voice flow, or VoiceReviewSheet.
