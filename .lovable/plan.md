# Today header redesign: phase-lit sky card

## What you'll see
1. **Sky card at the top of Today**, like the mockup:
   - A realistic moon picture on the left, lit to match tonight's phase
   - The weekday and date in spaced small caps, then a large serif clock with AM/PM
   - "Waxing Gibbous in Aries" underneath, then a thin line with Season | Cycle phase (cycle only if tracking is on)
   - Weather stays as a small chip in the corner
2. **Background and imagery change with the phase.** Each phase gets its own soft painted sky picture:
   - Plan: dawn mist with sprouting greens
   - Grow: golden sunlit sky with wildflowers
   - Care: warm amber dusk with roses
   - Let go: rosy twilight with drifting petals and seed heads
   The picture fades when you move to a different day.
3. **Phase row below the card.** Four round Plan / Grow / Care / Let go buttons in their phase colors. Today's phase is larger, with a tab that joins it to the guidance card.
4. **Today's guidance card.** A heading like "Grow in Aries", the existing moon-sign advice, a flower picture for the phase, and three small idea chips (for example "Choose one priority"). The arrow opens Moon & Rituals.
5. **On phones** the card stays one column. The moon and clock sit side by side, and nothing is cut off. Tapping a phase circle still shows that phase's overview.

## Technical notes
- Make 4 phase sky backgrounds and 4 phase flower images (fast tier, src/assets). Pick them by `ctx.rhythm`.
- Rework `TodayMoonHeader.tsx`. Keep the existing data (`useDayContext`, weather, `phaseSignAdvice`, `PHASE_GUIDE`), the day-change animation and the evening/morning features. Draw the moon with an SVG that has a shadow terminator from the illuminated fraction, over a moon-texture image.
- Add a scrim/token overlay so text keeps 4.5:1 contrast. Phase tokens only, no new data.
- Check at 390px and 1280px for overlap.
