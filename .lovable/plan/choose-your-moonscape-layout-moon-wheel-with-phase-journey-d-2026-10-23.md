# Choose your moonscape layout + Moon Wheel with Phase Journey details

## What you'll see
1. **Layout setting on the moonscape.** A small settings button on the monthly moonscape (in the Planner and on Moon & Rituals) opens a "Default layout" choice:
   - Moon Arc (the current one, still the default)
   - Lunar Tide
   - Moon Wheel
   - Phase Journey
   Your choice is used everywhere the moonscape shows and is remembered on that device. The same choice is also in Settings, under the moon guide options.
2. **Moon Wheel opens the Phase Journey.** When you tap a moon on the wheel, a panel opens below the wheel showing:
   - the phase card for that day (picture, dates, tagline, starting sign)
   - that day's moon, sign and one-sentence guidance
   - the phase's row of moons, with your chosen day highlighted
   - an **Open day** button that goes to the Planner
   Tapping the same moon again closes the panel.
3. The temporary mockups page is removed once the layouts are inside the real moonscape.

## Technical details
- Move Tide, Wheel and Journey from `MoonscapeMockups.tsx` into `src/components/cosmic/moonscape/` and give them the same props as MoonArc (`month`, `selectedDate`, `onSelectDate`).
- Add a device-local pref `careflow.moonscape.layout` (localStorage) through a small `useMoonscapeLayout()` hook that also listens for storage events. A switcher in `MonthlyMoonscape.tsx` and `CosmicMoon.tsx` uses that pref and picks the layout to render. A Popover holds the setting, and there's a row in the Settings moon section.
- The Wheel's detail panel reuses the Journey run card for the run that contains the chosen day, plus `phaseSignAdvice(phase, sign)`.
- Remove the mockups route and page. Check at 360px and on desktop. No database changes.
