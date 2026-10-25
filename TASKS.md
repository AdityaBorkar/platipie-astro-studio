# platipie-cms — task breakdown (from SPEC.md)

Source: `SPEC.md` §§1–15. Each task maps to spec sections and acceptance bullets in §14.

## T1 — Scaffold / runtime config (§3, §4, §13)

- TanStack Start (latest) + Bun + Nitro `bun` preset, `bun run dev` / `bun run start`.
- Env: `ASTRO_ROOT` (jail all I/O), `ASTRO_URL` (faithful preview only), `AI_BASE_URL`/`AI_API_KEY`/`AI_MODEL` (BYOK, off by default), `PORT` (default 4000), `TRASH_TTL_DAYS=30`.
- Localhost bind, no auth (documented), upload caps, filename sanitization, 1 MB large-file guard, never log `AI_API_KEY`.

## T2 — Core FS lib (server-only, §11, §13)

- Frontmatter parse/stringify (preserve unknown keys/order where feasible), atomic tmp+rename writes, rotating `.bak` + trash copy, mtime/etag concurrency (409 + diff, force override), unified diff in response.

## T3 — Canonical field model + Zod (§6 + §5 table)

- WP-parity fields for `blog` (full) + `projects` (additive, required unchanged): slug, excerpt, status, publishDate, modifiedDate, author, categories, tags, featuredImage, canonicalUrl, metaTitle, metaDescription, keywords, ogImage, ogType, twitterCard, noindex, nofollow, schemaType+fields.
- Aliases: `date`↔`publishDate`, `hero_image`↔`featuredImage`, `filter_category`↔categories, `year`/`timeline` kept.
- Validation: slug regex, URL (absolute or site-relative), ISO dates, `scheduled`→future `publishDate` warning, `noindex`+sitemap conflict warning.

## T4 — Collections discovery + dashboard (§5, §8 `/`)

- Layers: projects (`cms/projects/*.md`, hide `-template*`), blog (`cms/blog/*.md`), clients/mockups/testimonials JSON, legal (`src/pages/legal/*.mdx`), settings (`cms/constants.ts`), schema per-post.
- Dashboard: 7 cards with counts/search/`New`/recent-edits + drift warnings (unregistered blog, testimonials `project` drift, missing blog routes, `-template.md.` oddity).

## T5 — Unified editor (`/edit/[...path]`, §7)

- Left form/sidebar, center Markdown⇄Visual + preview panes, right SEO (§9), one save pipeline (§11).
- Markdown mode: Monaco source + structured frontmatter form (all §6 + `hero_tag`/`filter_category`/`links`/`benefits`).
- Visual mode: TipTap/Milkdown local WYSIWYG, Astro-like typography; faithful read-only `<iframe src="${ASTRO_URL}/<preview-path>">` (`blog/<slug>`, `work/<slug>`, `legal`) with 404 fallback + unset hint.
- Frontmatter forms: text/textarea/select/tag/key-value/repeatable/image-picker/date/toggle; unknown keys round-trip + drift notice.
- MD/MDX policy (§7.4): allow MDX everywhere, opaque uneditable blocks, never normalize legal `import`/`{EXPR}`, warn + offer glob widening to `**/*.{md,mdx}` on `.mdx` create.

## T6 — REST API (§8, §12)

- `GET /collections`, `GET /entries?collection=`, `GET /entry?path=`, `PUT /entry`, `POST /entries`, `POST /duplicate`, `POST /rename`, `DELETE /entry`, `POST /restore`, `GET /diff?path=&rev=`, `GET /media`, `POST /media`, `GET /seo?path=`, `POST /seo/ai`, `GET /settings`, `PUT /settings`, `POST /collections/blog/register`.
- Transport: Start server functions backed by Nitro handlers; file I/O server-only. Error codes: `VALIDATION|NOT_FOUND|CONFLICT|SCHEMA_MERGE|IO|AI_DISABLED` + HTTP status.

## T7 — SEO assistant (§9)

- Heuristics: metaTitle>60, metaDescription∉[120,160], slug readability, canonical validity, og/featured resolvability, keywords≈tags, noindex vs sitemap, missing excerpt/featuredImage/schemaType, JSON-LD preview.
- Score 0–100 + Flesch + keyword coverage (never blocks save). BYOK `POST /seo/ai` proxy (explicit action, rate-limited, server-only key, AI-drafted label until edited).

## T8 — Media (§10)

- `GET /media` lists `assets/images/**` + `public/**` (images, thumbnails). `POST /media` multipart → `assets/images/<slug>-<date>-<name>` or `public/` (MIME/size/sanitize, site-relative return). Picker writes `hero_image`/`featuredImage`/`ogImage`/`logo`/`img`; missing refs flagged; `http(s)` allowed.

## T9 — Save pipeline + file ops (§11)

- Parse→validate (field errors inline; hard blocks, warnings pass)→backup→atomic→`modifiedDate` auto-touch→diff+validation in response.
- Filename-is-slug rename (collision block + links warning), create blank/template (`-template.md.` offered, never listed, rename hint), duplicate `-copy`, soft-delete → `.cms-trash/<ts>/<path>` (JSON row-level too), TTL restore/hard wipe, trash UI.

## T10 — Settings + schema-markup (§5)

- `cms/constants.ts`: typed form per key (`SITE_URL`, `SOCIALS`, `NAV_ITEMS`, `PRICING`, `HOMEPAGE`…) + raw TS fallback; codegen preserves comments/formatting where feasible; `tsc --noEmit`-style/`bun build` parse check before save; danger-zone confirms.
- Schema: `schemaType` dropdown (BlogPosting/Article/HowTo/WebPage/_/Software_/Review…) + field/JSON pane mapped to `cms/schema-markup/` builders; JSON-LD preview; never edits builder `.ts`.

## T11 — Legal MDX (§5)

- Raw MDX + preview; `import … from "#cms/constants"` + `{EXPR}` byte-for-byte when untouched.

## T12 — Blog registration (§5.1)

- Idempotent AST-preserving text merge (not rewrite) + backup; abort on merge fail. Adds `blog` (`title` + WP optionals, passthrough, `**/*.md`) + additive WP optionals to `projects`; offer glob widening; banner: no blog route renders `cms/blog/` (NAV `/writings,/craft` mismatch), route stays in Astro repo.

## T13 — Verify vs §14 acceptance

- Dashboard counts + template hidden/offer; Markdown⇄Visual no-diff + save touches `modifiedDate`; create `hello-world` draft + rename + SEO no-AI; BYOK excerpt vs disabled reason; testimonial edit + upload pick; `SITE_URL` + legal `{SOCIALS.email}` intact; trash/restore + 409; blog+projects merge idempotent + site typechecks.

## T14 — App shell & navigation (§8)

- Fixed left rail (`w-sidebar`, 264px) with project name + current branch from `GET /workspace`; click-to-open nav map; mobile drawer under a 48px top bar.
- Nav: Dashboard, Website, Design, Components, Assets, Content, Settings. Website/Content groups expose the four display toggles, persisted in `localStorage`.
- New routes: `/website` (page inventory + metadata/schema rail), `/content` (collections + SEO rail), `/components` (gallery/templates/UI index), `/assets` (media library + proxy).
- Theme switcher moves from the header to Settings → Appearance; `/design` gains brand, style, language, and viewport sections.
