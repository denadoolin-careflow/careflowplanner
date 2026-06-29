## Problem
In `src/index.css` line 2437, the sage-sanctuary contrast pass override is unscoped:

```css
:root[data-atmosphere="sage-sanctuary"] { --foreground: 285 22% 14%; --muted-foreground: 285 14% 36%; --border: 50 22% 82%; }
```

Unlike every other atmosphere on lines 2440–2456 that use `:not(.dark)`, this one applies in both light and dark mode. In dark mode it overrides the proper light `--foreground` defined at line 1113 with a near-black value, producing dark text on the dark background.

## Fix
Add `:not(.dark)` to the selector so the contrast tweak only applies in light mode, matching the pattern used by all other atmospheres:

```css
:root[data-atmosphere="sage-sanctuary"]:not(.dark) { --foreground: 285 22% 14%; --muted-foreground: 285 14% 36%; --border: 50 22% 82%; }
```

No other files change.

## Verify
Switch to sage-sanctuary in both light and dark mode via the atmosphere picker; confirm body text reads cream-on-deep-green in dark mode and dark-on-cream in light mode.
