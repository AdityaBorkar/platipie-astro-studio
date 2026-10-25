# platipie-cms

Standalone content-management server for the Astro site at `ASTRO_ROOT`.
TanStack Start (latest) + Bun + Nitro (`bun` preset). No database — `cms/` files are the source of truth.

## Run

```sh
cp .env.example .env   # set ASTRO_ROOT to your Astro checkout
bun install
bun run dev    # vite dev on 127.0.0.1:4000
bun run build && bun run start
```

- Dashboard: `/` — 7 collection cards, counts, search, `New`, recent-edits, drift warnings.
- Unified editor: `/edit/:collection/:id?path=<repo-rel>` — Markdown ⇄ Visual, frontmatter form, local + faithful previews, SEO sidebar, one save pipeline.
- Settings: `/settings` — typed form + raw TS fallback, blog registration, env status, trash.

## REST (`/api/cms`)

`GET /collections`, `GET /entries?collection=&q=`, `GET /entry?path=`, `PUT /entry`,
`POST /entries`, `POST /duplicate`, `POST /rename`, `DELETE /entry`, `GET|POST /restore`,
`GET /diff?path=&rev=`, `GET|POST /media`, `GET /seo?path=`, `POST /seo/ai`,
`GET|PUT /settings`, `GET|POST /collections/blog/register`.

File I/O only on the server. All paths jailed under `ASTRO_ROOT`. Errors:
`VALIDATION|NOT_FOUND|CONFLICT|SCHEMA_MERGE|IO|AI_DISABLED` + HTTP status.

## Notes

- Binds localhost by default, no auth in V1 (documented risk; backups + danger-zone confirms).
- Upload cap 10 MB, image MIME allowlist, filename sanitization, 1 MB read-only guard.
- `AI_API_KEY` never leaves the server / never logged; AI off unless BYOK set.
- Filename-is-slug: editing slug renames `my-post.md` → `new-slug.md`.
- Verify: `bun run verify` (format + lint + types + build gate); SPEC §14 acceptance: `bun run verify:spec`.
- Lint/format: `bun run check:format` (oxfmt, writes in place), `bun run check:lint` (oxlint), `bun run check:tailwind`, types via `bun run check:types` (tsrs).
