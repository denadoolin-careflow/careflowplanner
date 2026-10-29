import ReactMarkdown from "react-markdown";

export const CREATOR_GUIDE = `# CareFlow Corner, Club & Shop — setup guide

Everything here is edited from your **Creator studio** (Admin → Blog / Club & freebies / Shop). Nothing you do here uses Lovable credits.

## 1. Write and publish a blog post
1. Open **Blog** and tap **New post**.
2. Add a title, a short summary and a cover image.
3. Write the post. Use \`#\` for headings, \`**bold**\`, and \`-\` for lists. Tap **Preview** to check it.
4. Tap **Publish**. To schedule, pick a future publish date first — it appears on that date.
5. Fix typos any time: open the post on the site and tap **Edit** (only you see that button).

## 2. Join the CareFlow Club + freebies
1. Open **Club & freebies** → **Add**, name it, and upload your PDF or printable.
2. Switch on **Given on signup**. New members see a download button right after joining.
3. Members appear in the list below. Use **Export CSV** or **Copy emails** to send newsletters from a newsletter service (Flodesk, Kit, MailerLite). Newsletters to your whole list should go through one of those services, not the app, to protect delivery.
4. Optional: a welcome email to each new member can be added once you connect an email sending domain.

## 3. Sell digital products (like Etsy)
**Fastest way (today):**
1. List the product where you already sell (Etsy, Gumroad, Payhip) or create a **Stripe payment link**.
2. In **Shop** → **New product**, add name, description, price, images.
3. Paste that link in **Checkout link** and set Visibility to **For sale**. The Buy button opens it; that service delivers the file.

**Built-in checkout (later):** ask Lovable to "turn on built-in payments for the shop". You'll approve a one-time setup; then buyers pay on your site and get a secure download link for the private file you uploaded.

Until a product is ready, set it to **Coming soon** — visitors can tap **Notify me**, which adds them to the Club.

## 4. Landing page
- Turn the Corner, Club and Shop sections on/off and edit their headings in **Landing page editor** or on the page with **Edit page**.

## 5. Going live checklist
- [ ] At least one published post
- [ ] One freebie switched on
- [ ] Products set to For sale with a checkout link
- [ ] Publish the app so visitors see the latest version
`;

export function CreatorGuide() {
  return (
    <div className="prose prose-neutral max-w-none rounded-2xl border border-border bg-card p-5 text-foreground dark:prose-invert prose-headings:font-display">
      <ReactMarkdown>{CREATOR_GUIDE}</ReactMarkdown>
    </div>
  );
}
