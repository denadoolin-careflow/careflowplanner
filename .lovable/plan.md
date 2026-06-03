# Collapse AI Checklist Strip → Toggle Menu (per zone)

Currently each zone card shows an always-visible row with three buttons (Low energy / Weekly / Deep clean) that immediately generate. It's noisy and gives no room to add real options.

Replace it with a single compact toggle button per zone that opens a small menu where the user picks which checklist to generate.

## UI change

In `src/components/home-hub/ZonesTab.tsx`, replace the inline `AI checklist:` row + three Buttons with a single trigger:

```
[ ✨ AI checklist ▾ ]
```

Tapping it opens a `Popover` anchored to the trigger with a tidy list of options. Each option has an icon, title, and one-line description so the user knows what they're getting:

- **Quick reset** (5–10 min, surface tidy) — `Sparkles`
- **Low-energy mode** (gentle, sit-down friendly) — `Moon`
- **Weekly reset** (standard rhythm) — `ListChecks`
- **Deep clean** (thorough, monthly) — `Wand2`
- **Custom…** — opens a small inline text field inside the popover (`"e.g. before guests arrive"`) and sends that as the energy/mode prompt

While generating, the trigger swaps to a spinner + "Generating…" and is disabled. The popover closes on selection.

## Wiring

- Extend `generateChecklist(zone, mode)` to accept the four built-in modes plus an arbitrary `custom` string. Pass `mode` through as `energy` (current backend field) for the existing modes; for custom, pass the text as `energy` so the existing edge function can interpret it as a hint. Keep the existing insert/sync code path unchanged.
- The trigger and popover live inside each zone card, replacing lines ~192–207. Keep the card's gradient, icon, progress bar, and "open zone" button exactly as today.

## Files

- **Edit** `src/components/home-hub/ZonesTab.tsx` — replace the inline strip with a `Popover` trigger + option list; widen the mode union and pass it through.

No new components, no backend changes, no new dependencies (Popover already in `src/components/ui/popover.tsx`).
