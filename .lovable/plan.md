## Goal

Add **named playlist presets** to the Pomodoro Music panel so you can save and switch between multiple Spotify/YouTube links without re-pasting URLs.

## Changes

### `src/lib/music-presets.ts` (new)
- Tiny localStorage helper: `{ id, name, url }[]` under key `careflow:focus:music:presets:v1`
- Functions: `getPresets()`, `addPreset(name, url)`, `removePreset(id)`, `renamePreset(id, name)`
- React hook `useMusicPresets()` returning `[presets, { add, remove, rename }]` with cross-tab sync via `storage` event

### `src/components/focus/MusicEmbed.tsx` (edit)
- Above the embed iframe, render a horizontal pill row of saved presets. Click a pill → loads that URL (sets `url`, closes editor). Active preset gets primary-filled style.
- "+ Save current" button (only visible when a URL is loaded and not already saved) → prompts inline for a short name (small input, no dialog), then saves.
- Each pill has a small × on hover to delete.
- Empty state: subtle hint "Save links as presets to switch between playlists."

No backend, no auth, no Spotify API — presets live in localStorage like the existing URL does. Keeps the door open for option #2 (real Spotify OAuth) later without rework.

## Out of scope
- Spotify login / OAuth / fetching real saved playlists (deferred to option #2).
- Syncing presets across devices.
- Reordering presets via drag.
