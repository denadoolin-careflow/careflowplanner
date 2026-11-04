## Update the "4 · Rail + Today first" sidebar mockup

Changes to the Today panel in the sidebar preview page only (real sidebar unchanged).

1. **Remove** the "Plan · Care · Grow" tagline line.
2. **Top card** shows:
   - Weekday + date (serif heading)
   - Live time (updates every minute)
   - Weather: temperature + condition icon, reusing the app's existing weather source (sample fallback if no location)
   - Moon: existing day moon badge
   - Cycle: "Day X · phase" from the existing cycle tracker (hidden if no cycle is set up)
   - Keep the Today / Inbox / Add quick buttons
3. **New Notebook block** under the card, above Pinned:
   - Three rows: This month (e.g. November 2026), This week (Week 45), Today (Tue, Nov 3)
   - Each row has a small icon and a "Open" chevron; mockup rows only, no navigation
4. Pinned list stays below.

## Technical details
- Edit only `src/pages/SidebarMockups.tsx` (`RailToday`).
- Reuse `DayWeatherMoon`/`WeatherWidget` data hook, `ScheduleDayMoon`, and `cycle-store` hook; fall back to sample values so the mockup never breaks.
- Verify in browser at desktop and phone width.
