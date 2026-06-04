## Goal

Adopt the uploaded sage-green app icon as the brand mark across the public-facing surfaces, and refresh the tagline lockup on Auth.

## Steps

1. **Upload the new app icon as a Lovable asset**
   - Take `user-uploads://Screenshot_20260604_094314_ChatGPT.jpg`, crop to just the rounded square icon (remove the phone status bar + white margins), save to `/tmp/careflow-app-icon.png`.
   - Run `lovable-assets create --file /tmp/careflow-app-icon.png --filename careflow-app-icon.png > src/assets/careflow-app-icon.png.asset.json`.

2. **Create a reusable `CareFlowMark` component** (`src/components/widgets/CareFlowMark.tsx`)
   - Renders the app-icon image inside a rounded square (matching existing `rounded-xl`, ring, shadow conventions).
   - Props: `size` (number, default 28), `className`, `rounded` ("md" | "lg" | "xl").
   - Uses the new `.asset.json` URL. No tint / blend so the sage-on-cream artwork stays true to brand.
   - Image gets `alt=""` (decorative) when used next to wordmark, otherwise `alt="CareFlow"`.

3. **Auth page** (`src/pages/Auth.tsx`)
   - Replace the green `<span>` + `<Leaf>` lockup in the header link with `<CareFlowMark size={40} />`.
   - Update tagline span from `plan, care, grow` to `Plan · Care · Grow` (keep existing uppercase tracking class).
   - Remove `Leaf` from the `lucide-react` import.

4. **Waitlist page** (`src/pages/Waitlist.tsx`)
   - Same swap as Auth header (size 36).
   - Update tagline to `Plan · Care · Grow`.
   - Drop `Leaf` from imports.

5. **Landing page** (`src/pages/Landing.tsx`) — replace every `Leaf` usage:
   - **Header brand mark & footer brand mark**: use `<CareFlowMark />`.
   - **Inline contexts** (CTA buttons, "Capture" step icon, "Home Reset" feature card, "App features" pill, bullet rows, atmosphere preset "Sage Sanctuary"): these need a small monochrome glyph that inherits `currentColor`, so the app icon image would not work. Substitute with another Lucide icon that fits each spot:
     - `Capture` step → `Sparkles`
     - `Home Reset` feature → `Home`
     - `App features` pill → `Sparkles`
     - Bullet checkmarks (`l.map` row) → `Check`
     - "Start Your CareFlow" CTAs (3 occurrences) → use `<CareFlowMark size={18} rounded="md" />` so the brand mark appears inside the button
     - `Sage Sanctuary` atmosphere `icon` entry → `Sprout` (closest organic-but-not-leaf option)
   - Remove `Leaf` from the lucide import list.
   - Tagline lockup in header/footer: update text to `Plan · Care · Grow`.

6. **QA**
   - Visit `/`, `/auth`, `/waitlist` in the preview, screenshot header + a CTA, confirm the new app-icon mark renders crisp, the tagline reads `Plan · Care · Grow`, and no stray `<Leaf>` remains (`rg "Leaf" src/pages/Landing.tsx src/pages/Auth.tsx src/pages/Waitlist.tsx` returns nothing).

## Out of scope

- In-app (post-login) navigation, dashboards, and the existing `CareFlowLogo` component used inside the app stay unchanged.
- No color/palette or layout changes beyond the icon and tagline swap.
