# Automations Engine + Grocery → Pantry rule

A reusable "When X → Do Y" system, plus the first rule wired up: checking off a grocery item marks it in‑stock, tags it, and moves it to a Pantry section.

## 1. Data model

New tables:

- `automations` — user-owned rules
  - `name`, `enabled`, `trigger_type`, `trigger_config jsonb`, `action_type`, `action_config jsonb`, `sort_order`, `last_run_at`
- `automation_runs` — lightweight audit (last 50 per rule), `automation_id`, `triggered_by`, `payload jsonb`, `status`, `error`

Grocery additions:
- `grocery_items.tags text[] default '{}'` — to store the "in stock" tag (and any future tags)
- Reuse existing `stock_status` ('in' | 'low' | 'out') and `bought` boolean

Standard RLS (`auth.uid() = user_id`) + GRANTs for `authenticated` / `service_role`.

## 2. Automations runtime

`src/lib/automations/` 

- `types.ts` — `TriggerType`, `ActionType` enums + config shapes
- `registry.ts` — declarative catalog of available triggers/actions with labels, icons, and config schemas (so the UI is data-driven)
- `engine.ts` — `runAutomations(trigger, context)` loads enabled rules for the current user matching `trigger_type`, checks `trigger_config` filters, executes each action, logs to `automation_runs`
- `actions/` — one file per action handler (`setStockStatus`, `addTag`, `moveToPantry`, etc.)

First trigger registered: `grocery.item.completed` (fires when `bought` flips false→true).
First actions registered: `grocery.setStockStatus`, `grocery.addTag`, `grocery.moveToPantry` (composite that does all three).

Hook point: `src/lib/store.tsx` `toggleGrocery` — after the supabase update succeeds and `bought` became true, call `runAutomations("grocery.item.completed", { item })`.

## 3. UI

New route `/automations` + sidebar entry under settings:

- List of rules with toggle, edit, delete, reorder
- "New automation" dialog: pick trigger → pick action(s) → name → save
- Trigger/action pickers render from the registry, so adding new ones later requires no UI changes
- Empty state seeds the "Grocery checkoff → In stock" rule with one click

## 4. Grocery UX changes

`GroceryKanban.tsx`:
- New "Pantry" section at the bottom showing items where `stock_status='in'`, collapsed by default, with item count
- Items with `bought=true` AND `stock_status='in'` are removed from their normal category column and shown only in Pantry
- Pantry item row: shows the "In stock" tag chip, has "Move back to list" action (clears bought, sets stock_status='out', removes tag)

`GroceryList.tsx`: same Pantry group at the bottom in list mode.

Tag chip styling uses existing semantic tokens (`bg-primary-soft text-primary`).

## 5. Seeding the default rule

On first visit to `/automations` (or first grocery checkoff after this ships) with zero rules, auto-insert the Grocery → Pantry automation enabled by default, so the behavior the user asked for works immediately without configuration.

## Technical details

- Engine runs client-side inside the existing store — no edge function needed for this trigger since the mutation originates in the browser. Future server-side triggers (cron, webhooks) can plug into the same registry via an edge function later.
- `automation_runs` writes are fire-and-forget; failures don't block the user action.
- Trigger config for grocery rule is empty (fires for all items); leaves room for filters like "only in category Produce" later.
- Action config for `moveToPantry` stores `{ tag: "in stock", stockStatus: "in" }` so the same action can be reused with different tag names by other rules.

## Files touched

New:
- `supabase/migrations/<timestamp>_automations.sql`
- `src/lib/automations/{types,registry,engine}.ts`
- `src/lib/automations/actions/{setStockStatus,addTag,moveToPantry}.ts`
- `src/pages/Automations.tsx`
- `src/components/automations/{AutomationCard,AutomationDialog,TriggerPicker,ActionPicker}.tsx`

Edited:
- `src/lib/store.tsx` — fire trigger from `toggleGrocery`, expose `tags` on grocery items
- `src/components/meals/GroceryKanban.tsx` + `GroceryList.tsx` — Pantry section, tag chip, move-back action
- `src/App.tsx` — route
- `src/components/layout/Sidebar.tsx` — nav link