# Combine Flow Colors settings + preview gallery

Today there are two separate surfaces:
- `FlowColorPicker` (in Settings) — per-flow swatch picker for the **active** atmosphere only.
- `FlowColorsPreview` page at `/settings/flow-colors` — read-only gallery showing how every atmosphere tints each Flow, with an "Apply" button per atmosphere.

Goal: one combined "Flow colors" panel in Settings where the user can both **preview every atmosphere** and **pick a swatch override for each Flow** in the same place. Remove the separate page link.

## Changes

1. **Rebuild `src/components/settings/FlowColorPicker.tsx`** into a single panel with two stacked regions:

   a. **Per-flow picker (top)** — keep current behavior (one row per Flow, swatches from the *active* atmosphere, Reset/Reset-all). This stays the primary editor since overrides are indexed against the active atmosphere's palette.

   b. **Atmosphere gallery (bottom, collapsible "Compare atmospheres" disclosure, collapsed by default)** — port the layout from `FlowColorsPreview.tsx`:
      - One card per atmosphere in `ATMOSPHERES`, showing name, tagline, palette swatches, and the Flow header chips rendered via `getFlowAccent(group.id, atm, overrides)`.
      - Each atmosphere card shows an **Apply** / **Active** button (calls `setAtmosphere`).
      - Active atmosphere card gets a `ring-2 ring-primary/40` highlight.
      - When the active atmosphere card is rendered, each Flow chip becomes a button that opens an inline swatch row (same swatch grid as the top picker) so users can change overrides directly from the gallery too. For non-active atmospheres, chips stay read-only previews (overrides are tied to the active atmosphere's palette indices).
      - Live updates: the gallery reads `useAtmosphere()` + `useFlowColorOverrides()` so swatch changes immediately reflect in both regions.

2. **Update `src/pages/Settings.tsx`**:
   - Delete the standalone "Preview across atmospheres" `SectionCard` block (lines ~143–154) and its `Link` to `/settings/flow-colors`.
   - Remove the now-unused `ArrowRight` / `Palette` / `Link` imports if no other usage remains in this file (verify before removing).

3. **Routing cleanup in `src/App.tsx`**:
   - Remove the `import FlowColorsPreview from "./pages/FlowColorsPreview"` line.
   - Remove the `<Route path="/settings/flow-colors" element={<FlowColorsPreview />} />` route.

4. **Delete `src/pages/FlowColorsPreview.tsx`** since its content is fully absorbed into the combined panel.

## Out of scope
- No changes to `flow-color-prefs`, `flow-accent`, atmosphere data, or any consumer of `getFlowAccent`.
- No new persistence model — overrides remain palette-index based against the active atmosphere.
