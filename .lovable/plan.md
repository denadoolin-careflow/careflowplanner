# Landing colors, seasonal phase atmospheres, CareFlow Corner blog, Club and shop

## 1. Landing page colors
- Save the landing page's color choice as the "CareFlow brand" preset and clear any custom color overrides.
- The Plan / Grow / Care / Let go panels keep their own phase colors no matter which preset is picked (phase colors are never overridden by the landing color editor).

## 2. Seasonal phase atmospheres
Four new atmospheres, one per season, each built from the four phase colors so Plan, Grow, Care and Let go always read clearly:
- Spring Bloom (Plan-led: fresh sage greens, blossom accents)
- Summer Sun (Grow-led: golden light, warm cream)
- Autumn Harvest (Care-led: terracotta, amber, olive)
- Winter Rest (Let go-led: soft coral, dusk, quiet neutrals)
Each gets light and dark versions and appears in that season's group in the atmosphere picker; seasonal auto-switching can pick them. Existing atmospheres stay unchanged.

## 3. CareFlow Corner (blog)
- New public section on the landing page, "CareFlow Corner", showing the latest published posts, plus a full `/corner` list and `/corner/:slug` post pages.
- Admin editor at `/admin/corner`: title, slug, cover image upload, excerpt, rich text body (reuses the notes editor), tags, draft / scheduled / published status, publish date, and "Preview".
- Live editing: when signed in as admin, a post page shows "Edit" to change text in place, like the landing overlay.
- Section on/off toggle and heading copy editable in the existing landing editor.

## 4. Join the CareFlow Club + freebies
- "Join the CareFlow Club" call to action on the landing page and every blog post (email + first name form).
- Admin can upload freebies (PDF printables, etc.) and attach one to the signup form; new members get an instant download page link and a welcome email.
- Admin "Club" screen lists members, lets you export them, and send an occasional freebie email to everyone.
- Emails need an email sending domain; if it isn't set up yet, signups still save and download links still show on screen.

## 5. Digital product shop (Etsy-style)
- "Shop" section and `/shop` page: product cards with images, price, description, and a product page.
- Admin `/admin/shop`: add/edit products, upload the digital file, set price, publish/hide, reorder.
- After purchase, buyers get a secure, time-limited download link (shown on screen and emailed).
- Checkout uses built-in payments; turning it on is a one-time setup step you approve. Until then, products show as "Coming soon" with a notify-me button that joins the Club.

## 6. Setup guide
A plain-language guide in the admin area (also saved to Files as a PDF): turning on payments, adding products, connecting your email domain, writing/scheduling posts, uploading freebies, and going live.

## Technical details
- Landing colors: data update on the landing_content row (preset "brand", custom {}); phase panels use rhythm tokens outside the landing color scope.
- Atmospheres: add 4 entries to ATMOSPHERES and SEASONS in atmospheres.ts plus matching CSS blocks.
- New tables (admin-write via has_role, public-read where published): blog_posts, club_members (insert-only for anon, admin read), freebies, products, orders. GRANTs + RLS in the same migration.
- Storage buckets: public `corner-media`, private `freebies` and `products` (signed URLs via a server function after signup/purchase verification).
- Server functions: club signup (save + email), purchase checkout + webhook to record orders and issue download links.
- Payments: enable built-in Stripe payments when you're ready; everything else works before that.
- All editing happens in the app's admin screens, so no credits are needed to write, publish or sell.
