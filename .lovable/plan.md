## CareFlow gradient line logo

Replace the current `CareFlowMark` with a single SVG that mirrors the uploaded reference — a circular yin-yang frame holding a calendar with heart on one side and a caregiver-with-heart cradled by a leafy sprig on the other — drawn as pure line work with a gradient stroke that adapts to the active theme and atmosphere.

### 1. Rebuild `src/components/widgets/CareFlowMark.tsx`
- Output a 48×48 `viewBox="0 0 48 48"` SVG, `fill="none"`, `strokeLinecap="round"`, `strokeLinejoin="round"`, default `strokeWidth={1.4}`.
- Define a per-instance `<linearGradient>` (`id` suffixed with `useId()` to avoid collisions) with stops:
  - `0%`  → `hsl(var(--primary))`
  - `55%` → `hsl(var(--accent, var(--primary)))`
  - `100%` → `hsl(var(--primary-glow, var(--primary)))`
- All strokes use `stroke="url(#gradId)"`. Because the stops reference semantic HSL tokens, the gradient automatically retints on light/dark and every atmosphere preset (sage, dusk, ocean, sunset, etc.) without per-theme code.
- Compose the mark from these line elements (matches the reference silhouette):
  1. Outer circle `cx=24 cy=24 r=21`.
  2. S-curve yin-yang divider `M24 3 C 14 12 34 24 24 45` plus the two enclosing arc lobes.
  3. Left lobe: small calendar — rounded rect (`x=10 y=15 w=14 h=12 rx=2`), two hanger ticks, top rule line, and a tiny heart glyph centered in the grid.
  4. Leafy sprig under the calendar: a gentle stem path with 4 alternating leaf ovals.
  5. Right lobe: caregiver silhouette — head circle + shoulders arc cradling an inner heart.
- Keep the existing exported API: `{ className?, size?, strokeWidth? }`. Add an optional `gradient?: boolean` (default `true`); when `false`, fall back to `stroke="currentColor"` for monochrome contexts (favicons, print).
- Wrap in a `<span>`-free pure `<svg>` so callers' layout (`Sidebar.tsx` brand block) is unchanged.

### 2. Favicon
- Add `public/careflow-mark.svg` containing the same paths but with `stroke="currentColor"` and a hard-coded gradient using the default rose-dawn primary stops, so it renders nicely against any browser chrome.
- Update `index.html` to add `<link rel="icon" type="image/svg+xml" href="/careflow-mark.svg" />` just below the existing `apple-touch-icon` line. Leave the apple-touch-icon untouched.

### 3. No other call sites change
- `Sidebar.tsx` already renders `<CareFlowMark className="text-sidebar-primary" />`; the new gradient ignores `currentColor` for strokes but still inherits sizing/spacing. The previous `text-sidebar-primary` class becomes a no-op for color but is harmless — leave as-is to keep diff minimal.
- No other files import the mark (confirmed via `rg`).

### Technical notes
- `useId()` from React 18 guarantees unique gradient `id`s when multiple marks render on one page (sidebar + future landing hero).
- Gradient stops use `hsl(var(--token))` directly in SVG `stop-color` — supported in all modern browsers and re-reads the token whenever the `data-theme` attribute or `.dark` class flips, so atmosphere changes are live without remount.
- `--accent` and `--primary-glow` may not exist in every preset; the `var(--accent, var(--primary))` fallback chain guarantees a valid color.
- No new dependencies. No backend changes.
