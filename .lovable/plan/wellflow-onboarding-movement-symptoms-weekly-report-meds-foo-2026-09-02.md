# WellFlow: onboarding, movement, symptoms, weekly report, meds & food guide

Five additions to the existing WellFlow area. Everything stays private to your account, descriptive only — no diagnosis, no medication-dose advice, no promised results.

## 1. Diet-choice onboarding

- A short guided flow that opens the first time you visit `/wellflow/plan` (and re-runnable from a "Change plan" button).
- Steps: pick a style (Balanced, Keto, Low-carb/Atkins, GLP-1 friendly, Points-style, High-protein, Custom) → confirm current/target weight and pace → review auto-generated calorie/protein/carb/fat/fiber/water targets → apply.
- Applying writes the plan and pushes the targets into your WellFlow goals, so rings and goal bars update everywhere immediately. Every number stays editable afterwards.
- Style choice also drives the meal-shape and movement suggestions already on the plan screen.

## 2. Exercise logging tied to the plan

- A movement log inside WellFlow: type (walk, strength, yoga, cardio, other), minutes, intensity, optional note, logged for a date and time.
- Quick "Log movement" action on the Today tab and in the quick-capture menu.
- Plan screen gains a weekly movement ring: days moved vs the movement days your plan targets, plus a simple streak.
- Insights gains a movement-vs-energy comparison: your average energy check-in on days you moved compared with days you didn't, using only your own logs.

## 3. Editable per-meal symptom ratings

- The "How did that feel?" sheet becomes editable: reopening it for a logged meal loads what you saved so you can change the rating, symptoms, timing, or note, or delete the entry.
- Each symptom gets its own 0–3 severity rating (energy, bloating, nausea, heartburn, gas, cravings, headache, focus) instead of a plain on/off chip.
- A per-food comparison view: pick a food you've logged more than once and see average energy, how often each symptom showed up, and the trend across your entries. Foods sort into "sits well" and "tends to bother me" lists by your own averages.

## 4. Weekly progress report

- New weekly view in WellFlow: the last 7 days versus the previous 7 — calories, protein, water, weight change, days logged, movement minutes, injections, average energy, and plan adherence.
- Highlights are plain observations from your data ("You hit your protein target 5 of 7 days"), plus your best- and worst-feeling foods that week.
- Shareable through the existing export sheet as CSV or the simple PDF report.

## 5. Medicines and supplements in WellFlow

- Reuse the existing medication tracker so WellFlow shows your medicines and supplements alongside GLP-1 doses.
- Supplements get their own kind (vitamin, mineral, supplement, medication) with dose, times, and taken/skipped tracking, using the same reminder system.
- Today tab shows the doses due today with one-tap taken/skip; GLP-1 tab keeps its injection history separate.

## 6. Nutrition guide

- A reference screen at `/wellflow/guide`: browsable cards by food group (protein, fiber, healthy fats, produce, fermented, hydration) explaining what each tends to do — fullness, steady energy, digestion, blood-sugar steadiness.
- Each card lists common examples with typical calories/protein, and links straight into logging or your grocery list.
- Sections for eating on a GLP-1 (protein and fluids first, smaller portions) and for cycle-phase nourishment, matching what the app already tracks.
- Framed as general nutrition education with a clear note to talk with your own care team.

## Technical notes

- New private tables: `wellflow_movement_logs` (type, minutes, intensity, date, logged_at, note) and a `wellflow_supplements` extension via a `kind` column on the existing medications table; `food_feel_logs` gains a `severities` JSON column for per-symptom ratings. All owner-scoped RLS with grants.
- New libs: `src/lib/wellflow/movement.ts`, `src/lib/wellflow/weekly-report.ts`, `src/lib/wellflow/nutrition-guide.ts` (static content).
- New components: `OnboardingDialog.tsx`, `MovementSheet.tsx`, `MovementCard.tsx`, `FoodSymptomCompare.tsx`, `WeeklyReport.tsx`, `MedsSupplementsCard.tsx`, `NutritionGuide.tsx`.
- Updates: `PlanScreen.tsx` (onboarding + movement ring), `FoodFeelSheet.tsx` (edit/delete + severities), `FoodFeelPatterns.tsx`, `InsightsTab.tsx`, `TodayTab.tsx`, `WellFlow.tsx` (new `report`, `guide` tabs/routes), `nav.ts`, `export.ts`, `reminders.ts`.
- Verification: type-check plus an authenticated preview pass over plan, today, insights, report, and guide on mobile width.
