# Offline + Installable App Plan

Add Progressive Web App (PWA) support so CareFlow can be installed to a phone/desktop home screen and the UI loads without an internet connection. Data (tasks, meals, etc.) still requires connectivity since it lives in Lovable Cloud — only the app shell and static assets are cached.

## Important caveats (please read)

- Offline features only work in the **published** app (careflowplanner.app), not in the Lovable editor preview. The service worker is deliberately disabled inside the preview iframe to avoid serving stale builds.
- Writes made while offline will fail; we won't queue them. When the connection returns, the app simply works again.
- Already-loaded pages remain usable; uncached data fetches will show normal loading/error states.

## What gets built

1. **PWA plumbing**
   - Add `vite-plugin-pwa` and configure it in `vite.config.ts` with `registerType: "autoUpdate"` and `devOptions.enabled: false`.
   - Workbox config: `NetworkFirst` for HTML navigations (so new deploys take over quickly), `navigateFallbackDenylist` for `/~oauth` and Supabase auth callbacks, cache static assets + Google Fonts.

2. **Web app manifest**
   - Name: "CareFlow", short name: "CareFlow", `display: "standalone"`, themed to the app's primary color, `start_url: "/today"`.
   - Generate icon set (192, 512, maskable, Apple touch icon) from existing branding.
   - Add iOS-specific meta tags in `index.html` (apple-mobile-web-app-capable, status bar style, touch icon).

3. **Registration guard** (`src/main.tsx`)
   - Skip SW registration when running inside an iframe or on `lovableproject.com` / `id-preview--` hostnames.
   - Proactively `unregister()` any existing SW in those contexts so the preview never serves a stale shell.

4. **Install prompt UX**
   - Lightweight hook that captures the `beforeinstallprompt` event.
   - Small "Install app" button surfaced in Settings (and dismissible toast on `/today` the first time it's available on mobile).
   - iOS fallback: short instructions (Share → Add to Home Screen) since iOS doesn't fire the prompt event.

5. **Update flow**
   - On `autoUpdate`, when a new SW activates, show a Sonner toast: "New version available — refresh" with a reload action.

## Technical notes

- `base: "/"` stays as-is (served over HTTPS, not `file://`).
- No changes to Supabase client, auth, or data layer.
- No `selfDestroying` flag; we use the standard updateable SW pattern.
- Icons generated as PNG assets under `public/icons/`.

## Files touched

- `vite.config.ts` — add VitePWA plugin
- `index.html` — manifest link, theme-color, apple meta tags
- `public/icons/*` — new icon assets + `manifest.webmanifest` (generated)
- `src/main.tsx` — guarded SW registration + update listener
- `src/hooks/useInstallPrompt.ts` (new) — capture install event
- `src/components/pwa/InstallAppButton.tsx` (new) — install button + iOS hint
- `src/pages/Settings.tsx` — surface the install button
- `package.json` — `vite-plugin-pwa` dependency
