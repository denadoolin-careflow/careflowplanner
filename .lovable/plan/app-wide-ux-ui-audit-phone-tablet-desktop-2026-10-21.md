# App-wide UX/UI audit: phone, tablet, desktop

This is an audit first and fixes second. Nothing about your data or features changes. Once the audit is done, I'll come back with a ranked list of findings and screenshots, and you choose which ones to fix.

## 1. Audit (read-only)
I'll check every main page at three sizes: phone (384×708), tablet (820×712, the size you're using now) and desktop (1280×1800). I'll be signed in with your account so I see real content.

Pages: Today, Planner (day/week/month/year), Inbox, Notes and notebook, Note detail, Projects, Care Hub and Bedside, Meals and Groceries, Laundry, Wealth, Seasons, all Cosmic pages, Settings.

On each page I'll check for:
- Content that spills sideways or is cut off
- Things you tap that are smaller than 44px, or sit too close together
- Items that overlap: the floating buttons, the bottom bar, the top strip and pop-up sheets
- Headers and page tabs that repeat each other (the calm strip, page tabs, page titles)
- Text that is hard to read, including gold or light phase colors used as small text
- Spacing, card style and heading sizes that differ from page to page
- In-between widths (640–1023px), where the phone layout ends and the desktop one begins. Tablets often get the worst of both here.
- Pages that are slow to load or jump around while loading

## 2. Report
- A short list, ranked by impact: Critical, then Important, then Polish. Each item names the page and the screen size.
- A screenshot for each issue

## 3. Likely fixes (to confirm after the audit)
- One breakpoint rule for tablets, so a 768–1023px screen doesn't get a squeezed desktop layout
- Floating buttons and the dock moved so they never cover the last item on a list
- A single header on every page: the calm strip and the page title, with no doubled tabs
- One style for cards, spacing and section headings across Home, Planner, Notes, Care and Cosmic
- Wide tables become stacked cards on phones
- Room left for the iPhone home bar and notch on fixed bars

## Technical details
- A Playwright script under /tmp/browser/audit loops over the pages and sizes. It records scrollWidth overflow, tap targets under 44px, elements that overlap fixed bars, and console errors.
- Fixes use only presentation classes and tokens. There are no data or schema changes, and the brand stays the same.
