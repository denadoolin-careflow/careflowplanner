## Goal

Audit and fix WCAG contrast across all 9 atmospheres × 2 modes (light/dark) defined in `src/index.css`, so text never gets washed out or too dim regardless of the active atmosphere.

## Approach

1. **Audit script (one-off, in `/tmp`)**
   Parse `src/index.css` and extract every `:root[data-atmosphere=…]` and `.dark[data-atmosphere=…]` block. For each block, compute WCAG contrast ratios for the pairs that matter most:
   - `foreground` on `background`
   - `foreground` on `card`
   - `foreground` on `popover`
   - `muted-foreground` on `background` / `muted`
   - `primary-foreground` on `primary`
   - `accent-foreground` on `accent`
   - `secondary-foreground` on `secondary` (when defined)
   - `border` on `background` (≥3:1 for UI separators)

   Targets: **4.5:1** for normal text, **3:1** for large text / UI borders / icons.
   Output a table of fails per atmosphere/mode.

2. **Fix failing tokens in `src/index.css`**
   For each fail, nudge only the lightness of the offending token (keep hue + saturation so the atmosphere mood is preserved). Bias direction:
   - Light modes → darken `*-foreground`, lighten `background/card`.
   - Dark modes → lighten `*-foreground`, darken `background/card`.
   - `muted-foreground`: raise to ≥45% L in light, ≥68% L in dark.
   - `border`: nudge until ≥3:1 against background.

   Do not touch hue/saturation or gradient definitions unless a swatch itself is the failing surface.

3. **Re-run the audit** to confirm zero fails, then summarize the deltas (which atmospheres changed, which tokens, before → after L%).

## Out of scope

- Restructuring the atmosphere system or adding new tokens.
- Flow-accent colors (`src/lib/flow-accent.ts`) — separate concern; only touch if a flow accent is rendered as text on a surface and fails.
- Component-level color overrides; the fix lives in atmosphere tokens.

## Deliverable

Patched `src/index.css` with adjusted HSL lightness values where needed, plus a short report in chat listing every change.
