# Make every color palette fully recolor the app

## What's wrong now
Each palette (Sage, Ocean, Rose, etc.) only swaps the background, main button color, accent and focus ring. Everything else stays on the new CareFlow brand: forest-green text, cream cards, olive chips, borders, muted panels, the burgundy-to-gold gradient (gradient text, Get Started button, icon rings) and the brand logo tints. So picking a palette looks half-applied. The "Cream" swatch also still shows the old purple instead of the CareFlow burgundy.

## What will change
- Each of the 15 palettes gets a complete set of colors for light and dark mode: text, cards, pop-ups, secondary chips, muted panels, borders, inputs, soft tints, and its own matching gradient and glow.
- The default swatch is renamed "CareFlow" and shows burgundy.
- Pages with their own look (Today/Planner botanical, Home/Meals warm kitchen, Notes atmosphere) keep their style; only shared colors follow the palette.
- Text stays readable (4.5:1 contrast) in every palette, both modes.

## Technical details
- `src/index.css`: extend each `:root[data-theme=x]` and `.dark[data-theme=x]` block with `--foreground`, `--card(-foreground)`, `--popover(-foreground)`, `--primary-foreground`, `--secondary(-foreground/-soft)`, `--accent-foreground/-soft`, `--muted(-foreground)`, `--border`, `--input`, `--gradient-seasonal`, `--gradient-warm`, `--shadow-glow`, and sidebar tokens, derived from each preset's hue.
- `src/lib/theme-preset.ts`: default label "CareFlow", swatch `hsl(347 67% 33%)`.
- Search components for raw `--brand-*` / hex use on shared surfaces and switch to semantic tokens where they block palette changes (logo mark stays brand).
- Add a small test that every preset id in `THEME_PRESETS` has light and dark blocks in index.css.
- Verify in the browser by switching several palettes in light and dark mode on Today, Inbox and Settings, with screenshots.
