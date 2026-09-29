# Project architecture decisions

- Planner rhythm density is stored as a device-local presentation preference; habit and routine completion data remains in the existing synced stores.
- Past-day routine step completions read/write routine_completions; today's live done flags stay on routines.items. Habit weeklyTarget and skip dates live in habits.meta; routine skips in routines.meta — no schema change.
- Daily rituals reuse daily_checkins for Morning Reset and dated journal entries tagged with the evening-reflection template for Evening Reflection completion, avoiding a duplicate ritual store.
- Ritual step lists (Morning Reset / Evening Reflection) and their per-date check-offs are device-local (localStorage) presentation data; ritual completion itself stays in daily_checkins / journal.
- Completed-task strikethrough is a device-local planner presentation preference shared across scheduled, all-day, and list task surfaces.
- Event types (appointment/family/reminder) reuse appointments.type; their colors are device-local (localStorage) like calendar kind colors.
- Today and Planner use page-scoped Soft Botanical mobile presentation tokens and Outfit/Figtree typography, preserving the app-wide theme.
