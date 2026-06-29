## Goal
Replace the existing CareFlow logo with the uploaded yin-yang + leaves + heart + calendar mark, rebuilt as a themable SVG so it follows the active atmosphere and light/dark mode. Add the tagline "Plan · Care · Grow" everywhere the wordmark appears.

## New themable SVG mark

Create `src/components/widgets/CareFlowMark.tsx` (replacing the current raster wrapper) that renders the design as inline SVG using semantic tokens — no hex colors:

- Outer rounded-square plate → `fill: hsl(var(--card))` with a 1px `stroke: hsl(var(--border))` and a soft inner highlight.
- Yin half (lighter side) → `fill: hsl(var(--background))` with a hairline `hsl(var(--border))` outline for the S-curve.
- Yang half (darker side) → `fill: hsl(var(--primary))`.
- Leaf stem and three leaves → `fill: hsl(var(--primary) / 0.45)` with `stroke: hsl(var(--primary) / 0.7)` outline so they read on both halves.
- Heart inside top circle → `fill: hsl(var(--accent))`, circle `fill: hsl(var(--primary))`.
- Calendar inside bottom circle → outer circle `fill: hsl(var(--background))`, calendar body `stroke: hsl(var(--primary))`, mini heart `fill: hsl(var(--accent))`.
- A subtle inner shadow / highlight via `<filter>` (drop-shadow + inset) for the embossed feel; intensity stays soft enough to read in dark mode.

Because every fill/stroke is an HSL token, the mark automatically re-tints when the atmosphere changes (sage-sanctuary stays cream/green, harvest-ember becomes cream/burnt-orange, snowfall-hush becomes pale-blue/navy, etc.) and inverts naturally in dark mode (card/background tokens are deep, primary stays the atmosphere accent).

Props mirror today's API (`size`, `className`, `rounded`, `decorative`) so existing call sites don't change.

## Wordmark with tagline

Update `src/components/widgets/CareFlowLogo.tsx` into a two-line lockup:
- Line 1: "CareFlow" in `font-display`.
- Line 2: "Plan · Care · Grow" in uppercase, tracked, `text-muted-foreground`.
- New `showTagline` prop (default `true`); `size` prop controls the icon alongside.
- Internally renders the new `<CareFlowMark>` next to the text. When used as icon-only (size-only, no text) it falls back to just the mark.

## Tagline placements

Add or correct "Plan · Care · Grow" wherever the wordmark appears:

- `src/components/layout/Sidebar.tsx` line ~947 → change the existing "Care · Plan · Grow" to "Plan · Care · Grow".
- `src/components/layout/AppLayout.tsx` header → the existing `<CareFlowLogo size={32} />` becomes the icon-only mark; the page header already shows "CareFlow" eyebrow text — update that block to use the wordmark with tagline on `sm:` and above.
- `src/pages/Landing.tsx` → swap the three `<CareFlowMark>` brand usages (header line ~606, footer line ~962) for the wordmark+tagline lockup; CTA button instances keep the icon-only mark.
- `src/pages/Auth.tsx` line ~167 and `src/pages/Waitlist.tsx` line ~25 → wrap the mark with the tagline lockup beneath.
- `index.html` → keep `<title>` but append "· Plan · Care · Grow" so the browser tab carries it.
- `public/careflow-mark.svg` → regenerate to match the new SVG (used as favicon / share icon) so external surfaces match.

## Cleanup
- Delete the now-unused raster asset pointers `src/assets/careflow-logo.png.asset.json`, `careflow-app-icon.png.asset.json`, and `careflow-logo-full.png.asset.json` only after confirming no other imports remain (rg pass).
- No changes to atmosphere CSS — the SVG inherits everything from existing tokens.

## Verify
Run Playwright on `/today`, `/landing`, `/auth` after switching atmospheres (sage-sanctuary, harvest-ember, snowfall-hush) in both light and dark mode; screenshot the sidebar header and confirm:
- The mark recolors per atmosphere (yang half = primary, plate = card).
- "Plan · Care · Grow" appears under "CareFlow" in sidebar, header, landing, auth, waitlist.
- Contrast remains AA in dark mode.
