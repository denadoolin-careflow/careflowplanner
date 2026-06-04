# Refocus navigation around 7 Flow pillars

Reorganize the **sidebar groups** and the **bottom-nav "More" sheet** into the 7 pillars you named. No routes, pages, or features change — only how existing destinations are grouped and labeled in navigation.

## 1. Group headers

Each group shows the Flow name large with the descriptor as a subtitle:

```text
📅 PlanFlow
   Planning & Productivity
```

Emoji renders inline with the label; descriptor renders below in muted text.

## 2. Page → pillar mapping (proposed)

**📅 PlanFlow — Planning & Productivity**
Inbox, Today, Daily Plan (/plan), Week, Month, Year, Calendar, Upcoming, Anytime, Someday, Not Today, Logbook, Projects, Focus, Automations, Reviews Timeline

**💚 CareFlow — Family & Caregiving**
CARE Loop, Caregiving, Family & sharing, Mental Load

**🏠 HomeFlow — Home Management**
Home, Home Hub, Meals, Meals Library, Inventory (Pantry), Routines, Trips

**🌿 WellFlow — Wellness & Self-Care**
Health, Habits, Journal, Journal & Flow

**📚 GrowthFlow — Learning & Goals**
Goals, Ideas, Notes, Whiteboards, Knowledge Graph, Tags

**💰 MoneyFlow — Budgeting & Financial Wellness**
Wealth

**🌙 LunarFlow — Reflection & Intentional Living**
Rhythm, Insights, Weekly Reset, Monthly Reset, Memories

**Top-level (outside pillars)**
Dashboard, Settings — stay pinned at the top/bottom of the sidebar as they are today.

Tell me if any page should move before I build.

## 3. Files changed

- **`src/lib/nav.ts`** — rewrite `NAV_GROUPS` to the 7 pillars above. Each group gains `subtitle` and `emoji` fields. `NAV` and `MOBILE_NAV` are untouched (routes unchanged).
- **`src/components/layout/Sidebar.tsx`** — group header renders `{emoji} {label}` on row 1 and `{subtitle}` muted on row 2. Existing collapse/reorder/active behavior preserved.
- **`src/components/layout/BottomNav.tsx`** — the "More" sheet currently renders `NAV` as a flat 3-column grid. Replace with sections iterating `NAV_GROUPS`: each section shows the pillar header (emoji + name + subtitle) then a 3-col grid of its items. Theme/low-energy toggles and "Customize bottom nav" button stay.

## 4. Out of scope

- No new routes, no pillar landing/hub pages.
- No URL renames.
- Quick Add, command palette, panel picker, dashboard tiles unchanged.
- MoneyFlow currently has only one page (Wealth); it will appear as a single-item group. Fine for now.
