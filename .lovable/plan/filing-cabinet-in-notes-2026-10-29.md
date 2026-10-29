# Filing Cabinet in Notes

A private home for important documents and PDFs, inside Notes as a new "Filing Cabinet" tab (beside Timeline, Files, Voice memos).

## What you'll get
- **Drawers**: starter drawers (Medical, Home, Finance, Legal & ID, Kids, Pets, Insurance, Warranties) — rename, recolor, add or remove your own.
- **Upload**: PDFs, images and Office files by drag-and-drop or file picker; view PDFs/images right in the app, download, rename, move between drawers, delete.
- **Phone camera scan**: "Scan" button opens the camera; snap one or more pages, crop/straighten lightly, saved together as one PDF.
- **Tags**: uses your existing CareFlow tags, with filter by tag.
- **Link to items**: attach a document to projects, goals, appointments, notes or loved ones; shows in their Connections too.
- **Expiry reminders**: optional expiry/renewal date (passport, insurance, warranty). "Expiring soon" list at the top of the cabinet, and a reminder appears on Today 30 days and 7 days before.
- **AI summary & search**: "Summarize" reads the document and fills in a short summary plus key details (provider, policy/account number, dates, amounts) and suggests a drawer, tags and expiry date for you to accept. Search covers titles, tags, summaries and extracted text.
- Works on phone, tablet and desktop; matches your Notes atmosphere.

## Privacy
Files are stored privately to your account only (no public links); viewing uses short-lived secure links.

## Technical details
- New tables `cabinet_drawers` and `cabinet_documents` (title, drawer_id, storage_path, mime, size, tags[], expires_at, remind_days[], summary, key_details jsonb, extracted_text, search tsvector), owner-scoped RLS + grants. Links reuse `entity_links` (entity_type 'document').
- Private `filing-cabinet` storage bucket, user-folder RLS on storage.objects; file size limit raised if needed (e.g. 50MB).
- Edge function `cabinet-analyze`: downloads the file server-side, sends PDF/image to the default AI model via Responses with a strict JSON schema; returns summary, details, suggestions, text.
- Camera scan: `<input capture="environment">` multi-shot, combined to PDF client-side (pdf-lib).
- Today reminder card reads documents with expires_at within the remind windows.
- Route `/notes/cabinet` added to NAV_SUBPAGES; record decision in AGENTS.md.
