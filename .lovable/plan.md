# Atmosphere persistence + seasonal collections

## 1. Persistence (verify + harden)
The current atmosphere already saves to `localStorage` (`careflow:atmosphere`) and re-applies on load in `src/lib/atmospheres.ts`. I'll:
- Add a small hydration guard in `applyAtmosphere` so the `data-atmosphere` attribute is re-asserted on every route change (one `useEffect` in `AppLayout`) to prevent any stray code from clearing it.
- Confirm `AtmospherePicker` (already mounted in `HeaderQuickSettings` → `AppLayout`) shows on every page.

## 2. New atmospheres (9 added → 3 per season)

**Spring (new)**
- `cherry-mist` — pale pink + sky blue, "First petals after a long thaw."
- `meadow-dew` — fresh green + buttercream, "Morning grass and open windows."
- `lilac-rain` — soft lilac + silver, "Gentle April showers."

**Summer** — reuse the 3 already created: `peony-bloom`, `wisteria-drift`, `hibiscus-coast`.

**Fall (new)**
- `harvest-ember` — burnt orange + cinnamon, "Wood smoke and golden hour."
- `amber-orchard` — apple red + ochre + cream, "Cider on the porch."
- `foggy-pine` — deep evergreen + slate mist, "Cold pine and quiet trails."

**Winter (new)**
- `snowfall-hush` — pale ice blue + pearl, "First snow at dusk."
- `evergreen-hearth` — deep spruce + ember red + gold, "Firelight under the tree."
- `frosted-plum` — icy plum + silver, "Long nights, soft candlelight."

Each gets palette, fonts (from already-loaded set), and a vibe tuned to its season. Added to `AtmosphereId` union and `ATMOSPHERES` array in `src/lib/atmospheres.ts`. Default chime mapping in `src/lib/completion-sound.ts` extended for each new id (falls back to a seasonally-appropriate existing preset).

## 3. Seasonal grouping UI
Add a `SEASONS` map in `src/lib/atmospheres.ts`:
```text
spring  → cherry-mist, meadow-dew, lilac-rain, blossom, dawn
summer  → peony-bloom, wisteria-drift, hibiscus-coast, coastal-calm
fall    → harvest-ember, amber-orchard, foggy-pine, golden-hearth
winter  → snowfall-hush, evergreen-hearth, frosted-plum, mist, moonlit-plum, dark-sage-glass
anytime → sage-sanctuary, soft-linen
```
In `src/components/atmospheres/AtmospherePicker.tsx`, replace the single "All atmospheres" grid with one `Section` per season (Spring · Summer · Fall · Winter · Anytime), keeping Favorites / Recommended / Recently used sections unchanged. Each section uses the existing `Grid` component.

Also extend the same seasonal grouping in `src/components/settings/FlowColorPicker.tsx`'s "Compare atmospheres" gallery so cards are grouped under season headers.

## Files touched
- `src/lib/atmospheres.ts` — new ids, palettes, `SEASONS` export, route-change re-apply helper.
- `src/lib/completion-sound.ts` — defaults for 9 new ids.
- `src/components/atmospheres/AtmospherePicker.tsx` — render by season.
- `src/components/settings/FlowColorPicker.tsx` — group gallery by season.
- `src/components/layout/AppLayout.tsx` — re-assert atmosphere attribute on mount.

## Out of scope
No changes to auto-switch logic, flow-accent overrides, or anywhere else atmospheres are consumed — new ids flow through automatically.
