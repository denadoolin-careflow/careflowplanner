# Match Home Reset to the active atmosphere

Right now `/home-reset` renders in a fixed sage-cream palette (`--reset-cream`, `--reset-sage`, `--reset-ink`, …). It ignores the user's chosen atmosphere, so on dark/transparent atmospheres it looks like a bright cream card floating on a dark page.

Fix: rebind the `--reset-*` tokens to the app's semantic atmosphere tokens (`--background`, `--card`, `--foreground`, `--muted`, `--primary`, `--accent`, `--border`) so the whole Reset surface — glass cards, text, chips, progress bars, hero overlay, and CTAs — inherits the active atmosphere in both light and dark mode.

## Changes

### 1. `src/index.css` — remap reset tokens to semantic tokens
Replace the hardcoded HSL values in the `:root` and `.dark` reset blocks (around lines 2756–2780) so each `--reset-*` variable references an existing semantic token:

- `--reset-cream` → `var(--background)`
- `--reset-cream-deep` → `var(--card)`
- `--reset-sage` → `var(--primary)`
- `--reset-sage-soft` → `var(--muted)`
- `--reset-sage-deep` → `var(--primary)` (used for deep accents/text-on-soft)
- `--reset-gold` → `var(--accent)`
- `--reset-gold-soft` → `var(--accent) / low alpha` equivalent via `--muted`
- `--reset-charcoal` → `var(--foreground)`
- `--reset-ink` → `var(--foreground)`
- `--reset-line` → `var(--border)`

Because the existing `.reset-glass*` utilities wrap these in `hsl(var(--reset-cream) / 0.85)` etc., store the tokens as raw HSL triplets (not `hsl(...)` wrappers). Simplest path: keep the variable names but set them to the same triplet the semantic token uses. Add a helper block at the top of each atmosphere override isn't needed — the semantic tokens already flip per atmosphere/theme.

Drop the separate `.dark` reset block since values now derive from tokens that already have light/dark variants.

### 2. `src/components/reset/redesign/HeroBand.tsx` — atmosphere-aware overlay + CTA
- Replace the `from-[hsl(var(--reset-cream))/0.92]` gradient overlays with `from-background/90 via-background/70 to-transparent` and `from-background/60`.
- Replace the CTA gradient `from-[hsl(var(--reset-sage))] to-[hsl(var(--reset-sage-deep))]` with `from-primary to-primary` (or `to-accent`) and `text-primary-foreground`.
- Continue chip uses `reset-chip` which now inherits atmosphere via the token remap.

### 3. Verify
- Sanity-check `.reset-glass`, `.reset-glass-strong`, `.reset-chip` still render correctly since they consume the remapped tokens.
- Confirm hero image opacity still reads well on dark atmospheres (keep existing `opacity-70 dark:opacity-40`).

## Technical notes
- No component logic changes; presentation only.
- No new tokens introduced — reuse existing semantic tokens defined per `data-atmosphere`.
- Progress bars and check states keep their current classes; they'll pick up the atmosphere primary automatically.

## Out of scope
- No changes to routing, data, or the Reset checklist behavior.
- No changes to the sidebar badge (`9+`) shown in the selected element — user asked about the page/buttons color, not the sidebar chip.
