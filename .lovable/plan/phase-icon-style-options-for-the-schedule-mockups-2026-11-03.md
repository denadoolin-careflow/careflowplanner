# Phase icon style options for the schedule mockups

Keep the same four icons (Plan = Leaf, Grow = Sprout, Care = Heart, Let go = Moon). Change only the badge around them, so you can compare looks inside the real schedule mockups.

## What you'll see

A new "Icon style" row on /schedule-mockups, under the concept buttons. Picking a style changes every phase icon in all six concepts, on Day and Week, so you can judge it in context. A small preview strip at the top shows the four phases in the chosen style.

Six styles to choose from:

1. **Filled circle** (current) — solid phase color circle, light icon.
2. **Soft tint circle** — pale phase tint circle, deep-color icon. Calmer, less bold.
3. **Outline ring** — thin ring in the phase color, deep icon, no fill. Light and airy.
4. **Rounded square tile** — soft-cornered tile in the tint with a deep icon, app-icon feel.
5. **Pill chip** — icon plus phase name inside one tinted pill ("Leaf Plan").
6. **Moon-arc badge** — tinted circle with a partial ring showing where the phase sits in the cycle (a quarter for Plan, half for Grow, three quarters for Care, full for Let go).

The NOW phase keeps a stronger version in every style (filled or ringed), so the current phase still stands out. Every style shows the icon with its name nearby and keeps readable contrast.

## Scope

- Only the mockups page changes; your real planner stays the same.
- After you pick one, I can use it across the real Today and Planner screens.

## Technical details

- Add a `PhaseBadge` helper in `src/pages/ScheduleMockups.tsx` with a `variant` prop (six styles), using the existing `--rhythm-{phase}`, `-tint`, `-deep`, `--rhythm-on` tokens and `PhaseIcon`.
- Page-level `iconStyle` state passed through React context so all concept components swap their current icon markup for `PhaseBadge`.
- No data or shared component changes.
