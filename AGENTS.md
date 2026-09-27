# Project architecture decisions

- Planner rhythm density is stored as a device-local presentation preference; habit and routine completion data remains in the existing synced stores.- Past-day routine step completions read/write routine_completions (src/lib/routine-history.ts); today's live done flags stay on routines.items. Habit weeklyTarget and skip dates live in habits.meta; routine skips in routines.meta — no schema change.
