# Mockups: "Held in your inbox", Today/Upcoming, and Repeating tasks

Preview only, sample items, at **/task-rail-mockups** (new tabs). Your real Inbox and Planner don't change until you pick a design.

## 1. "Held in your inbox" list — 3 designs
- **A · Quiet rows:** plain rows, check circle, wrapped title, soft phase icon, one Sort button.
- **B · Grouped by age:** "New today" / "This week" / "Older" with a gentle "been here a while" tint.
- **C · Compact chips:** denser two-line cards for scanning many items.

## 2. Today + Upcoming view — 3 designs
- **A · Stacked sections:** Today (by phase Plan/Grow/Care/Let go), then Upcoming grouped by day with the day's moon.
- **B · Two columns (desktop) / tabs (phone):** Today left, next 7 days right.
- **C · Timeline strip:** a horizontal 7-day strip on top; tapping a day shows its tasks below.

Each design: same task row look as the Planner, check-off works in the preview, overdue items shown as a soft banner.

## 3. Repeating tasks
Repeats already exist (daily/weekly/monthly with interval and weekdays). The mockup shows an improved experience:
- **Quick repeat chips** in the add box: Daily, Weekdays, Weekly, Monthly, Custom; and smart typing like "water plants every Tues".
- **Custom sheet:** every N days/weeks/months, pick weekdays, "on the 1st / last Friday", end date or after N times, and **repeat from completion** vs fixed schedule.
- **In lists:** a small repeat badge with "next: Thu"; checking off shows the next one appearing.
- **Options to compare:** skip this one, pause series, edit just this one vs all future.

## Controls
Style switcher per section, phone/desktop toggle, text size slider (reused from existing preview).

## Technical
- Edit `src/pages/TaskRailMockups.tsx` only (add three tabs); page-state sample data, `.planner-card`, rhythm tokens, `PhaseIcon`, `ScheduleDayMoon`.
- No data changes. When building for real, repeats reuse existing `recurrence_*` task fields; "repeat from completion", end date/count and per-occurrence skip would need new fields — I'll flag that before building.
- Check at 390px and 1280px.
