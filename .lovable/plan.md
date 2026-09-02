# WellFlow: gentle reminders, adherence streaks, correlations, and a smarter food library

## 1. Gentle reminders for meds, symptom check-ins, and movement

Extend the existing WellFlow reminder settings (currently water, weekly weigh-in, daily check-in, GLP-1 dose) with three more, all off by default and respecting quiet hours:

- Meds & supplements — one nudge per scheduled dose time you already entered, reminding you to mark it taken or skipped. It never suggests or changes a dose.
- Symptom check-in — a daily "how did today's food feel?" nudge at a time you pick.
- Movement — nudges on the weekdays you choose, skipped automatically if you already logged movement that day.

All three appear in the reminders sheet with the same toggle/time controls, and the day's outstanding nudges show as gentle cards on the Today plan (Log dose / Log how I feel / Log movement) that dismiss once logged.

## 2. Adherence score and streaks on Today and the weekly report

A single weekly consistency score built from what you already track: days food logged, days on-target for calories/protein, water days, movement days vs your plan target, symptom check-in days, and dose-marking days. Each part shows as a small bar, plus current and best streaks.

- Today: a compact "This week" strip inside the WellFlow card (score ring, streak flame, weakest area).
- /wellflow/report: the full breakdown, current vs prior week, with per-part streaks.

Wording stays descriptive — consistency of logging, never a judgement of health.

## 3. Correlation charts in Insights

New "What affects how I feel" section:

- Symptom vs food: pick a symptom (energy, bloating, nausea, heartburn, satisfied…) and see the foods with the highest and lowest average severity, with how many times each was logged; low-sample foods are marked "not enough logs yet".
- Portion effect: for a chosen food, severity plotted against portion size logged, so larger servings vs smaller servings are visible.
- Movement vs symptoms: average symptom ratings on days with a movement session vs days without, and by minutes bucket.
- Over time: a line of each symptom's weekly average across the selected range.

All charts reuse the existing recharts + range-selector patterns and carry the "patterns from your own log, not medical advice" note.

## 4. Weekly progress export (CSV + PDF)

The export sheet gains a "Weekly progress report" option. It produces:

- Week range and plan style with nutrition targets vs actual averages
- Adherence score, per-part breakdown, and streaks
- Meds/supplements: doses scheduled, taken, skipped
- Movement: sessions, minutes, days vs target
- Symptom summary: most frequent symptoms, best and hardest foods
- Weight change and injections logged

CSV is one sectioned file; PDF reuses the existing jsPDF report layout. Available from the export sheet and from a Share button on /wellflow/report.

## 5. Personalized movement recommendations

On /wellflow/plan, a "Suggested for you" block derived from your own history: your recent movement days vs target, the activities you actually keep up with, typical session length, days of week you usually move, and whether movement days correlate with better-rated symptoms. It proposes a concrete weekly shape (e.g. "3 days, 25 min, walk on Mon/Wed/Sat") plus one gentle stretch goal. Accept applies the movement-day target to your plan and, optionally, arms the movement reminders on those days. Everything stays editable, and suggestions are framed as gentle options, never prescriptions.

## 6. Wellness in the planner + better food search

- Planner: a Wellness lane/section on the daily plan showing today's WellFlow items — doses due, water and food logging status, movement, symptom check-in — with tap-to-log, matching the existing meal lane style.
- Food tracking search: filters for meal type, date range, store/brand, and symptom outcome, plus sort by recency, calories, or protein, applied to the food log and calendar.
- Food library: faster filtering by store, diet tag (keto, low-carb, high-protein, GLP-1 friendly, Weight Watchers style, vegetarian), and macro sliders; results merge the built-in catalog with Open Food Facts and remember your recents and favorites.
- Popular foods: curated "popular for this diet" and "popular at this store" shelves (Walmart, Kroger, Meijer, Aldi, Target, Costco, Trader Joe's) so you can browse and log without typing.

## Technical notes

- Migration: add `meds_enabled`, `symptom_enabled`/`symptom_time`, `movement_enabled`/`movement_days`/`movement_time` columns to `wellflow_reminders`; owner-only RLS unchanged. Optional `wellflow_plans.movement_prefs` jsonb for accepted suggestions.
- New: `src/lib/wellflow/adherence.ts` (weekly score + streaks), `src/lib/wellflow/correlations.ts` (symptom vs food/portion/movement aggregations), `src/lib/wellflow/movement-suggest.ts`.
- Extend `src/lib/wellflow/reminders.ts` scheduler with the three new reminder kinds (meds pull from `doseSlots()` in `src/lib/medications.ts`), and `src/lib/wellflow/export.ts` with `buildWeeklyReportCSV/PDF`.
- New components: `SymptomCorrelations.tsx`, `AdherenceCard.tsx`, `MovementSuggestions.tsx`, `PlannerWellnessLane`; edits to `RemindersSheet`, `ExportSheet`, `WeeklyReport`, `InsightsTab`, `TodayTab`, `WellFlowTodayCard`, `FoodTab`, `FoodLibrary`, `FoodCalendar`, `PlanScreen`, `food-catalog.ts` (diet tags + popular shelves).
- Verify with a type-check and an authenticated preview pass over `/wellflow`, `/wellflow/insights`, `/wellflow/report`, `/wellflow/plan`, and the planner day view.
- Health data stays private and owner-scoped; nothing diagnoses, recommends or changes doses, or promises weight-loss outcomes.
