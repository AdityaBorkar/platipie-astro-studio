# Design system

GitBook-inspired, built on shadcn tokens. The live reference is the `/design`
route — a single-page design-system overview with the token table, brand and
style rules, design-language layers, a live component gallery, motion demos,
viewport rails, and the app/docs/marketing patterns.

The goal is not to clone GitBook pixel-for-pixel. It is to carry the parts that
make the site feel calm and confident — warm paper, one orange, black actions,
pill geometry, hairline borders, spring motion — while every value stays inside
our shadcn variable layer.

## Principles

1. **Black is the action.** Primary buttons are ink (`--primary`), not orange.
   Orange (`--brand`) is reserved for emphasis, drift, eyebrows, and agent
   affordances — exactly the split GitBook uses.
2. **Warm neutrals.** Paper is white; secondary surfaces are stone-50/stone-200
   (`#fafaf9`, `#efeeed`); text is warm stone (`#1c1917` / `#79716b`).
3. **Hairlines, not heavy borders.** Surfaces use `1px` borders and soft,
   layered shadows. Cards lift 4px on hover, never bounce.
4. **Pills for actions, rounded rectangles for content.** Buttons, badges, and
   segmented controls are pills. Cards are 16px, illustration panels 24px.
5. **Motion resolves content.** Every entrance is transform + opacity, one-shot,
   under 750ms. Everything is disabled under `prefers-reduced-motion`.

## Tokens

All tokens live in `src/styles.css`.

| Role                   | Light     | Dark       |
| ---------------------- | --------- | ---------- |
| `--background`         | `#ffffff` | `#0c0a09`  |
| `--foreground`         | `#1c1917` | `#fafaf9`  |
| `--primary`            | `#1c1917` | `#fafaf9`  |
| `--primary-foreground` | `#fafaf9` | `#1c1917`  |
| `--brand`              | `#fe551b` | `#ff6a35`  |
| `--brand-soft`         | orange 8% | orange 12% |
| `--secondary`          | `#efeeed` | `#221e1c`  |
| `--muted`              | `#fafaf9` | `#171412`  |
| `--muted-foreground`   | `#79716b` | `#a8a29e`  |
| `--border`             | `#efeeed` | `#282422`  |
| `--input`              | `#e7e5e4` | `#322d2a`  |
| `--ring`               | `#fe551b` | `#ff6a35`  |
| `--brand-mint`         | `#a4f4cf` | `#7ce3b6`  |
| `--brand-cream`        | `#fff4ee` | `#2a1810`  |
| `--warning`            | `#b45309` | `#fbbf24`  |
| `--success`            | `#047857` | `#7ce3b6`  |

Extra tokens:

- `--on-brand: #ffffff` — fixed white for text on the orange enterprise plate
  (does not flip in dark mode).
- `--shadow-soft`, `--shadow-lift`, `--shadow-nav` — exposed as `shadow-soft`,
  `shadow-lift`, `shadow-nav`.
- `--ease-spring` (`cubic-bezier(.22,1,.36,1)`) and
  `--ease-out-quint` (`cubic-bezier(.16,1,.3,1)`).

### Typography

- **General Sans** (vendored in `public/fonts/general-sans/`, weights 400–700).
- **Geist Mono Variable** via `@fontsource-variable/geist-mono`.
- Display sizes (exact, from `@theme`):
  - `text-display` — 45px / 1.0 / `-0.02em`
  - `text-display-sm` — 38px / 1.2 / `-0.02em`
  - `text-heading` — 32px / 1.2
  - `text-title` — 20px / 1.3
  - `text-15` — 15px
  - `text-13` — 13px
  - `text-11` / `text-10` / `text-9` — micro labels, mono badges, eyebrows.
- Eyebrows: 11px, 700, `tracking-14`, uppercase, brand orange.
- Body copy: 16px, 1.6, muted stone.

### Radius, spacing, elevation

- `--radius: 0.75rem`, `rounded-md` 8, `rounded-lg` 12, `rounded-xl` 16,
  `rounded-2xl` 24. Pills use `rounded-full`.
- Page width: `w-page` = min(100%, 75rem). Narrow prose: `w-page-narrow` 61rem.
- Docs rails: 232px tree / 1fr prose / 208px TOC.
- Section rhythm: 48–80px vertical padding; hero top `pt-hero` 8.5rem.
- Shadows are low-contrast and warm; the nav uses `shadow-nav` with blur.

## Components

All design-system components live in `src/components/gitbook/` and are exported
from `index.ts`.

| Component                                                             | Purpose                                                                                          |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `AppSidebar`                                                          | Fixed workspace rail: identity, nav map, primary navigation, mobile drawer                       |
| `Hero`, `HeroFrame`, `HeroPrimaryAction`, `HeroSecondaryAction`       | Centered hero, browser frame, pill actions                                                       |
| `ProductStage`, `ProductDemo`                                         | Orange halo + CSS-only docs workspace                                                            |
| `LogoCloud`, `LogoWordmark`                                           | Masked marquee and text wordmarks                                                                |
| `AgentRow`                                                            | Orange-glowed capsule of agent pills                                                             |
| `FeatureSplit`                                                        | Alternating two-column story rows                                                                |
| `FeatureGrid`, `SystemOrbit`                                          | Four-up bento with a dashed orbit diagram                                                        |
| `Testimonial`                                                         | Logo card + large quote + action                                                                 |
| `EnterpriseGrid`, `EnterpriseArt`                                     | Four features around an orange certification plate                                               |
| `Customers`                                                           | Scroll-snap carousel with dashes and arrow controls                                              |
| `FinalCta`                                                            | Watermark logo mark + centered CTA                                                               |
| `Footer`                                                              | Link matrix, orange enterprise card, case study, report                                          |
| `PageShell`, `PageHeader`, `SectionHeader`, `EmptyState`, `SyncBadge` | Shared app-page grid, header rhythm, section headings, neutral empty states, relative sync state |
| `DocsShell`, `DocsNav`, `DocsToc`                                     | Three-rail documentation layout                                                                  |
| `Hint`                                                                | Docs callouts: info (orange), success (mint), warning (amber), danger (red)                      |
| `LinkCards`                                                           | Two-up docs link table                                                                           |
| `ShowcaseTabs`                                                        | Pill switcher with crossfade panels                                                              |
| `Reveal`                                                              | IntersectionObserver fade-rise-deblur                                                            |
| `BrandMark`, `Wordmark`                                               | Layered-page mark and lockup                                                                     |

UI primitives in `src/components/ui/` were retuned:

- `button`: pill geometry, six variants (including `brand`), taller sizes.
- `badge`: 24px pill, `brand`, `success`, `secondary`, `outline`.
- `card`: 16px radius, hairline ring, 16px inner spacing.
- `input` / `textarea` / `select`: 36px/rounded 12px, warm border, orange focus ring.
- `empty`: neutral dashed panel with one line of guidance — never an alert tint.
- `table`: muted header rail, 36px head, roomy cells; header styling lives in the primitive.
- `tabs`: muted pill track, white active pill.
- `kbd`: mono, bordered chip.
- `alert`: soft callout surface.

## App shell

The CMS is a fixed left rail plus a scrolling content pane, not a top nav.

- **Workspace block** — project name (`package.json` in the project root) and current
  git branch, read from `GET /api/cms/workspace`. Clicking it opens the project
  selector dialog: `GET /api/cms/projects` lists Astro projects (siblings of the
  current root plus previously added roots) with per-project branch, favicon
  (data URL when found), and `~/`-rooted path, plus a list / card view toggle.
  Non-Astro directories are omitted. **Add project** switches the dialog to a
  folder-picker (`GET /api/cms/projects/browse`) with places, breadcrumbs and an
  Astro badge per folder; its primary action stays disabled until the selected
  folder contains `astro.config.*`. Selecting or adding one `POST`s to
  `/api/cms/projects` to repoint the project jail, remembers the root in
  `.data/projects.json`, and reloads.
- **Primary nav** — the same top-level items, with expandable children. Pages
  lists Astro routes with a kind icon (static, dynamic, utility), including
  `404`/`500` and endpoint routes; Content lists CMS collections with counts.
  Emails links to the synced email inventory when `src/emails` has templates.
  Each expandable group keeps its open/closed state for the session.
- **Rails** — a 264px (`w-sidebar`) fixed rail on `lg`; below that a 48px top bar
  and a slide-in drawer. Content is offset with `lg:pl-sidebar`.
- **Theme** — the switcher lives in Settings → Appearance. The pre-paint script
  still applies the stored mode, so the rail and content paint together.
- **Sync footer** — the rail's bottom bar shows read-model freshness (status dot,
  label, relative age). Hovering or clicking it reveals the exact last-sync
  timestamp and a `Sync now` action.

## The `/design` reference

The `/design` route is a single-page design-system reference with a sticky
section nav. Sections match the sidebar's Design group:

1. **Overview** — principles, counts, source files, and a section map.
2. **Tokens** — semantic color roles grouped by surface, action, brand, chrome,
   and charts; the exact type scale; radius, elevation, spacing, layout rails,
   and the `:root` / `@theme inline` source.
3. **Brand guidelines** — mark, lockup, voice, brand surfaces, and logo rules.
4. **Style guide** — action hierarchy, surface hierarchy, do/don't, and copy.
5. **Design languages** — token → theme → utility → surface, naming rules, and
   the complete named-utility inventory.
6. **Components** — live primitives, the 25-file primitive index, 22 GitBook
   surfaces, and a `ShowcaseTabs` demo.
7. **Motion** — live reveal, disclosure, marquee, dash, glow, and hover demos;
   easing and duration tokens; the keyframe inventory; reduced-motion behavior.
8. **Viewports** — breakpoints, fixed rails, and every named column recipe.
9. **Patterns** — the three-rail docs shell, app-page anatomy, the app shell,
   and the marketing composition order.

App pages reuse the same language, denser:

- Dashboard: workspace identity, sync state, page/content/asset/component counts,
  recent edits, and the project root. The active project's branch and drift state
  are always visible.
- Pages: Astro page inventory plus a sticky SEO / page metadata / schema rail.
- Content: collection cards with a browse dialog, recent edits, SEO + schema rail,
  and the CMS tree in the left rail.
- Assets: image grid with upload, copy-path, and a media proxy.
- Components: surface gallery, template cards, and the primitive index.
- Settings: sticky section rail + Cards, Appearance (theme switcher), typed form,
  danger-zone actions.
- Editor: page header, action toolbar, three-column frontmatter/source/SEO,
  Monaco themed to the resolved light/dark mode. SEO + schema cards always render.

## Motion

- **Reveal** — `Reveal` + `.gb-reveal`; 750ms opacity/translate/blur, 70ms
  stagger. One-shot.
- **Tab crossfade** — `.animate-gb-tab-in`, 420ms.
- **Sidebar disclosure** — `.gb-accordion`, 500ms grid-track + deblur, 26ms
  per-child stagger; the row lifts to `sidebar-accent` on hover and
  `focus-within`, and the chevron leans right before it opens.
- **Popover** — `.animate-gb-pop`, 220ms.
- **Marquee** — `.animate-gb-marquee`, 38s linear, pauses on hover.
- **Marching connectors** — `.dash-march`, 1.6s linear stroke offset.
- **Float / glow** — `.animate-gb-float` 6s, `.animate-gb-glow` 5s.
- **Hover** — cards lift 4px over 420ms; arrows translate 2px; buttons press
  down 1px on `:active`.
- All of the above are disabled in the `prefers-reduced-motion` block at the
  bottom of the motion section.

## Rules of thumb

- New color? Add a semantic token in `:root` + `.dark` + `@theme inline`; never
  hard-code a hex in a component.
- New arbitrary Tailwind value? Add a named `@utility` in `src/styles.css`
  (`shadow-soft`, `transition-card`, `grid-cols-product`, `w-sidebar`, …) so
  `tailwindcss/no-arbitrary-value` stays green.
- Actions are black (`bg-primary`); brand emphasis is orange (`text-brand`,
  `bg-brand-soft`); success is mint; warnings use amber; errors use destructive.
- Use `Reveal` for marketing surfaces; do not wrap dense app forms in it.
- Use `Hint` for inline status, not `Alert`, unless the surface needs an alert
  role.
- Every new app page renders inside `PageShell` and opens with `PageHeader`; in-page
  sections use `SectionHeader` so eyebrow, title, and actions stay aligned.
- Empty results use `EmptyState` (neutral) or `Hint` only for instructions and
  status, never an alert tint for "nothing matched".
- Keep buttons pill-shaped and 36px form controls (`input`, `textarea`, `select`)
  on the same 12px radius.
- Keep the design page current: if a token or component changes, update
  `src/routes/design.tsx` in the same change.

## Reference

Inspected live at <https://www.gitbook.com/> in October 2026 with agent-browser,
including desktop, mobile, dark system preference, the nav dropdown, and the
Ask panel. The adaptations are structural and stylistic: type scale, spacing,
surface treatment, pill geometry, orange emphasis, illustration language, and
motion. No GitBook assets, logos, illustrations, or copy are copied; the
`BrandMark`, wordmarks, workspace preview, and illustrations are original.
General Sans is self-hosted from Fontshare; Geist Mono comes from Fontsource.
