# Sidebar mockups

A temporary preview page (like the earlier Inbox and task panel previews) with three tabs, each showing a complete sidebar design next to a sample page. It uses sample content only, so nothing in your real app changes until you pick one.

## The three designs

1. **Calm list**: one simple column with icon and name for each page, grouped under quiet headings (Plan, Notes, Care, Home, Cosmic). Subpages open below the current page only. Your profile and Settings sit at the bottom.
2. **Icon rail + flyout**: a slim strip of icons that's always visible. Tap or hover an icon to open a panel with that group's pages and subpages, including the notebook date tree under Notes. This leaves the most room for the page itself.
3. **Today-first dashboard**: a top card showing today's date, moon phase and rhythm phase, with "Today", "Inbox (count)" and "Quick add" buttons. Below that are pinned pages and Spaces you can reorder, then the full page list folded into groups.

## Shared details
- CareFlow brand colors and fonts, soft-tint phase icons, 44px tap targets, and a highlight on the page you're on.
- A light/dark switch and a phone/desktop switch, so you can see how each design looks as a slide-out drawer on phones.
- Small options inside each tab, like text size and showing or hiding counts.

## Technical details
- Public route `/sidebar-mockups` in `src/pages/SidebarMockups.tsx`. The page lists reuse the real NAV_GROUPS/NAV_SUBPAGES labels and icons, and every count is sample data.
- After you pick a design, it gets built into the real sidebar and the preview page is removed.
