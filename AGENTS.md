# Project architecture decisions

- Planner rhythm density is stored as a device-local presentation preference; habit and routine completion data remains in the existing synced stores.
- Past-day routine step completions read/write routine_completions; today's live done flags stay on routines.items. Habit weeklyTarget and skip dates live in habits.meta; routine skips in routines.meta — no schema change.
- Daily rituals reuse daily_checkins for Morning Reset and dated journal entries tagged with the evening-reflection template for Evening Reflection completion, avoiding a duplicate ritual store.
