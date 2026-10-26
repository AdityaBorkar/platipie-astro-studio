# platipie-cms

Standalone content-management server for the Astro site.
TanStack Start (latest) + Bun + Nitro (`bun` preset). No database — `cms/` files are the source of truth.

## Run

```sh
cp .env.example .env   # set PROJECT_PATH to your project checkout
bun install
bun run dev    # vite dev on 127.0.0.1:4000
bun run build && bun run start
```

- Fixed app rail: project + branch, nav map, and expandable Pages/Content/Components/Design groups.
- Dashboard: `/dashboard` — project identity and sync state, page/content/asset/component counts, recent edits, drift warnings, and the project root.
- Pages: `/pages?page=<route>` — Astro page inventory with optional SEO / metadata / schema rail.
- Content: `/content` — three-pane browser: collection tree, local entry preview, and a source properties rail.
- Components: `/components` — three-pane workbench: Components / Layouts / Templates list, staged preview canvas, and a live props rail.
- Assets: `/assets` — image library with upload, copy-path, and preview proxy.
- Unified editor: `/edit/:collection/:id?path=<repo-rel>` — Markdown ⇄ Visual, frontmatter form, local + faithful previews, SEO + schema sidebar, one save pipeline.
- Settings: `/settings` — typed form + raw TS fallback, appearance/theme switcher, env status, trash.
- Design system: `/design` — GitBook-inspired tokens, brand, style, languages, components, motion, viewports, docs shell, and full marketing flow. See `DESIGN.md`.

## REST (`/api/cms`)

`GET /collections`, `GET /entries?collection=&q=`, `GET /entry?path=`, `PUT /entry`,
`POST /entries`, `POST /duplicate`, `POST /rename`, `DELETE /entry`, `GET|POST /restore`,
`GET /diff?path=&rev=`, `GET|POST /media`, `GET /media?path=` (image proxy),
`GET /seo?path=`, `POST /seo/ai`, `GET|PUT /settings`,
`GET /workspace` (project, branch, Astro pages).

File I/O only on the server. All paths jailed under the project root (`PROJECT_PATH` or cwd). Errors:
`VALIDATION|NOT_FOUND|CONFLICT|SCHEMA_MERGE|IO|AI_DISABLED` + HTTP status.

## Design

The UI is a GitBook-inspired system expressed through shadcn tokens: warm paper, one
orange for emphasis, black pill actions, hairline surfaces, and spring motion.
Fonts are General Sans (vendored) and Geist Mono. The living reference is `/design`;
the rules and token table are in `DESIGN.md`.

## Notes

- Binds localhost by default, no auth in V1 (documented risk; backups + danger-zone confirms).
- Upload cap 10 MB, image MIME allowlist, filename sanitization, 1 MB read-only guard.
- `AI_API_KEY` never leaves the server / never logged; AI off unless BYOK set.
- Filename-is-slug: editing slug renames `my-post.md` → `new-slug.md`.
- Verify: `bun run verify` (format + lint + types + build gate).
- Lint/format: `bun run check:format` (oxfmt, writes in place), `bun run check:lint` (oxlint), `bun run check:tailwind`, types via `bun run check:types` (tsrs).
