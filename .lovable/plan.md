# Mobile UX pass: Today + Planner

A focused five-credit pass using the selected **Botanical flow feed** direction: Soft Botanical colors, Outfit headings, Figtree body text, and a calm single-column rhythm. Existing planning features and the app-wide navigation remain unchanged.

## What will change

### 1. Give Today a clearer mobile opening
- Tighten the top date/layout controls into a compact, thumb-friendly bar.
- Present Morning Reset and Evening Reflection as a concise ritual strip instead of two tall cards on phones; all existing step editing and weekly history remain available.
- Keep the existing Plan / Care / Grow sections, but make the Plan feed the strongest default path: current focus, Top 3, then the day plan.
- Reduce repeated framing and excess vertical space so useful content appears sooner, while retaining every existing card below the focused opening.

### 2. Turn the mobile Planner header into one calm command area
- Replace the current stacked, horizontally scrolling control rows with a two-level sticky header: date/navigation first, range and active mode second.
- Keep task tray, add task, display settings, reminders, auto-schedule, filters, and alternate views in the existing overflow menu where appropriate.
- Preserve Day, 3 Day, Week, Month, and Year access without forcing horizontal page scrolling.

### 3. Apply the selected visual system within these pages
- Add semantic Soft Botanical tokens matching `#40574A`, `#91A88F`, `#D9BFC4`, and `#FAF7F1`, including dark-mode equivalents.
- Use Outfit for page headings and Figtree for mobile feed text on Today and Planner only.
- Use light botanical dividers, restrained cards, readable task text, and 44px minimum touch targets.
- Keep motion limited to short fades and pressed states, respecting reduced-motion settings.

### 4. Responsive and accessibility polish
- Remove mobile-only horizontal overflow from the redesigned control areas.
- Ensure long task, ritual, and date text wraps or truncates intentionally without covering controls.
- Preserve clear focus states, labels, selected states, and adequate contrast.
- Verify Today and Planner at common phone widths, plus desktop to ensure the scoped changes do not regress the existing layout.

## Technical notes

- Update the existing Today composition and ritual presentation rather than creating a duplicate page.
- Refactor the mobile branch already present in the Planner page; planner data, scheduling, drag-and-drop, and preference storage stay unchanged.
- Add reusable page-scoped feed styles/tokens in the design system and reuse existing Button, Sheet, and menu controls.
- No backend, schema, task logic, calendar logic, or app-wide navigation changes.
