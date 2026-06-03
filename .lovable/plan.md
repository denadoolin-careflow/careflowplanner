## Plan: Line-art CareFlow mark from your reference

Translate the attached emblem (circle frame · calendar · leaf branch · caregiver-with-child + heart) into a single-color SVG using `stroke="currentColor"` so it adapts to every atmosphere/light/dark theme.

### Single file changed: `src/components/widgets/CareFlowMark.tsx`

Replace the current paths with a 64×64 viewBox composition:

1. **Outer ring** — `<circle cx="32" cy="32" r="28">` open at top-right to suggest the crescent sweep from the reference.
2. **Calendar (upper-left quadrant)** — rounded rect ~18×16 with two top binder ticks, one horizontal divider, a 3-col × 2-row grid, and a tiny heart glyph in the center cell.
3. **Leaf sprig (lower-left)** — gentle stem curve with 4 alternating teardrop leaves.
4. **Caregiver + child (lower-right)** — two nested arcs forming the parent's embrace, a small circle for the child's head, and a heart at the child's chest.

All paths: `fill="none"`, `stroke="currentColor"`, `stroke-width="1.6"`, `stroke-linecap="round"`, `stroke-linejoin="round"`. Keep the existing component API (`className`, optional `size`) and add a `compact` prop that bumps stroke to 2 for ≤16px use so the favicon stays legible.

### Not changing
- Sidebar layout, wordmark, tagline, responsive collapse — already wired to this component.
- No favicon swap in this pass (say the word and I'll regenerate `/favicon.svg` from the same paths).
- No new dependencies.

### Acceptance
- Renders crisp at 16 / 22 / 56 px.
- Inherits color from any atmosphere via `currentColor` (no hardcoded hex).
- Background fully transparent — sits cleanly inside the sidebar chip.