# Project architecture decisions

- Planner rhythm density is stored as a device-local presentation preference; habit and routine completion data remains in the existing synced stores.
- Past-day routine step completions read/write routine_completions; today's live done flags stay on routines.items. Habit weeklyTarget and skip dates live in habits.meta; routine skips in routines.meta — no schema change.
- Daily rituals reuse daily_checkins for Morning Reset and dated journal entries tagged with the evening-reflection template for Evening Reflection completion, avoiding a duplicate ritual store.
- Ritual step lists (Morning Reset / Evening Reflection) and their per-date check-offs are device-local (localStorage) presentation data; ritual completion itself stays in daily_checkins / journal.
- Completed-task strikethrough is a device-local planner presentation preference shared across scheduled, all-day, and list task surfaces.
- Event types (appointment/family/reminder) reuse appointments.type; their colors are device-local (localStorage) like calendar kind colors.
- Today and Planner use page-scoped Soft Botanical mobile presentation tokens and Outfit/Figtree typography, preserving the app-wide theme.
- Planner range and layout selectors reuse the shared ViewPills control so Today and Planner remain visually consistent.
- Planner day context composes moon, solar season, cycle, and capacity inside one collapsible Day rhythm surface.
- Note page properties are stored per note in notes.properties (jsonb); shared supertag fields reuse item_field_values with entity_type 'note'.
- Note block IDs persist as trailing ` ^b-xxxxxx` markers in the markdown body (added only when first linked); block embeds/ref chips persist as data-* HTML so no schema change is needed.
- Notes uses a page-scoped presentation layer derived from the active atmosphere; capture review, pinned density, and per-month notebook appearance are device-local while note/task content preserves existing synced models.
- External note link cards persist as data-web-link-card HTML inside the existing markdown body so rich links round-trip without a schema change.
- Note table summary rows are recognised by a last row labelled Total/Average/Count and recalculated into plain cell text, so they round-trip in the markdown body without a schema change.
