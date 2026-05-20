## Goal
Eliminate the visible "blink" on initial app load / hard refresh.

## Root cause
On first paint, `index.html` paints `<html>` with a single solid color (`hsl(36 38% 96%)` light / `hsl(260 22% 10%)` dark). Once React mounts, `AppLayout` paints the `.gradient-dawn` multi-stop gradient on top. The transition from solid → gradient is the visible flash, and it's worse when a non-default theme preset (sage, ocean, blossom, etc.) is active because the pre-paint solid color doesn't match the preset's gradient start color at all.

A secondary contributor: `RequireAuth` shows its own `gradient-dawn` wrapper while loading, then unmounts and `AppLayout` mounts a fresh `gradient-dawn` wrapper — same class, but the DOM swap can cause a one-frame flicker on slower devices.

## Plan

1. **Paint the gradient before React mounts** (`index.html`)
   - Replace the inline `<style>` block so `html` and `body` carry the full `--gradient-dawn` background for the active theme preset and light/dark mode.
   - Inline a small table of the dawn-gradient values for every preset (default, sage, ocean, blossom, noir, lavender, sunrise, forest, lilac, orchid — whatever exists in `index.css`) keyed by `data-theme` and `.dark`, so the boot script can apply the matching gradient immediately.
   - Update the existing boot script to read `localStorage` (theme + preset) and add a class to `<body>` early so the gradient is painted on the first frame.

2. **Stop the auth → app DOM swap** (`src/components/auth/RequireAuth.tsx`)
   - While `loading` is true, render `<Outlet/>`-less placeholder *inside* the same shell, or simply return `null` so the `AppLayout` mounts once and the gradient div is never torn down and re-created. Since the gradient is now on `<body>` from step 1, returning `null` while loading is safe — the page stays the right color.

3. **Match the IndexRedirect loading placeholder** (`src/components/auth/IndexRedirect.tsx`)
   - Remove the bare `min-h-screen` div (it currently has no background) and return `null` while loading — the body gradient from step 1 carries the visual.

4. **Verify**
   - Hard-refresh on `/`, `/today`, `/journal`, and `/dashboard` in the preview.
   - Toggle to a non-default preset (e.g. sage) and dark mode, then hard-refresh and confirm no color shift between the pre-React paint and the mounted app.

## Out of scope
- Per-page data loading skeletons (the user specified "initial app load / refresh", not per-route navigation).
- Animations or transitions inside pages.

## Files touched
- `index.html`
- `src/components/auth/RequireAuth.tsx`
- `src/components/auth/IndexRedirect.tsx`
