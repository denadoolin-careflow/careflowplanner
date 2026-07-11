# Today Templates

Add four selectable page templates for `/today` — Calm Rhythm, Command Center, Focus Mode, Family Hub — presented in a full gallery modal. Applying a template seeds the Custom board layout so users can keep editing afterward.

## New files

- `src/lib/today-templates.ts` — template registry:
  - Each template: `{ id, name, tagline, description, accent, widgets: GridItem[] }`.
  - Widget IDs pulled from `buildSidebarWidgetRegistry()` in `widget-registry.tsx`.
  - Rough compositions:
    - **Calm Rhythm** — moon-priorities, weather, tasks-today, brain-dump.
    - **Command Center** — tasks, meals-planned, home-reset, grocery, upcoming-events, weekly-weather, cycle, care-loop.
    - **Focus Mode** — moon-priorities (top 3), what-fits, brain-dump.
    - **Family Hub** — family-snapshot, meals-planned, upcoming-events, home-reset, grocery.
  - Helper `applyTemplate(id)`: writes the template's `GridItem[]` to the same localStorage key `CustomizableGrid` reads for `pageKey="today"`, runs it through `compactLayout` (from `src/lib/dashboard-pack.ts`), then flips `useTodayView` to `"custom"` so the board renders.

- `src/components/today/TemplateGallery.tsx` — Dialog with a 2-col responsive grid of template cards. Each card shows name, tagline, an SVG/CSS wireframe preview built from the widget list, and an "Use this template" button. Selecting one calls `applyTemplate`, closes the dialog, and toasts confirmation.

## Modified files

- `src/components/today/rhythm/RhythmHeader.tsx` — inside the Preferences popover (below the existing prefs), add a "Browse templates" button that opens `TemplateGallery`. Keeps the popover the single settings surface; the modal itself is the gallery per the user's choice.
- `src/lib/today-view.ts` — no schema change; expose a small `setTodayView` imported helper (or reuse existing setter) that `applyTemplate` can call outside a React component.

## Behavior

- Templates are an editable starting point: after apply, the user is on the Custom board and every existing add/remove/resize/undo flow works. Re-applying a template overwrites the current custom layout (with a confirm toast: "Replace current board?").
- No changes to widgets themselves, other Today views, or backend.

## Technical notes

- Reuse `compactLayout(items, cols)` so templates author widgets without pixel-perfect coordinates.
- Preview thumbnails are pure CSS grids sized from each widget's `w`/`h` — no screenshots to maintain.
- All state stays in localStorage; nothing touches the database or edge functions.
