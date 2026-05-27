## Goal

Make each of the 9 atmospheres feel distinct by giving it:
1. A unique **completion chime** (different note pattern, timbre, and feel).
2. A unique **ambient gradient animation** (different motion curve, speed, and scale).

Add a new **Settings** section so users can preview both, override the chime per atmosphere, change overall volume, pick an animation intensity, and disable sounds/animations.

---

## 1. Atmosphere-tailored chimes (`src/lib/completion-sound.ts`)

Refactor the chime engine so it can play different "presets" keyed by atmosphere. Each preset is a short note sequence with type (sine / triangle), gain, and optional detune for character.

Presets (sketch):
- `sage-sanctuary` — warm wood bell (C5 → G5, triangle, slow bloom)
- `moonlit-plum` — dreamy 5th (A4 → E5 → A5, sine, long tail, slight detune)
- `soft-linen` — single soft pad note (F5, sine, very gentle)
- `coastal-calm` — water-drop pair (D5 → A5, sine, quick bloom)
- `golden-hearth` — cozy major third (E5 → G#5 → B5, triangle, warm)
- `dark-sage-glass` — cinematic low chime (C4 → G4, sine + sub, longer)
- `dawn` — bright rising (G5 → B5 → D6, sine)
- `mist` — single whispered note (E5, sine, ultra-quiet)
- `blossom` — playful arpeggio (F5 → A5 → C6, triangle)

Public API additions:
- `playCompletionChime()` — keep current signature; internally resolves the active atmosphere (via `getCurrentAtmosphere()`) and any user override.
- `playChimeFor(atmosphereId)` — used by the Settings preview button.
- `getChimeVolume()` / `setChimeVolume(n)` — 0..1, persisted in `localStorage`.
- `getChimeOverride(atmosphereId)` / `setChimeOverride(atmosphereId, presetKey | null)` — lets a user assign a different preset to an atmosphere.

All preferences stored under `careflow:completion-sound:*` keys. No backend changes.

---

## 2. Atmosphere-tailored gradient animations (`src/index.css`)

Replace the single `atmo-drift` animation with **per-atmosphere keyframes** scoped via `html[data-atmosphere="…"] .atmo-ambient`. Each gets its own duration, easing, and transform pattern. Examples:

- `sage-sanctuary` — gentle breath (scale 1 ↔ 1.03, 22s)
- `moonlit-plum` — slow drift + hue rotate 8°, 32s
- `soft-linen` — almost still, micro-fade only, 40s
- `coastal-calm` — horizontal tide sway, 26s
- `golden-hearth` — warm pulse (opacity 0.8 ↔ 1.0), 18s
- `dark-sage-glass` — cinematic slow zoom + drift, 36s
- `dawn` — rising glow (translateY 2% → -2%), 20s
- `mist` — barely-perceptible fade, 45s
- `blossom` — playful figure-8 drift, 24s

Also add a CSS variable `--atmo-anim-intensity` (set on `:root`, overridable to `0`, `0.5`, `1`) that scales the keyframe transforms via `calc()`. Users can pick **Off / Subtle / Full** in Settings.

Add a `body[data-anim="off"]` rule that disables `.atmo-ambient` animation entirely (and respects `prefers-reduced-motion`).

---

## 3. New Settings section (`src/components/settings/AtmosphereFeelSection.tsx`)

A new `SectionCard` titled **"Atmosphere feel"** inserted in `src/pages/Settings.tsx` near the existing `ArchetypeThemeSection`.

Contents:
- **Completion sound** toggle (existing `isCompletionSoundEnabled`) + **volume slider**.
- **Per-atmosphere chime** list: one row per atmosphere with name, the chime preset name, a `Play` button (calls `playChimeFor`), and a small `Select` to override to another preset or "Default".
- **Ambient animation intensity**: segmented control with `Off / Subtle / Full`, writes `--atmo-anim-intensity` and `body[data-anim]`.
- **Preview current atmosphere** button that plays the chime for the currently active atmosphere.

Persistence: `localStorage` only.

---

## 4. Wire-up

- `src/components/layout/AppLayout.tsx` — on mount, read animation intensity pref and apply `data-anim` on `<body>` and the CSS variable on `<html>`.
- No changes needed at call sites of `playCompletionChime()` (still works; now atmosphere-aware).

---

## Technical notes

- Single audio context reused; volume applied via a master `GainNode` created lazily.
- `prefers-reduced-motion: reduce` → forces animation intensity to 0 regardless of user setting.
- Override storage shape: `careflow:completion-sound:overrides` → `{ [atmosphereId]: presetKey }`.
- No DB / edge function changes. Pure frontend + CSS.

## Files touched

- `src/lib/completion-sound.ts` — rewrite with presets, volume, overrides, atmosphere lookup.
- `src/index.css` — per-atmosphere keyframes, intensity variable, reduced-motion guard.
- `src/components/settings/AtmosphereFeelSection.tsx` — new.
- `src/pages/Settings.tsx` — mount the new section.
- `src/components/layout/AppLayout.tsx` — apply animation intensity pref at boot.
