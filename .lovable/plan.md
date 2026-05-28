## Today Hero Widget — Mobile + Atmosphere + Dark-Mode Fixes

The "widget" is the top hero card on the Today page (greeting, date, affirmation, day navigator, Schedule/Plan toggle, energy chips, clock/moon block).

### 1. Center-align on mobile

In `src/pages/Today.tsx`:
- Change the inner flex column from `flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between` to also center children on mobile: add `items-center text-center sm:items-start sm:text-left`.
- On the inner `<div className="min-w-0">` wrapper, add `flex flex-col items-center sm:items-start` so the greeting line, date `<h2>`, affirmation, day-pickers row, layout toggle row, and energy row all sit centered under each other on mobile.
- Add `justify-center sm:justify-start` to the day-nav row, the Schedule/Plan/Today/Week/Month toggle row, and the energy chips + "Plan with this energy" row so the chip groups don't pin left.
- `AuroraClock` already centers on mobile (`items-center sm:items-end`) — no change.

### 2. Background tints with the active atmosphere

The hero uses `.gradient-calm`. In light mode it's hard-coded purple/blue and ignores the chosen atmosphere; in dark mode it's already primary-tinted.

In `src/index.css`, replace the light-mode `--gradient-calm` definition (~line 75) with the same primary/moon formula used in `.dark`, so every atmosphere recolors the hero:
```
--gradient-calm: linear-gradient(135deg, hsl(var(--primary) / 0.14), hsl(var(--moon) / 0.12)), hsl(var(--card));
```
This pulls from each atmosphere's `--primary` / `--moon` tokens, so Blossom reads pink, Sage reads green, Moonlit Plum reads plum, etc., in both light and dark themes. Keep the existing `.dark` override (already correct).

### 3. Dark-mode text legibility

Two issues visible in the dark screenshot: the gradient date "May 27, 2026" almost disappears, and the "10:58 PM" digits dim out.

In `src/index.css`:
- Scope a brighter variant of `.text-gradient-glow` under `.dark` — bump the lightness of the gradient stops and the drop-shadow so it reads against the dark card:
```
.dark .text-gradient-glow {
  background-image: linear-gradient(120deg,
    hsl(var(--primary-foreground)) 0%,
    hsl(var(--foreground)) 50%,
    hsl(var(--primary-foreground)) 100%);
  filter: drop-shadow(0 0 14px hsl(var(--primary) / 0.55));
}
```
- In `Today.tsx`, the greeting "SOFT NIGHT, DENA · WEDNESDAY" uses `text-muted-foreground` which is also faint in dark. Change that single line to `text-muted-foreground dark:text-foreground/80` so it stays subtle in light mode but readable in dark.

### Out of scope

- No layout or logic changes to the day grid below the hero.
- No new settings/toggles; this just makes the existing widget respect the already-selected atmosphere and theme.
