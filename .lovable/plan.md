
# Atmospheres — emotional theming system

Rebrand the current "Themes" feature as **Atmospheres** and elevate it from color swaps into a full ambient experience: mood, gradients, glow, shadows, typography, and auto-switching rules.

## What gets built

### 1. Atmosphere library (`src/lib/atmospheres.ts`)
New typed registry replacing/wrapping `theme-preset.ts`. Each atmosphere has:
- `id`, `name`, `tagline`, `mood[]`, `bestFor[]`
- Full palette (6 named colors as HSL)
- `typography` pair (display + body Google Fonts)
- `vibe` flags: `gradientIntensity`, `glow`, `glass`, `grain`, `animationLevel`
- `darkVariant` flag (which mode it shines in)

The 8 atmospheres (per spec): Sage Sanctuary, Moonlit Plum, Soft Linen, Coastal Calm, Golden Hearth, Dark Sage Glass, Dawn, Mist.

### 2. CSS tokens (`src/index.css`)
Replace the existing 16 preset blocks with 8 atmosphere blocks (`:root[data-atmosphere="..."]` + `.dark[data-atmosphere="..."]`). Each block defines:
- Surfaces, primary/secondary/accent, muted, border
- `--gradient-dawn/warm/calm/sage` recolored to the palette
- `--shadow-soft/cozy/glow` tuned per mood (Dark Sage Glass = deep + glassy; Soft Linen = barely-there)
- `--atmo-glow` (radial accent for ambient backdrops)
- `--atmo-font-display` / `--atmo-font-body` CSS variables

Add new utility classes:
- `.atmo-ambient` — animated radial-gradient backdrop using `--atmo-glow`
- `.atmo-glass` — backdrop-blur card variant
- `.atmo-transition` — applied to `html` for smooth 600ms color transitions when switching

### 3. Atmosphere store (`src/lib/atmospheres.ts` + provider)
- `useAtmosphere()` hook → `{ current, set, favorites, toggleFavorite, recent, auto, setAuto }`
- LocalStorage keys: `careflow:atmosphere`, `careflow:atmosphere:favorites`, `careflow:atmosphere:auto`, `careflow:atmosphere:recent`
- `auto` config: `{ enabled, rules: { morning, evening, lowEnergy, focus, moonPhase } }`
- Auto-resolver runs on: mount, hour change, lowEnergyMode change, moon phase change. Picks the highest-priority matched rule.
- Smooth swap: add `atmo-transition` class to `<html>`, swap `data-atmosphere`, lazy-load Google Font pair, remove transition class after 700ms.

### 4. Picker UI (`src/components/atmospheres/AtmospherePicker.tsx`)
Replaces `ThemePicker.tsx` in the header. Modal (Dialog) with:
- Hero header: "Choose the atmosphere that supports your day."
- Grid of preview cards: each shows gradient swatch, name, mood chips, tagline, favorite star, "Apply" button
- Hover → live preview overlay (animated gradient + typography sample)
- Sections: **Recommended for now** (resolved from time/energy/moon), **Favorites**, **All atmospheres**, **Recently used**
- "Auto-switch" toggle + accordion to configure rules (morning/evening/low-energy/focus/moon)

Suggestion copy generator (`src/lib/atmosphere-suggestions.ts`):
- Low energy → "You seem overloaded today. Try **Mist**."
- Evening + moon visible → "**Moonlit Plum** pairs well with reflection nights."
- Morning → "Start soft with **Dawn**."
- Focus mode on → "**Dark Sage Glass** for deep work."

### 5. Header integration
Update `src/components/layout/AppLayout.tsx` to render `<AtmospherePicker />` in place of `<ThemePicker />`. Add a small ambient layer (`<div class="atmo-ambient pointer-events-none fixed inset-0 -z-10" />`) so backgrounds breathe.

Keep `ThemePicker.tsx` as a thin re-export to avoid breaking imports elsewhere.

### 6. Suggestions banner (optional, lightweight)
Tiny dismissible chip near the picker: "✨ Try Mist for a calmer afternoon →" that opens the picker pre-scrolled to the suggestion. Stored dismissal in localStorage per-suggestion-id per-day.

## Files

**New**
- `src/lib/atmospheres.ts` — registry + types + store hook
- `src/lib/atmosphere-suggestions.ts` — suggestion logic
- `src/components/atmospheres/AtmospherePicker.tsx` — modal picker
- `src/components/atmospheres/AtmosphereCard.tsx` — preview card
- `src/components/atmospheres/AtmosphereAmbient.tsx` — fixed ambient layer
- `src/components/atmospheres/AtmosphereSuggestion.tsx` — chip
- `src/components/atmospheres/AutoSwitchConfig.tsx` — rules form

**Edited**
- `src/index.css` — replace 16 presets with 8 atmosphere blocks + new utilities
- `src/lib/theme-preset.ts` — backward-compat re-export that maps old preset ids → atmospheres
- `src/components/layout/AppLayout.tsx` — swap picker + add ambient layer
- `src/components/layout/ThemePicker.tsx` — re-export `AtmospherePicker`

## Backward compatibility

Old `theme-preset` keys (`sage`, `plum`, `dusk`, etc.) map to nearest atmosphere:
- `sage`/`moss`/`forest` → `sage-sanctuary`
- `plum`/`dusk`/`lavender`/`blossom` → `moonlit-plum`
- `sand`/`warm` → `golden-hearth`
- `ocean`/`midnight` → `coastal-calm`
- `mono`/`noir` → `dark-sage-glass`
- default fallback → `sage-sanctuary`

Anyone calling `setThemePreset(...)` continues to work via the mapping.

## Out of scope (can follow up if you want)

- Per-page atmosphere overrides ("assign atmospheres to routines/pages") — I'll wire the data layer (`pageAtmospheres` localStorage map) but not add the UI in every page settings; you can ask for that next.
- Custom user-built atmospheres
- Server sync of atmosphere prefs (currently localStorage only)

## Order of work

1. Atmosphere registry + suggestion logic
2. CSS tokens + utilities for all 8
3. Picker + ambient layer + header swap
4. Auto-switch resolver + config UI
5. Backward-compat shim
