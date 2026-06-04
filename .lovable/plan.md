## Goal

Replace the current vector `<CareFlowMark>` with the uploaded CareFlow icon image, place it in the **top-right of the app header**, and have it auto-retint to follow the active atmosphere + light/dark mode.

## Approach

### 1. Host the logo as a Lovable Asset

Upload `user-uploads://5166074C-C19F-4A49-9FAB-014E1B9DBA4C.png` (icon-only — cleaner in small sizes than the variant with the CareFlow wordmark) via the `lovable-assets` CLI and write the pointer to `src/assets/careflow-logo.png.asset.json`. The first uploaded image (with text + tagline) is the brand asset; we'll save it too as `careflow-logo-full.png.asset.json` for marketing / future use, but the in-app logo will use the icon-only one.

### 2. New `CareFlowLogo` component

Create `src/components/widgets/CareFlowLogo.tsx`:

```
<span className="grid place-items-center rounded-xl overflow-hidden ring-1 ring-border/40 shadow-soft"
      style={{ background: 'hsl(var(--primary))' }}>
  <img src={logo.url} alt="CareFlow"
       style={{ mixBlendMode: 'luminosity' }}
       className="h-full w-full object-cover" />
</span>
```

`mix-blend-mode: luminosity` keeps the icon's brightness/shape but pulls its hue + saturation from the underlying primary color, which already shifts per atmosphere and light/dark mode (we just retuned all atmosphere primaries). Result: the green plate retints to sage in Sage Sanctuary, dusty plum in Moonlit Plum, terracotta in Dawn, etc. — automatically.

Props: `size` (default 28), `className`, `tint` ("primary" | "accent" | "auto", default "primary"), `rounded` ("md" | "lg" | "xl", default "xl").

### 3. Place in top-right of the header

In `src/components/layout/AppLayout.tsx`, add `<CareFlowLogo size={32} />` as the rightmost element in the header's right-side cluster, after `<ThemeToggle />`. Wrap with a `<Link to="/">` so tapping it returns home.

### 4. Replace the sidebar mark

Swap the `<CareFlowMark>` in `src/components/layout/Sidebar.tsx` (top-left brand tile) for `<CareFlowLogo>` at sizes `40` (collapsed) / `36` (expanded). The wrapping tile div is removed — the new logo already has its own rounded plate. Keep `CareFlowMark.tsx` in the codebase but unreferenced (future inline-SVG fallback if needed).

### 5. No atmosphere changes needed

Atmosphere primary tokens already drive the tint; nothing in `src/index.css` needs editing.

## Out of scope

- Replacing the favicon / PWA icons.
- Animated brand mark, splash screen, marketing pages.
- Wordmark text in the header (sidebar's "CareFlow / Care · Plan · Grow" caption stays as-is).

## Deliverable

- 2 asset pointers in `src/assets/`.
- New `CareFlowLogo` component.
- Updated `AppLayout.tsx` header (logo top-right, links home).
- Updated `Sidebar.tsx` brand tile.
