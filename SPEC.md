# platipie-cms — SPEC.md

## 1. Purpose

`platipie-cms` is a standalone content-management server whose entire job is to make the Astro site at `~/repo/AdityaBorkar` editable without touching a code editor.

It reads Astro Content Collections (Content Layer API) from the Astro checkout, presents them in a **single unified editor** (Markdown source ⇄ Visual toggle + live preview), exposes **WordPress-parity publishing/SEO fields** plus advanced blog features, validates against the Astro Zod schemas (extending them additively where needed), and writes `.md` / `.mdx` / `.json` / `.ts` files back to disk.

There is no database. The Astro repo's `cms/` files are the source of truth.

## 2. Goals / Non-goals

### Goals (V1)

- Edit everything the Astro site renders content from:
  - `cms/projects/*.md` (full editor, existing Zod schema + WP additions)
  - `cms/blog/*.md` (full editor; **register as a real collection** — see §5)
  - `cms/clients.json`, `cms/mockups.json`, `cms/testimonials.json` (table editors)
  - `cms/constants.ts` (typed settings form + raw fallback)
  - `cms/schema-markup/*` per-post selection (type dropdown + validated fields/JSON)
  - `src/pages/legal/*.mdx` (raw MDX source preserving JS imports + preview)
- One unified editor route with `Markdown ⇄ Visual` toggle, shared save pipeline.
- WordPress-parity field set on blog (and where sensible, projects) — §6.
- Yoast-style SEO assistant: live checks + counts + readability/keyword scoring + optional BYOK AI suggestions (off by default) — §9.
- Media upload + picker writing `assets/images/` / `public/` paths — §10.
- Direct validated atomic file writes with inline errors/diffs; create/duplicate/rename-via-slug/soft-delete — §11.
- Local single-user Bun server; no auth, no workflow, no auto-commit, no rebuild trigger — §13.

### Non-goals (V1)

- No approval/review workflow, roles, or multi-user auth.
- No `git commit/push`, no Astro rebuild/redeploy trigger, no cron scheduler (scheduled = frontmatter only).
- No migration/import from WordPress; "WordPress related" means field parity, not WP import.
- No pixel-perfect in-place click-to-edit inside the Astro iframe (preview iframe is read-only).

## 3. Tech stack (pinned)

- **TanStack Start (latest)** app, **Bun** runtime, **Nitro** with `bun` preset.
- Local long-running server beside the Astro checkout: `bun run dev` / `bun run start`.
- Markdown/MDX: unified/remark pipeline for preview; **TipTap or Milkdown** for Visual editing (exact choice left to implementation, must round-trip MD/MDX without data loss).
- Raw code panes (legal MDX, constants fallback, schema JSON): **Monaco**.
- Validation: **Zod** (reuse schemas from Astro `content.config.ts` where possible).
- No ORM/DB. Filesystem I/O via Bun/Nitro server functions + REST under `/api/cms`.

## 4. Repo relationship & runtime config

- CMS takes `ASTRO_ROOT` env (absolute path to Astro checkout, e.g. `/home/aditya/repo/AdityaBorkar`). All content I/O is scoped under `ASTRO_ROOT`. Path traversal outside `ASTRO_ROOT` is rejected.
- Optional `ASTRO_URL` env (e.g. `http://localhost:4321`) — running Astro dev server used **only** for the read-only faithful preview iframe. If unset, faithful-preview pane shows a "start Astro dev server" hint; local styled preview still works.
- Optional `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL` (OpenAI-compatible) — enable AI SEO suggestions only when set. Default: off, heuristics-only.
- `PORT` (default e.g. `4000`), `TRASH_TTL_DAYS=30`.
- The CMS never copies content into its own store. It lists/reads/parses on demand and writes back in place.
- Reference facts baked into this spec (verified 2026-10-25): Astro `7.4.2`, `@astrojs/mdx 8.1.1`, `output: server` + Cloudflare adapter, no CMS dependency; `content.config.ts` defines `projects` (glob), `clients`/`mockups`/`testimonials` (file); `cms/blog/*.md` unregistered stubs (`title + date` only); projects have `title, description, hero_image, hero_tag, filter_category[7], tags[], links{}, timeline, year, benefits[], index?`; no `draft/status` field; SEO via `root-layout.astro` props + `cms/schema-markup/` (~30 builders) + sitemap/robots/og; images are unvalidated strings resolved by `src/lib/assets.ts` from `assets/images/` + `public/`.

## 5. Collections & scope

| Layer        | Source                                                                                                                                                                     | Editor                                                                                                                                                                                                                                                      |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| projects     | `cms/projects/*.md` (exclude `-template*` from lists)                                                                                                                      | Full unified editor (§7). Existing Zod fields + §6 WP additions. Body: MD **or MDX** (see §7.4).                                                                                                                                                            |
| blog         | `cms/blog/*.md`                                                                                                                                                            | Full unified editor. **CMS registers the collection** (see below). Same WP set. Body: MD or MDX.                                                                                                                                                            |
| clients      | `cms/clients.json` (`{id, logo, className?}`)                                                                                                                              | Table: list/add/edit/delete rows, logo picker.                                                                                                                                                                                                              |
| mockups      | `cms/mockups.json` (`{id, img}`)                                                                                                                                           | Table editor, image picker.                                                                                                                                                                                                                                 |
| testimonials | `cms/testimonials.json` (`{id, role, text, project?, proof?}` — note `project` exists in data but not in Zod; V1 must preserve unknown keys and surface the drift warning) | Table editor with long-text + nested `proof`/`project` fields.                                                                                                                                                                                              |
| legal        | `src/pages/legal/*.mdx` (`_privacy-policy`, `_terms-of-service`, `_cookie-policy`)                                                                                         | Raw MDX + preview; imports/interpolation preserved byte-for-byte when untouched.                                                                                                                                                                            |
| settings     | `cms/constants.ts` (`SITE_URL, SOCIALS, NAV_ITEMS, PRICING, HOMEPAGE…`)                                                                                                    | Typed form per key + "Advanced: raw TS" fallback. Written via codegen that preserves comments/formatting where feasible; always re-validated by `tsc --noEmit`-style check or `bun build` parse before save.                                                |
| schema       | per-post `schemaType` + fields                                                                                                                                             | Dropdown of known builder types (`BlogPosting`, `Article`, `HowTo`, `WebPage/*`, `Software*`, `Review`, …) + field form / JSON pane, mapped to existing builders in `cms/schema-markup/`; preview of emitted JSON-LD. Never hand-edits builder `.ts` files. |

### 5.1 Blog registration (CMS-managed)

On first run (or via Settings action "Register blog collection"), if `content.config.ts` has no `blog` entry, the CMS appends/merges an additive `blog` definition:

```ts
const blog = defineCollection({
	loader: glob({ base: "./cms/blog", pattern: "**/*.md" }),
	schema: z
		.object({
			title: z.string(),
			// WP-parity additions (all optional to accept legacy stubs):
			excerpt: z.string().optional(),
			status: z.enum(["draft", "published", "scheduled"]).optional(),
			publishDate: z.string().optional(), // ISO; superset of legacy `date`
			date: z.string().optional(), // legacy stub compat
			modifiedDate: z.string().optional(),
			author: z.string().optional(),
			categories: z.array(z.string()).optional(),
			tags: z.array(z.string()).optional(),
			featuredImage: z.string().optional(),
			canonicalUrl: z.string().url().optional().or(z.literal("").optional()),
			metaTitle: z.string().optional(),
			metaDescription: z.string().optional(),
			keywords: z.array(z.string()).optional(),
			ogImage: z.string().optional(),
			ogType: z.string().optional(),
			twitterCard: z.string().optional(),
			noindex: z.boolean().optional(),
			nofollow: z.boolean().optional(),
			schemaType: z.string().optional(),
		})
		.passthrough(),
});
```

- Also extends `projects` schema **additively** with the same WP/SEO optionals (§6) — never narrows existing validation.
- Writes are AST-preserving text merges (not full-file rewrites) + a pre-save backup; if merge fails, abort with error and leave file untouched.
- Assumption recorded: no `src/pages/(blog|writings|craft)/[…]` route renders `cms/blog/` today (`NAV /writings,/craft` have no matching pages). CMS registers data layer only; route creation stays in the Astro repo (surfaced as a warning banner, not auto-scaffolded).

## 6. Canonical field model (WordPress parity)

Applies fully to `blog`; applies to `projects` where sensible (all optional additions — existing required fields unchanged):

`slug (derived from filename, editable → renames file), excerpt, status: draft|published|scheduled, publishDate (ISO), modifiedDate (auto-touched on save, editable override), author, categories[], tags[], featuredImage, canonicalUrl, metaTitle, metaDescription, keywords[] (default = tags), ogImage, ogType (default article), twitterCard (default summary_large_image), noindex, nofollow, schemaType + schemaFields`

Legacy compat: `date` (blog stubs), `hero_image` (projects; treated as `featuredImage` alias in UI, both persisted), `filter_category` (projects; surfaced as categories alias), `year`/`timeline` (projects; kept).

Validation rules: slug `^[a-z0-9]+(?:-[a-z0-9]+)*$`; URLs validated (absolute or site-relative); dates ISO-8601; `scheduled` requires future `publishDate` (warning, not block); `noindex` + `sitemap` conflict warns.

## 7. Unified editor (`/edit/[...path]`)

Single route handles every editable file. Layout: left = form/sidebar, center = `Markdown ⇄ Visual` toggle + preview panes, right = SEO assistant (§9). All modes share one save pipeline (§11).

### 7.1 Markdown mode

- Monaco (or equivalent) source for body + structured frontmatter form on top (all §6 + collection-specific fields: `hero_tag`, `filter_category`, `links`, `benefits`, etc.).
- MDX allowed in `projects`/`blog` bodies per user decision (imports/components preserved). Visual mode degrades gracefully on complex JSX (see §7.4).

### 7.2 Visual mode engine

- **Local render**: TipTap/Milkdown WYSIWYG bound to the same body model, styled with Astro-like typography. This is the editing surface.
- **Faithful preview**: separate read-only `<iframe src="${ASTRO_URL}/<preview-path>">` when `ASTRO_URL` is set; never editable. Preview path mapping is conventional (`blog/<slug>`, `work/<slug>`, `legal`) and overridable per file; if the route 404s, show the local render with a notice.

### 7.3 Frontmatter forms

- Generated from Zod + §6: text, textarea, select (`hero_tag`, `status`, `schemaType`), tag inputs (`tags`, `keywords`, `categories`, `filter_category` enum multi), key-value (`links`), repeatable (`benefits[{metric,label}]`, `proof`, `project`), image picker fields, date pickers, toggles (`noindex/nofollow`).
- Unknown/extra keys (e.g. testimonials `project`) round-trip untouched and are flagged in a "drift" notice.

### 7.4 MD/MDX policy

- V1 **allows MDX everywhere** (projects, blog, legal). `glob` loaders already accept `*.md`; if an `.mdx` file is created the CMS warns that the loader pattern + Astro route must accept it, and offers to widen the glob to `**/*.{md,mdx}` as part of the §5.1 merge.
- Visual editor must not destroy JSX: unknown nodes are preserved as opaque blocks; if a construct can't round-trip, Visual mode shows an "uneditable block — switch to Markdown" placeholder rather than stripping it.
- Legal MDX `import … from "#cms/constants"` lines and `{EXPR}` interpolations are never normalized.

## 8. IA & routes

- `/` — dashboard: collection cards (projects, blog, clients, mockups, testimonials, legal, settings) with counts, search, `New` buttons, recent-edits, drift warnings (unregistered blog, testimonials schema drift, missing Astro routes, `-template.md.` oddity).
- `/edit/<collection>/<id>` — unified editor (§7). `<id>` = filename slug for md/mdx, row `id` for JSON.
- `/settings` — constants form + raw fallback, blog-registration action, env status (`ASTRO_ROOT` reachable, `ASTRO_URL` reachable, AI enabled?), trash management.
- REST (all under `/api/cms`, JSON): `GET /collections`, `GET /entries?collection=`, `GET /entry?path=`, `PUT /entry` (validate+write), `POST /entries` (create), `POST /duplicate`, `POST /rename` (slug change), `DELETE /entry` (soft), `POST /restore`, `GET /diff?path=&rev=`, `GET /media`, `POST /media` (upload), `GET /seo?path=` (score), `POST /seo/ai` (BYOK only), `GET /settings`, `PUT /settings`, `POST /collections/blog/register`.
- Transport: TanStack Start server functions backed by these REST routes (Nitro handlers); file I/O only on the server.

## 9. SEO assistant (checks + counts + score + optional AI)

Always-on local heuristics per entry; AI extras only when BYOK env is set:

- Live: `metaTitle` (warn >60 chars), `metaDescription` (warn outside 120–160), slug readability, canonical validity, `ogImage`/`featuredImage` resolvability, `keywords` ⊆/≈ `tags` hint, `noindex` vs sitemap conflict, missing `excerpt`/`featuredImage`/`schemaType` warnings, JSON-LD preview from selected schema builder.
- Score: deterministic 0–100 + readability (Flesch) + keyword coverage; breakdown shown, never blocks save.
- AI (BYOK, off by default): `POST /seo/ai` proxies to `AI_BASE_URL` with explicit user action ("Suggest titles", "Write excerpt", "Keywords from body"); responses applied only on user accept; rate-limited; key never leaves the server; every AI-filled field is labeled as such until edited.

## 10. Media

- `GET /media` lists `assets/images/**` + `public/**` (images only, thumbnails).
- `POST /media`: multipart upload → `ASTRO_ROOT/assets/images/<slug>-<date>-<name>` (images) or `ASTRO_ROOT/public/` (favicons/pdfs); validates MIME/size, sanitizes filename, returns site-relative path.
- Picker writes that path into `hero_image`/`featuredImage`/`ogImage`/`logo`/`img`. Missing-file references are flagged inline. No remote hotlinking requirement; `http(s)` URLs allowed as plain strings.

## 11. Save pipeline & file operations

1. Parse frontmatter + body (gray-matter–equivalent), preserve unknown keys/order/comments where feasible.
2. Validate: collection Zod (+ additive WP fields) → field-level errors inline; hard errors block save, warnings don't.
3. Pre-save backup (rotating `.bak` + trash copy), atomic write (tmp + rename), `modifiedDate` auto-touch (unless overridden).
4. Response includes unified diff + new validation state.

- **Filename-is-slug**: editing `slug` renames `my-post.md` → `new-slug.md` (links warning shown); collisions blocked.
- **Create**: blank or from template (`cms/projects/-template.md.` content is offered as "Project template" — the trailing-dot filename itself is never listed/edited directly and is flagged as an oddity to rename in the Astro repo).
- **Duplicate / soft-delete**: duplicate appends `-copy`; delete moves to `.cms-trash/<ts>/<path>` restorable for `TRASH_TTL_DAYS`; JSON row deletes are row-level with same trash envelope; hard wipe only from trash UI.
- Concurrency: per-file mtime/etag; stale-write conflict returns 409 with their-diff vs yours (last-write-wins only on explicit force).

## 12. API & data contracts (sketch)

```ts
EntryRef = { collection: "projects"|"blog"|"clients"|"mockups"|"testimonials"|"legal"|"settings", path: string /* repo-relative */ }
EntryPayload = { frontmatter: Record<string, unknown>, body: string, mtime: number }
PUT /api/cms/entry { ref, payload, force?: boolean } -> { ok, diff, warnings[], mtime }
```

Errors: `{ code: "VALIDATION"|"NOT_FOUND"|"CONFLICT"|"SCHEMA_MERGE"|"IO"|"AI_DISABLED", message, fields? }` with matching HTTP status.

## 13. Runtime, security, limits

- Binds localhost by default; no auth in V1 (documented risk given TS-editing power — mitigate with backups + explicit "danger zone" confirmations for settings/schema-merge/raw-TS actions).
- Upload caps (default 10 MB), allowed image MIME allowlist, filename sanitization, `ASTRO_ROOT` jail for all paths.
- Never logs `AI_API_KEY`; AI calls server-side only.
- Large-file guard: files >1 MB open read-only with a warning.

## 14. Acceptance criteria

- [ ] Pointed at a fresh clone of `AdityaBorkar` via `ASTRO_ROOT`, dashboard lists all 7 layers with correct counts; `-template.md.` hidden with template-offer + rename hint.
- [ ] Open a project, toggle Markdown ⇄ Visual and back with no diff when untouched; save a `description` change → file updated, `modifiedDate` touched, diff returned.
- [ ] Create a blog post `hello-world` → `cms/blog/hello-world.md` with WP defaults (`status: draft`); rename slug → file renamed; SEO pane shows live counts + score with zero AI calls when no key set.
- [ ] With BYOK set, "Suggest excerpt" fills excerpt labeled AI-drafted; without key the button is disabled with reason.
- [ ] Edit a testimonial row + upload `assets/images/x.png` and pick it as a client logo; both persist.
- [ ] Edit `SITE_URL` in settings form + raw MDX legal page with `{SOCIALS.email}` intact after save.
- [ ] Delete a post → trash → restore within TTL; stale-write conflict surfaces 409.
- [ ] `content.config.ts` blog registration + projects additive extension applied cleanly once (idempotent), site still typechecks.

## 15. Risks / open notes

- Blog route doesn't exist in the Astro repo — CMS previews fall back to local render until Astro adds it.
- MDX-everywhere widens loader globs — coordinated Astro change, CMS assists but doesn't force.
- `testimonials.json` has a `project` key missing from Zod — CMS preserves it and warns; Astro schema should be updated.
- `platipie.md` has empty `hero_tag` (null) and `gem-finder.md` body is the richest real-world round-trip test.
