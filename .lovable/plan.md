# Smart article clipping for the Library

Built in three steps, in this order.

## Step 1 — Fetch details from a link
- In the Add/Edit article dialog, a **Fetch details** button sits next to the link box (also runs automatically when a link is pasted).
- It fills in: title, author/publication, the article's own cover picture (if it has one), reading time, and a short summary plus 3–5 key takeaways.
- Everything stays editable before you tap Save. If the page can't be read, you see a friendly message and can type details yourself.
- The saved article card shows the summary and takeaways when opened.

## Step 2 — AI cover when there's no picture
- If the article has no cover picture (or you don't like it), a **Generate cover** button makes a soft, painterly cover in the CareFlow style based on the title and summary.
- The picture is saved to your account so it shows on every device.

## Step 3 — Clip to Daily Note
- Each article gets a **Clip to Daily Note** button that adds a tidy link card (cover, title, source, summary, takeaways) to today's daily note, using the existing rich link card format.
- It also records a connection between the note and the article, so the article shows up in the note's connections and vice-versa.

## Technical details
- New backend function `library-fetch-article`: validates URL, fetches HTML server-side, extracts Open Graph/meta tags, strips text, then calls the AI gateway (default chat model, streamed, strict JSON schema) for summary/takeaways/reading time. Returns normalized metadata. No Firecrawl needed initially; can add later for JS-heavy sites.
- Extra fields (summary, takeaways, publication, reading time, ai_cover flag) stored in a `details jsonb` column added to `library_items` (migration if not present).
- New backend function `library-generate-cover`: image gateway default model, uploads result to a private-per-user storage folder, returns a signed/public URL saved to `cover_url`.
- Clip reuses the daily-note lookup/creation and the `data-web-link-card` HTML block; link recorded in `entity_links`.
- Error handling follows gateway rules (402/429 messages shown, no silent retries).
- Verify each step end-to-end with a real article link signed in.
