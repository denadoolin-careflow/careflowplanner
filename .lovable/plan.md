Replace `truncate` with `whitespace-normal break-words` in three components so long text wraps instead of clipping with an ellipsis.

### Files & Lines
- `src/components/today/rhythm/RhythmSection.tsx` — task title button (line ~178)
- `src/components/today/MealSlotCard.tsx` — selected meal name span (line ~55)
- `src/components/today/widgets/HomeResetWidget.tsx` — checklist item title + list name divs (lines ~48-49)

### Change Detail
Swap the Tailwind `truncate` class for `whitespace-normal break-words` on each targeted element. No other logic or layout changes.