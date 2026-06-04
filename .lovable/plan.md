## Goal
Give every note a quick visual identity:
1. An **auto-suggested Lucide icon** (with a search-driven picker to override) that shows on the sidebar's Pinned Notes list, in the Notes gallery/list, and in the note's own header.
2. An optional **gradient cover** built from the project's atmosphere palettes — choose from a curated set (one per atmosphere) instead of (or alongside) uploading an image.

## Schema (single migration)
Add two columns to `public.notes`:
- `icon TEXT NULL` — Lucide icon name (e.g. `"BookHeart"`). `null` means "auto".
- `cover_gradient TEXT NULL` — gradient preset id (e.g. `"sage-sanctuary"`, `"moonlit-plum"`, etc.). Mutually visual-exclusive with `cover_url`: if both set, `cover_url` (image) wins.

No RLS changes — existing policies on `notes` already cover the new columns.

## Code changes

### 1. Note type + persistence (`src/lib/notes.ts`)
- Extend `Note` interface with `icon?: string | null` and `coverGradient?: string | null`.
- Map columns in `fromRow` and `updateNote`/`createNote`.

### 2. Icon catalog + auto-suggest (`src/lib/note-icons.ts` — new)
- Curate ~80 high-signal Lucide icons grouped into categories (Writing, Life, Work, Care, Health, Home, Travel, Money, Ideas, Nature, Symbols).
- `suggestIconForNote(note)` heuristic: scan title (and first 200 chars of body) for keyword matches → return icon name (e.g. "recipe" → `ChefHat`, "doctor" → `Stethoscope`, "trip" → `Plane`, "moon"/"journal" → `BookHeart`, "idea" → `Lightbulb`, `kind === "daily"` → `Sun`, fallback → `StickyNote`).
- `resolveNoteIcon(note)` returns the user override (if set) or the suggested icon.
- `getLucideIcon(name)` looks the icon up from the `icons` map exported by `lucide-react` with a safe fallback.

### 3. Icon picker component (`src/components/notes/NoteIconPicker.tsx` — new)
- `Popover` trigger renders the current icon (button).
- Inside: search `Input` (filters by name + tag), category tabs/sections, scrollable grid of icon tiles (28-32px), "Auto" option to clear override, "None" option to suppress.
- Recently-used icons stored in `localStorage` (`careflow:note-icons:recent`).
- ~80 curated icons keep the list fast and on-brand; users still get search across the full curated set.

### 4. Gradient cover catalog (`src/lib/note-covers.ts` — new)
- One preset per atmosphere, derived from its `palette` (`ATMOSPHERES`).
- Each preset: `{ id, name, css }` where `css` is a multi-stop linear/radial gradient using 3-4 palette swatches (e.g. for Dawn: warm peach → cream → coral wash).
- Helper `getNoteCoverCss(id)` and `NOTE_COVER_PRESETS` list for the picker.

### 5. Gradient cover picker
- In `NoteDetail.tsx`, when no image cover is set, the existing "Cover" button becomes a `Popover` with two tabs: **Gradient** (grid of palette swatches showing the gradient + atmosphere name) and **Upload** (existing image flow).
- Selecting a gradient writes `coverGradient`. Selecting "Remove" clears both.
- Render: if `coverUrl` exists → image (unchanged); else if `coverGradient` → a 180-220px-tall block with the preset's CSS gradient and a subtle bottom fade into the page bg.

### 6. Icon + cover display surfaces
- **Note header** (`NoteDetail.tsx`): render the resolved icon next to the title (24px), and an "Icon" button (the `NoteIconPicker`) right next to the existing Cover/Pin/Delete cluster.
- **Sidebar Pinned Notes** (`PinnedNotesSection` in `src/components/layout/Sidebar.tsx`): replace the generic `StickyNote` icon with `resolveNoteIcon(note)` rendered via `getLucideIcon`.
- **Notes page**:
  - `GalleryCard`: replace the conditional `Sun`/no-icon block with the resolved icon (16px). When `coverGradient` is set and `coverUrl` isn't, render a 64px gradient strip at the top of the card.
  - `ListView` row: prepend the resolved icon (14px) before the title.
  - `KanbanView` card and `CalendarView` chip: same icon prefix.

### 7. Auto-icon refresh
- Whenever `title` is saved (debounced in `NoteDetail`) AND the user hasn't manually set `icon`, recompute the suggestion locally for instant preview. No DB write needed — `resolveNoteIcon` always derives at render time when `icon` is null.

## Non-goals
- No changes to project covers, area covers, or task icons.
- No AI call for icon suggestion — the keyword heuristic is fast, free, and predictable.
- No new dependency (Lucide icons map already ships with `lucide-react`).

## Files touched
- `supabase/migrations/<new>.sql` — add `icon`, `cover_gradient` columns
- `src/lib/notes.ts` — type + mapping
- `src/lib/note-icons.ts` (new) — catalog, suggester, resolver, getter
- `src/lib/note-covers.ts` (new) — gradient presets from atmospheres
- `src/components/notes/NoteIconPicker.tsx` (new)
- `src/components/notes/NoteCoverPicker.tsx` (new)
- `src/pages/NoteDetail.tsx` — header icon, picker wiring, gradient cover render
- `src/pages/Notes.tsx` — icons + gradient strip in Gallery/List/Kanban/Calendar
- `src/components/layout/Sidebar.tsx` — icon in `PinnedNotesSection`