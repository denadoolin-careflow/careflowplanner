The auth page (`Auth.tsx`) uses a custom light radial-gradient background that does not change with the theme. It currently relies on `text-foreground`, which is light in dark mode and invisible against the light background. A `useEffect` tries to strip the `dark` class after mount, but this is reactive and unreliable — text can render invisible before the effect fires, or if the class is re-added by other logic.

Fix: replace theme-dependent `text-foreground` on the auth page with an explicit dark color (e.g., `text-slate-900`).

### Files changed
- `src/pages/Auth.tsx`

### What we will change
1. **Brand title** (line 176): change `text-foreground` → `text-slate-900`
2. **Tagline** (line 177): change `text-muted-foreground` → `text-slate-600`
3. **Page heading + subheadings**: switch `text-foreground` to explicit dark colors so they stay readable regardless of the `dark` class state.
4. **In-app browser banner** (line 191): the existing `dark:text-amber-300` is now unnecessary; keep `text-amber-800` (or similar) for readability on the light background.
5. **Remove the force-light `useEffect`** (lines 50-55) since it is no longer needed and was causing the flash-of-invisible-text.

### What we will NOT change
- Form inputs, buttons, tabs — these already use `bg-card/85` and other adaptive tokens that work in both modes, or are inside the card which has its own background.
- The background gradient itself stays the same.

### Verification
- Build passes (`npx tsc --noEmit`).
- Preview the `/auth` route in both light and dark mode; all text remains legible.