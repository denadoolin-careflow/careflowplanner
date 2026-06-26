# Animated Inbox Illustration (Atmospheric Zen Glow)

Replace the static `basketImg` in the Inbox hero with a new self-contained illustration component that smoothly animates between "full" and "empty" states based on the real inbox item count.

## What to build

**New file: `src/components/inbox/InboxIllustration.tsx`**
- Props: `{ isEmpty: boolean; count?: number; className?: string }`.
- Pure Tailwind + SVG/CSS — no extra libraries.
- Uses semantic tokens (`primary`, `accent`, `warm`, `muted`) instead of raw hex so it respects light/dark mode and the project's atmospheric palette (no hardcoded `bg-orange-200` / `bg-emerald-300` like the prototype).
- Structure mirrors the chosen "Atmospheric zen glow" direction:
  - Soft radial glow halo that shifts hue when empty (warm amber → calm emerald-tinted token).
  - Frosted glass tray at the bottom (`bg-card/60 backdrop-blur` + ring).
  - Three stacked "paper" cards (rose/amber/white tokens) above the tray representing held tasks; gently floats with a `float` keyframe.
  - Sparkle cluster above the tray, hidden in full state, revealed when empty.
- Animation: when `isEmpty` flips true, the paper stack fades + scales down + translates up (700ms cubic-bezier ease-out), then sparkles fade/scale in with staggered delays. Reverse when items return.
- Drives transitions off the `isEmpty` prop via conditional class names (no checkbox hack).

**Edit: `src/pages/Inbox.tsx`**
- Remove `import basketImg from "@/assets/inbox-basket.png"` and the `<img>` block at lines 434–441.
- Import and render `<InboxIllustration isEmpty={items.length === 0} count={items.length} />` in the same grid slot, keeping the surrounding hero layout, headline, and chip list untouched.

## Out of scope

- No changes to capture flow, sectioned list, or other Inbox sections.
- No new dependencies; pure Tailwind/SVG.
- Keep the existing hero copy and stats logic.
