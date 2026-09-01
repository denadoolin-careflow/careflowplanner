# WellFlow — Nutrition, GLP-1 & Weight Tracking

A new WellFlow section: one calm place to log food and water, track calories and macros against personal goals, record GLP-1 injections, and watch weight trend over time. Round one covers the daily-use core; insights, weekly review, and the guidance library follow in a second pass.

## Where it lives

New `/wellflow` area with its own tabs, linked from the sidebar (the WellFlow group already exists in navigation) and from a mobile bottom bar inside the section:

```text
Today  |  Food  |  Progress  |  GLP-1
```

The existing Health page stays as-is; WellFlow links across to it for sleep, movement, and cycle.

## 1. Today (WellFlow dashboard)

- Date header, then four calm progress rings: Calories, Protein, Fiber, Water — each showing "1,420 / 1,800" style numbers with soft sage fills and a gold accent as goals near completion.
- Secondary strip: meals logged, current weight, change from starting weight, next injection date and days since last.
- Big, friendly **+ Log Food** button plus quick chips: Water, Weight, Injection, Check-in.
- "How are you feeling today?" — optional 1–5 selectors for energy, hunger, fullness, nausea, digestion, mood. Saves one row per day, editable.
- **Today timeline** — chronological list of everything logged (food with calories/protein, water amounts, weight, injection, check-in), each tappable to edit or delete with undo.
- Encouraging copy driven by real numbers ("Protein is looking strong today", "A small snack could help you reach your protein goal"). No shame, no red warnings.

## 2. Food logging & lookup

- Search sheet titled "What did you eat?" with tabs: Search, Recent, Favorites, Custom.
- Search results come from **Open Food Facts** (free, no key) covering packaged and branded foods, merged with the user's own custom foods and previously logged items. Barcode scanning uses the phone camera where supported.
- Plain-language entries ("2 eggs and toast") are estimated by AI through the app's built-in AI, returning name, serving, calories, protein, carbs, fat, fiber — always shown for review and editable before saving.
- Each result shows serving size, calories, protein, carbs, fat, fiber. Adjust serving size, number of servings, and meal (Breakfast, Lunch, Dinner, Snack, Other).
- Star a food to favorite it; **Log again** on recents re-logs in one tap. Totals update immediately.

## 3. Goals

"Set my goals" screen for calories, protein, fiber, carbs, fat, and water. Nothing is auto-prescribed; copy makes clear these are the user's own targets, set with their healthcare professional if they choose. Editable any time.

## 4. GLP-1 ("My GLP-1")

- Medication profile the user fills in: medication name, prescribed dose, frequency, injection day, start date, optional provider, notes. The app never suggests, calculates, or changes a dose.
- Timeline card: last injection (date, medication, dose, site) and next injection (date + gentle countdown).
- Log an injection with date, dose, site (left/right abdomen, thigh, upper arm, other), symptom notes (appetite, nausea, energy, digestion, other) and free text.
- Scrollable injection history, each entry editable and deletable.
- A short "talk to your healthcare professional" note for dose questions, persistent side effects, or severe symptoms — informational only, never diagnostic.

## 5. Weight & progress

- Record weight with date and optional note; set starting weight and goal weight.
- Summary: starting, current, goal, lost, remaining — all computed from real entries, never seeded with sample numbers.
- Goal bar showing percent of the way from starting weight to goal.
- **My Weight Journey** chart with 7 day / 30 day / 3 month / 6 month / 1 year / all-time filters, goal line, and every weigh-in plotted. Tapping a point shows date, weight, change from the previous entry, and note. Footer line: "Progress isn't always linear. Look at the trend over time." No projected trend line.

## 6. Quick capture everywhere

"Food" becomes a first-class option in the app's existing global quick-add (and the floating action button), alongside Water, Weight, Injection, and Check-in — so logging never requires opening WellFlow. Target: under ten seconds.

## 7. Today page widgets

Optional cards on the main Today page: nutrition (calories + protein), water, current weight, and next injection countdown — each linking into WellFlow.

## 8. Design & polish

CareFlow's existing tokens throughout: sage, cream, warm neutrals, subtle gold, rounded cards, generous spacing, gentle motion. Mobile-first layouts, accessible labelled controls, empty states, loading skeletons, validation on numeric fields, edit/delete with undo toasts, and confirmation messages.

## Not in round one

Insights and pattern detection, the weekly summary and reflection, and the "Nourish Your Body" guidance library — planned as a follow-up once the core is in daily use.

## Technical notes

- Existing tables reused: `weight_logs`, `medications` / `medication_logs`, `symptom_logs`.
- New tables (all private to the signed-in user, with row-level security and grants): `food_entries`, `custom_foods`, `nutrition_goals`, `water_entries`, `glp1_profile`, `glp1_injections`, `wellness_checkins`. Weight goal/start stored alongside nutrition goals.
- New client libraries under `src/lib/wellflow/` for goals, food entries, water, weight, injections, and check-ins, following the existing cache + hook pattern used by `src/lib/medications.ts`.
- Open Food Facts search proxied through a small edge function (caching + no CORS surprises); plain-language parsing uses a second edge function on the app's AI gateway with a strict JSON schema.
- Charts use the recharts setup already in the project.
- Routes: `/wellflow`, `/wellflow/food`, `/wellflow/progress`, `/wellflow/glp1`, registered in the existing authenticated route group.
