# End-of-Life Support Guide and Document Vault

A gentle new section in CareHub, next to Bedside care, at `/care/end-of-life`. It has three tabs: Guide, Checklists and Documents.

## 1. Caregiver guide (Guide tab)
- Calm sections you can expand, written in a warm, non-clinical voice:
  - What to expect in the final weeks, days and hours (common signs, comfort focus)
  - Caring for yourself during hospice (rest, asking for help, respite)
  - Talking with family and children
  - The first hours after a death (who to call, no rush)
  - Grief guide: what grief can feel like, the first weeks and months, anniversaries, when to get more support, plus a link to Seasons → Remembrance
- Each section ends with a short "gentle next step". There is a clear note that this is general guidance, not medical or legal advice.

## 2. Planning checklists (Checklists tab)
- Starter checklists, each grouped by timing: **Before**, **The first 24–48 hours**, **The first weeks**, **The first months**.
  - Legal and paperwork (advance directive, POLST/DNR, power of attorney, will)
  - Funeral and memorial arrangements
  - Notifications (family, employer, Social Security, insurers)
  - Banking and finances
  - Home and property (utilities, mail, vehicles, pets)
  - Health and hospice wrap-up (equipment returns, medicine disposal)
  - Digital accounts
- You can check items off, add your own items, add notes, and choose which person from your caregiving profiles a checklist is for.
- Any item can be sent to the Planner as a task, using the existing Today/Tomorrow actions.
- A progress ring for each group uses your selected completion style.

## 3. Document vault (Documents tab)
- Upload files or photos (PDF, images, Word documents) into categories: End-of-life paperwork, Funeral arrangements, Death certificates, Banking, Home, Health, Insurance, Legal, Other.
- Each document can have a title, a person, a date, notes and where the original copy is kept (for example "fireproof box, hall closet").
- You can preview, download, rename, move to another category, or delete documents.
- Checklist items can link to a stored document (for example "Death certificate copies ×10" links to the uploaded scans).
- Files are private to your account and are never shared publicly.

## Technical details
- New tables: `eol_checklist_items` (user_id, recipient_id, group, phase, title, done, notes, document_id, sort) and `eol_documents` (user_id, recipient_id, category, title, file_path, mime, size, original_location, notes, doc_date). Both use GRANTs and RLS scoped to `auth.uid()`.
- A private storage bucket `eol-documents` with policies that limit each user to their own folder (`{uid}/...`). Previews use signed URLs.
- Default checklist content lives in the code (`src/lib/eol-checklists.ts`) and is copied into the database the first time each person's checklist is opened. Guide text is stored in code.
- New page `CareEndOfLife.tsx`, a CareHub tile, and an entry in `NAV_SUBPAGES` under Care.
- Tests cover how the default checklists are copied in and how their progress is counted.
