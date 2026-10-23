# Year view: zodiac seasons per month + phase guidance on tap

## What you'll see
1. **Zodiac season under each month name** in the Year tab: the sign glyph, "Libra → Scorpio season" (when a month spans two), its element color, and a short theme tied to the cosmic flow (for example "Balance & relationships").
2. **Tapping a phase line** (e.g. "Oct 26 · Care · 🌖 ♓ Pisces") now expands it to show one sentence combining the phase and the Moon's sign, such as: "Care in Pisces: tend gently to yourself and loved ones, and leave room for rest." A small "Open day" link inside opens that day in the Planner (previously the tap opened the day directly).
3. Only one phase line is open at a time; tapping again closes it.

## Technical details
- `PlannerYearView.tsx`: use `seasonsInMonth()` + `ELEMENT_CLASSES` for the per-month season row (theme from `season.theme`).
- Phase row becomes an expand toggle (local `openId` state); sentence built by a small pure helper `phaseSignAdvice(phase, sign)` in `src/lib/cosmic/moon-energy.ts`, combining `LUNAR_RHYTHM[phase].invitation` tone with `MOON_SIGN_ENERGY[sign]` plus a per-sign short phrase.
- Add a unit test for `phaseSignAdvice` (returns sign- and phase-specific text).
- Check at phone, tablet and desktop widths for wrapping.
