## Make Inbox use the standard header (persistent hamburger)

Inbox currently strips the global header chrome (`onInbox` hides `MobileSidebarTrigger`, `UniversalSearchBar`, and `ThemeToggle`), so there's no way to reopen the sidebar from `/inbox` on mobile.

### Change — `src/components/layout/AppLayout.tsx`

Remove the Inbox special-case so the header renders identically on every route:

- Delete `const onInbox = pathname === "/inbox";`
- Drop the three `!onInbox && …` guards around `<MobileSidebarTrigger />`, `<UniversalSearchBar />`, and `<ThemeToggle />`.

Result: hamburger menu, search, and theme toggle are persistent on Inbox just like everywhere else.

### Out of scope
- No changes to `Inbox.tsx` itself, `Sidebar.tsx`, routing, or bottom-nav. If Inbox renders its own internal header that now duplicates anything, that's a follow-up the user can flag — current Inbox page does not render a second hamburger.
