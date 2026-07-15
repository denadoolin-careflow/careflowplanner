## CareFlow Brand Redesign — Implementation Plan

Rebrand the entire app around the new CareFlow Planner logo (seasonal gradient drop + heart + checkmark on warm cream). The work is scoped as a **design-system refresh** — no business logic changes. Everything flows from tokens in `src/index.css` and `tailwind.config.ts`, so most screens update automatically.

### 1. Foundation — tokens & typography
**`src/index.css`** (single source of truth)
- Rewrite `:root` and `.dark` HSL tokens:
  - `--background: 36 100% 97%` (warm cream `#FFF9F2`)
  - `--card: 40 45% 96%` (soft ivory)
  - `--muted: 90 20% 94%` (very light sage)
  - `--foreground: 150 25% 18%` (warm charcoal-green)
  - `--primary: 155 45% 32%` (forest green from wordmark)
  - `--accent: 30 90% 60%` (autumn orange)
- Add seasonal accent tokens: `--season-spring`, `--season-summer`, `--season-autumn`, `--season-winter`, `--season-forest`.
- Add `--gradient-seasonal: linear-gradient(135deg, #E85D2C, #F4A72B, #6FBE44, #2FB3A5, #3B7DD8, #4A4FC4, #7B4FB8)` and semantic aliases (`--gradient-primary`, `--gradient-hero`, `--gradient-active-nav`).
- Bump `--radius` to `1.5rem` (24px); add `--radius-lg: 2rem` (32px) for hero cards.
- Soften shadows: `--shadow-soft`, `--shadow-cozy`, `--shadow-float` (multi-layer, low-opacity).
- Dark mode: deep forest/plum base with the same seasonal gradient reserved for accents only.

**`tailwind.config.ts`**
- Set default `sans` to Nunito Sans; keep `display` as Fraunces for editorial headings; add `brand: ['"Nunito Sans"', ...]`.
- Register `season.*` colors and `bg-gradient-seasonal` utility via `backgroundImage`.

**`index.html`**
- Swap Google Fonts link to Nunito Sans (400/500/600/700/800) + keep Fraunces.
- Update `<title>` and meta description to "CareFlow Planner — Plan · Care · Grow".

### 2. Logo & brand mark
- `src/components/widgets/CareFlowMark.tsx` — keep image-based mark, but add a new `variant="wordmark"` that renders the full lockup (mark + "CareFlow" + "— PLANNER —" + "Plan · Care · Grow") for splash/onboarding/login.
- `src/components/widgets/CareFlowLogo.tsx` — update wordmark to Nunito Sans 800, tighter tracking, forest-green fill with optional seasonal-gradient text clip for hero placements.
- Replace favicon/app icon references in `index.html` with the new `/icons/icon-512.png` (already in place) and ensure og:image points to the branded mark.

### 3. Buttons, cards, navigation
- **`src/components/ui/button.tsx`** — add `variant="seasonal"` (gradient fill, white text, soft shadow), refine `default` to solid forest green, `secondary` to cream with sage border, `ghost` to transparent with forest text. Increase default radius to `rounded-2xl`.
- **`src/components/ui/card.tsx`** — cream/ivory background, `rounded-3xl`, `shadow-soft`, subtle 1px sage border.
- **`src/components/layout/Sidebar.tsx`** and mobile bottom nav — floating pill container with backdrop blur, active item uses seasonal gradient fill + white icon, inactive uses muted forest.
- Update `.reset-glass` and `planner-surface` utilities in `index.css` to sit on the new cream base.

### 4. Icon language
Rather than hand-authoring 40+ SVGs, standardize on **lucide-react** (already used everywhere) with a consistent wrapper:
- New `src/components/ui/BrandIcon.tsx` — wraps any lucide icon with rounded stroke (`strokeLinecap="round"`, `strokeLinejoin="round"`, `strokeWidth={1.75}`) and optional `tone` prop (`forest | seasonal | sage | autumn`) that applies gradient stroke via `<defs>` when `tone="seasonal"`.
- Update `src/lib/area-icons.ts`, `category-icons.ts`, `task-icons.ts`, `project-icon.tsx`, `nav.ts` icon assignments to the mapping in the brief (Planner→Calendar, Care→Heart, Wellness→Droplet, Money→Leaf, Insights→TrendingUp, Journal→Notebook, Meals→Salad, Pantry→Package, Family→Users, Astrology→Moon, Notes→FileText, Inventory→Basket, Medication→Pill, Emergency→Shield, Habits→Sprout, AI→Sparkles).
- No component-by-component icon swap needed beyond these registries — screens read from them.

### 5. Motion
- `tailwind.config.ts` — soften existing keyframes: extend `fade-in` and `scale-in` durations to 500–600ms with `cubic-bezier(0.22, 1, 0.36, 1)` (natural spring-out).
- Add `float`, `leaf-drift`, `liquid-in` keyframes for hero cards, empty states, and page transitions.
- Audit removes any `animate-bounce`/fast pulses on primary surfaces.

### 6. Screen-level touch-ups
Most screens inherit from tokens, but these get an explicit brand pass:
- **Splash / Loading** (`src/pages/FlowLanding.tsx`, loading fallbacks) — full-bleed cream with centered wordmark lockup and gentle gradient shimmer.
- **Onboarding** (`src/pages/Onboarding.tsx`) — cream background, seasonal-gradient progress, larger radius cards.
- **Auth** (`src/pages/Auth.tsx`) — logo lockup, cream card, seasonal primary button.
- **Dashboard / Today** (`src/pages/Today.tsx`, `HomeReset.tsx`) — cream base, ivory modular cards for Today's Plan, Care, Family, Meals, Weather, Moon, Cycle, Habits, Hydration, Notes, Events, Budget, Insights (widgets already exist; just re-skin).
- **Empty states** (`src/components/empty/*` if present, else inline) — soft botanical accent using a `Leaf`/`Sprout` BrandIcon at 30% opacity.
- **Settings** (`src/pages/*Settings*`) — swap section icons to the new BrandIcon family.

### 7. Verification
- Run `tsgo` on changed files.
- Screenshot `/`, `/today`, `/planner`, `/auth`, `/onboarding` in light and dark via Playwright and confirm the cream/forest/seasonal palette lands consistently.

### Out of scope (explicit)
- No changes to data models, hooks, edge functions, or Supabase.
- No custom-drawn SVG icon set — we standardize on lucide + BrandIcon wrapper.
- Marketing site (`Landing.tsx`) already uses sage/cream — will get tokens updated, not restructured.
- Email templates and PDF exports untouched unless you want them in a follow-up.

### Technical summary
Change surface: `src/index.css`, `tailwind.config.ts`, `index.html`, `src/components/ui/{button,card}.tsx`, `src/components/widgets/CareFlow{Logo,Mark}.tsx`, `src/components/layout/Sidebar.tsx`, `src/lib/{area-icons,category-icons,task-icons,nav}.ts`, `src/lib/project-icon.tsx`, new `src/components/ui/BrandIcon.tsx`, plus targeted polish on Splash/Onboarding/Auth/Dashboard/EmptyState files. Roughly 20–25 files.
