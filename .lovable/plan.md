## Changes

**1. Wrap checklist task text (currently truncated)**

Replace `truncate` with wrapping in the reset checklist rendering so long titles are fully visible:
- `src/components/reset/redesign/RoomCard.tsx` line 176 — task title span: swap `truncate` for `break-words whitespace-normal leading-snug`.
- `src/components/reset/redesign/pieces.tsx` line 208 — subtask/task label: same swap.
- `src/components/reset/redesign/RoomCard.tsx` line 56 — room title: keep on one line but allow break with `line-clamp-2 whitespace-normal` (so long room names don't cut off either).

**2. Route the Home Reset section as the home page**

Currently `/` → `IndexRedirect` → user's saved default route (usually `/today` or `/dashboard` = HomeHub). We'll make Home Reset the landing surface:
- In `src/App.tsx`, change `<Route path="/home-reset" element={<HomeHub />}>` to `<Route path="/home-reset" element={<HomeReset />}>` so the redesigned page actually renders.
- Update `src/components/auth/IndexRedirect.tsx` `FALLBACK_ROUTE` from `"/today"` to `"/home-reset"` so signed-in users with no saved preference land on Home Reset.
- Leave the user's explicit `settings.defaultRoute` intact — if they've picked another page it still wins. Only the default changes.

No business-logic or data changes; presentation + routing only.