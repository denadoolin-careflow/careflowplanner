# One hourly weather source across the timeline and capacity bar

Right now the hour-by-hour condition colors and icons only exist inside the planner weather strip (`PlannerWeatherStrip.tsx`), where the tint helper and icon switch are defined locally. The timeline hour rail shows no weather at all, and the capacity bar has no weather indicator. This makes the three surfaces disagree.

## What changes

1. **Shared hourly weather helper**
   Move the condition hue/saturation table, the tint function, and the condition icon into a shared module so every surface renders the exact same color and icon for a given hour. The weather strip keeps its current look, just sourced from the shared helper.

2. **Timeline hour rail**
   Each hour row in the day timeline gets a small condition icon next to the hour label, and the row band picks up the same soft condition tint (sunny yellow, blue rain, grey snow, violet storm, indigo clear night). Tints stay very low opacity so tasks and blocks remain the visual focus. Hours with no forecast data render exactly as they do today.

3. **Capacity bar weather indicator**
   Each morning / afternoon / evening band in `PlannerCapacityBar` gains a compact weather chip: condition icon, temperature, and precipitation percent when it is 10% or higher, colored from the same shared tint. It uses the dominant condition for that band's hours, so it always matches the hours shown in the timeline and strip.

## Technical notes

- New `src/lib/planner/hour-weather.ts` exports `condTint(condition, isNight)`, `hourTint(hour)`, and a `dominantCondition(hours)` helper; icon component lives in `src/components/weather/ConditionIcon.tsx`.
- Hour data comes from the existing `useWeatherSnapshot().todayHourly`; band hour ranges reuse the capacity bar's existing 5-12 / 12-17 / 17-22 boundaries clamped to available forecast hours.
- Weather only renders for today's date; other dates show the bands with no weather chip.
- Colors go through the shared helper's HSL values rather than hardcoded Tailwind color utilities.
