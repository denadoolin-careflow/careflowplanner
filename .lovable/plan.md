## Add 3 summer pastel floral atmospheres

Extend `src/lib/atmospheres.ts` with three new soft pastel summer atmospheres named after flowers. Each follows the existing `Atmosphere` shape (id, name, tagline, mood, bestFor, 5–6 hex palette, fonts, vibe).

### New atmospheres

1. **Peony Bloom** — `peony-bloom`
   - Tagline: "Sun-warmed petals and porch breezes."
   - Palette: `#F7C8D1` (blush), `#F4A6B8` (peony pink), `#FBF4EE` (cream), `#B5D3C2` (mint leaf), `#E8C77E` (butter), `#7A5563` (deep mauve)
   - Mood: tender, romantic, light
   - Best for: Journaling, gentle planning, summer mornings
   - Fonts: Cormorant Garamond + Plus Jakarta Sans
   - Vibe: gradient `soft`, glow `warm`, glass `true`, prefersDark `false`, animation `breath`

2. **Wisteria Drift** — `wisteria-drift`
   - Tagline: "Lavender shade on a long July afternoon."
   - Palette: `#C9B8E0` (wisteria lilac), `#A99BC9` (dusty violet), `#F4F0F8` (pale cream), `#CFE2D5` (sage mist), `#E8C77E` (sunlit honey), `#6E5A8A` (twilight plum)
   - Mood: dreamy, cooling, contemplative
   - Best for: Afternoon resets, creative drift, slow reading
   - Fonts: Fraunces + DM Sans
   - Vibe: gradient `soft`, glow `subtle`, glass `true`, prefersDark `false`, animation `drift`

3. **Hibiscus Coast** — `hibiscus-coast`
   - Tagline: "Coral blossoms over turquoise tide."
   - Palette: `#FFB8A1` (hibiscus coral), `#FF9E83` (sun coral), `#FFF6EE` (shell white), `#9CD3D0` (lagoon), `#F2C879` (sand gold), `#6B4A52` (deep shell)
   - Mood: bright, restorative, breezy
   - Best for: Travel, beach days, energetic summer planning
   - Fonts: Fraunces + Plus Jakarta Sans
   - Vibe: gradient `rich`, glow `warm`, glass `false`, prefersDark `false`, animation `breath`

### Edits

- `src/lib/atmospheres.ts`
  - Add `"peony-bloom" | "wisteria-drift" | "hibiscus-coast"` to the `AtmosphereId` union.
  - Append the three new entries to the `ATMOSPHERES` array (after `blossom`).

### Out of scope
- No changes to auto-switch rules, flow color overrides, or settings UI — the new atmospheres show up automatically in the existing picker and the "Flow colors" comparison gallery.
- No font additions; all chosen fonts are already loaded in `index.html`.
