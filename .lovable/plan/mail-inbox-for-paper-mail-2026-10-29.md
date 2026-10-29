# Mail Inbox for paper mail

A "Mail" tab in Notes (next to Filing Cabinet) for incoming paper mail: snap it, sort it, deal with it later, then trash it or file it.

## What you'll get
- **Capture**: Scan with the phone camera (multi-page → one PDF) or upload a photo/PDF. Each piece lands in "New mail".
- **AI first look** (automatic on capture): reads the mail and suggests a title, type (Bill, Coupon, Statement, Letter, Medical, Legal, Ad/Junk, Other), sender, due/expiry date and amount. You tap to accept.
- **Sort**: tabs for New, To review, Done, Trash; filter by type, person, tag. Swipe-friendly cards on phone.
- **Review later → task**: pick a date ("Review on…" or "Pay by…") and it creates a real task in your Planner/Today, linked back to the mail. Finishing the task marks the mail Done.
- **Tag it**: link a person (loved ones/household), project, goal, or budget category, plus free tags.
- **Throw away**: "Trash" moves it to Trash for 30 days (restore anytime), then it's permanently deleted. Coupons/bills can auto-suggest trash after their date passes.
- **Keep it**: "Move to Filing Cabinet" sends it into a drawer (AI suggests which) with its summary, tags and links kept.

## Technical details
- Reuse `cabinet_documents` (same private bucket, AI function, links) with new nullable/defaulted columns: `kind` ('mail' | 'document', default 'document'), `mail_status` ('new'|'review'|'done'|'trash'), `mail_type`, `sender`, `amount`, `due_on`, `review_task_id`, `trashed_at`. Filing = set kind 'document' + drawer. Cabinet page filters to kind 'document'.
- Links via `entity_links` (source_type 'document'), adding target types person (loved_ones), budget (budget_categories).
- Review task inserted into `tasks` with due date; Mail tab reads task done-state to mark mail Done.
- `cabinet-analyze` gains mail fields (type, sender, amount, due date) in its schema.
- Trash purge: scheduled cleanup removes files + rows where trashed_at older than 30 days.
- Route `/notes/mail` in NAV_SUBPAGES; Today shows "Mail to review today" when review tasks are due (reuses task list).
- Tests for trash-expiry and review-task rules.
