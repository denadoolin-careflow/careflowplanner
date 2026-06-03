## Goal
Make the sidebar's "Jump to project or area" search keyboard-driven: ↑/↓ moves through results, Enter opens the highlighted one, Esc clears.

## Changes (all in `src/components/layout/Sidebar.tsx`)

1. **Build a unified results list** when `pqTerm` is set:
   `results = [...filteredAreas.map(a => ({ kind: 'area', to: `/areas/${encodeURIComponent(a.name)}`, ...a })), ...filteredProjects.map(p => ({ kind: 'project', to: `/projects/${p.id}`, ...p }))]`.

2. **Add `activeIdx` state** (number, default 0). Reset to 0 whenever `pquery` changes or results length changes.

3. **Wire `onKeyDown` on the search `<input>`**:
   - `ArrowDown` → `activeIdx = (activeIdx + 1) % results.length` (preventDefault)
   - `ArrowUp` → `activeIdx = (activeIdx - 1 + results.length) % results.length` (preventDefault)
   - `Enter` → if `results[activeIdx]`, call `navigate(results[activeIdx].to)`, then `setPquery("")` and `onNavigate?.()`.
   - `Escape` → `setPquery("")`.
   No-ops when `results.length === 0`.

4. **Highlight the active row**: render results from the single `results` array (replacing the two separate `.map` blocks). Apply `bg-sidebar-accent text-foreground` when `idx === activeIdx`, and set `aria-selected`. Use `useEffect` + a ref map to `scrollIntoView({ block: 'nearest' })` for the active row when `activeIdx` changes.

5. **A11y**: add `role="combobox"` + `aria-expanded`/`aria-controls` on the input, `role="listbox"` on the results container, `role="option"` on each row.

## Out of scope
Global hotkey to focus the search, fuzzy ranking, recent/favorite boosting, mouse-hover syncing `activeIdx`.