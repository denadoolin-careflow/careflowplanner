## Full redesign of `/home-reset`

Rebuild the Home Reset page top-to-bottom in the sage/cream/gold "atmosphere" you described. All existing data plumbing stays intact — this is a pure presentation + composition rework wired to the same hooks (`useResetChecklists`, `logResetCompletion`, `pomodoro`, `processDueResets`, `ResetHistorySheet`, `ResetScheduleDialog`, `AIGenerateMenu`, etc.). No database changes.

### Palette + tokens (added as CSS vars, dark-mode aware)

- `--reset-cream`  light: `36 45% 96%` / dark: `36 15% 10%`
- `--reset-sage`   light: `140 22% 62%` / dark: `140 25% 45%`
- `--reset-sage-deep` light: `150 25% 30%` / dark: `150 30% 78%`
- `--reset-gold`   light: `40 55% 55%` / dark: `40 60% 68%`
- `--reset-charcoal` light: `150 12% 18%` / dark: `40 15% 92%`
- Glass surface utility: `.reset-glass` → `bg-[hsl(var(--card)/0.55)] backdrop-blur-2xl border border-white/40 dark:border-white/8 shadow-[0_20px_60px_-30px_hsl(150_30%_20%/0.35)]` + 24px radius.

### Page structure (top → bottom)

1. **Hero band** — soft cream→sage gradient, generated calming illustration on the right, overlay quote *"A peaceful home starts with one small reset."* + three CTAs (Start reset · Continue · Reset entire home).
2. **Progress ring card** — animated SVG circular ring showing today's % complete, streak, today's focus, est. time remaining. Confetti + chime on 100%.
3. **View switcher** — segmented control (Checklist / By Room / Routines / Zones) with spring underline; each view rendered from the same `activeLists` data.
4. **Room filter rail** — horizontal scroll of pills (All Areas, Kitchen, Living Room, Bedrooms, Bathrooms, Laundry, Entryway, Dining, Office). Each pill: icon + task count + tiny progress ring. Completed pills glow sage.
5. **Expandable room cards** — one glass card per checklist; collapsed shows icon, name, X/Y tasks, est. minutes, progress bar. Expanded shows task list (checkbox, drag handle, title, star, ⋯ menu) via existing `ChecklistTree`. Card gently scales down as tasks finish.
6. **Smart suggestions strip** — floating sage-tinted cards per room, powered by existing AI menu + simple heuristics (overdue days, adjacent-task nudge, "trash day tomorrow" from settings).
7. **Reset tips carousel** — auto-rotating pill row (open a window, light a candle, calming music, water, natural light).
8. **Daily intention card** — affirmation from `src/lib/affirmations.ts` + "Generate new" button.
9. **Celebration overlay** — modal that appears when a room hits 100%: growing plant SVG + floating leaves + "Continue to next room" button.
10. **Floating quick-actions FAB** — `+` opens radial menu (Add task, Add room, Create routine, Start timer, Voice capture, Scan room). Voice/scan wired to existing hooks where available, stubbed with toast otherwise.

### Reused components / hooks (no changes)

- `useResetChecklists`, `ChecklistTree`, `ChecklistInline`, `AIGenerateMenu`
- `ResetHistorySheet`, `ResetScheduleDialog`, `MoonResetTip`
- `pomodoro`, `fireConfetti`, `playCompletionChime`, `logResetCompletion`, `processDueResets`

### New components (`src/components/reset/redesign/`)

- `ResetHeroBand.tsx` — hero image + quote + CTAs
- `ResetProgressRing.tsx` — animated SVG ring
- `ResetViewSwitcher.tsx` — segmented control
- `ResetRoomRail.tsx` — filterable pill rail
- `ResetRoomCard.tsx` — expandable glass card
- `ResetSmartSuggestions.tsx` — AI + heuristic nudges
- `ResetTipsCarousel.tsx` — rotating tips
- `ResetIntentionCard.tsx` — affirmation
- `RoomCelebration.tsx` — completion overlay
- `ResetQuickFab.tsx` — FAB + radial menu

### File changes

- **Rewrite:** `src/pages/HomeReset.tsx` — new composition; `embedded` prop preserved for HomeHub tab use.
- **New:** the 10 files above under `src/components/reset/redesign/`.
- **Edit:** `src/index.css` — add sage/cream/gold tokens + `.reset-glass` utility (behind media query, dark-mode variants included).
- **Asset:** one generated calming still-life illustration → `src/assets/reset-hero.jpg` (imported as ES module).

### Animation register

- Spring transitions on segmented control + FAB (framer-motion, already in project).
- Checkbox ripple + confetti + card shrink on complete.
- Ring stroke tweens from previous → new %.
- Respects `prefers-reduced-motion` → drops springs to fades.

- Carey floating AI assistant panel
- Gamification scoring dashboard (XP, wellness score, badges)
- Routine templates library UI (uses existing lists for now)
- Voice/scan capture backends (stubbed with toast + hook points)

Ready to build on approval.