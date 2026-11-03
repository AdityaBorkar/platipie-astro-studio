# AGENTS.md

## Stack

Bun + TanStack Start (React 19, SSR, Nitro `bun` preset) + Tailwind v4 + Zod v4 + oRPC + drizzle over `bun:sqlite` + oxlint/oxfmt + tsrs. No tests (`bun test` finds nothing), no CI.

## Commands

```bash
bun install
bun run dev              # vite dev on 127.0.0.1:4000, HTTPS self-signed via vite-plugin-mkcert
bun run cms              # cli/index.ts — loads cwd Astro project if present, else project-selector UI
bun run build            # vite build, output .output/ (not dist/)
bun run verify           # format && lint && types && build (full pre-push gate)
bun run check:format     # oxfmt --write in place (gate with `oxfmt --check`)
bun run check:lint       # oxlint
bun run check:tailwind   # NOT part of verify — run separately when touching classes
bun run check:types      # tsrs (Bun typechecker, not tsc)
bun run gen:routes       # tsr generate -> src/routeTree.gen.ts
bun run sync             # FS-watcher sync engine (bun ./cli/index.ts sync; same engine as bun scripts/sync.ts)
bun run sync:once        # one full SQLite rebuild, no watcher
bun run preview/start    # vite preview of .output/ (prod build; start == preview)
```

- Always `bun`/`bunx`, never `npm`/`npx`. (`bunfig.toml`: `ignore-scripts=true`, `exact=true`, `minimumReleaseAge=3d`.)
- Pre-commit hook runs `oxfmt --write` over staged ts/tsx/css and re-adds them (`fmt` is the oxfmt alias in package.json); run `bun run check:format` manually if it fails.
- Distributed bin is raw TS (`./cli/index.ts`, Bun-only `#/cms/*` imports) — run via `bunx`, never `npx`.
- Commits use commitlint conventional types: `build|chore|ci|docs|feat|fix|perf|refactor|revert|review|test|wip`.

## Architecture

- API is oRPC, not per-endpoint files: procedures live in `src/cms/orpc/router.ts`; `/api/cms/*` is served through the OpenAPI handler (`src/routes/api/cms.$.ts`), typed RPC at `/api/rpc/*` (`src/routes/api/rpc.$.ts`). Only `src/routes/api/cms/media.ts` is a plain file route (binary streaming + multipart upload aren't JSON procedures).
- Files under `PROJECT_PATH` (falls back to cwd) are the source of truth. SQLite (`$XDG_DATA_HOME/platipie-cms-dev/cms.db` or `CMS_DB_PATH`, schema `src/cms/db/schema.ts`, DDL inline in `db/index.ts`) is only the sync read-model — never treat it as canonical. Dev server starts the watcher eagerly (`vite.config.ts`); production boots lazily on first API request.
- Server-only: all of `src/cms/` (PROJECT_PATH jail in `config.ts`, AI keys, uploader). Import it via `#/cms/*` alias, app code via `#/*` (`~/*` also maps to `src/*`); never import `#/cms/*` from client components. Client env only via `src/env.ts` (`VITE_` prefix, T3 `createEnv`).
- `src/routeTree.gen.ts` is generated (`*.gen.ts` gitignored) — never edit by hand.
- Sanitization ownership: client preview HTML goes through `markdownToSafeHtml` in `src/routes/markdown.ts`; server render is unified with `allowDangerousHtml: false` (no raw HTML passthrough).

## Env and safety

- `cp .env.example .env`; `HOST` defaults to `127.0.0.1`, `PORT` to `4000`. Binds localhost by default, no auth in V1 (backups + danger-zone confirms).
- AI is off unless **both** `AI_API_KEY` and `AI_BASE_URL` are set; the key never leaves the server / is never logged.
- `CMS_SYNC=0` (or CLI `--no-sync`) disables the FS-watcher sync engine; the dev-server plugin no-ops when set. See `.env.example`.
- Gotchas: filename-is-slug (editing slug renames the file); soft deletes go to `.cms-trash/` with `TRASH_TTL_DAYS` expiry; 10 MB upload cap with image-MIME allowlist; 1 MB read-only guard (fixed `LARGE_FILE_BYTES` constant in `src/cms/config.ts`, not env).

## Conventions

- `verbatimModuleSyntax` — `import type` for type-only. `noUnusedLocals`/`noUnusedParameters` fail typecheck. `sort-keys: asc` (minKeys 2; off in `src/components/ui/**`).
- oxfmt: tabs, `printWidth` 100, import groups `builtin`+`bun` / `external` / `internal` / `parent`+`sibling` / `style` / `unknown`, Tailwind class sorting via `src/styles.css` (`cn` fn). oxlint: `correctness`/`pedantic`/`perf`/`suspicious` as error; `http(s)://` and `npm:`/`jsr:` imports banned; no inline suppressions — exceptions live in `.oxlintrc.json` `overrides` only (`react/no-danger` off in `src/routes/content.tsx` + `src/routes/content/**` + `src/routes/edit.$collection.$id.tsx` + `src/routes/edit/**` for local markdown preview — all HTML goes through `markdownToSafeHtml` in `src/routes/markdown.ts`; `no-await-in-loop` off for sequential FS I/O in `src/cms/**` + `scripts/**`).
- ES2023 lib/target (`toSorted`/`toReversed` used throughout). Zod v4: `z.record` takes key+value (`z.record(z.string(), z.unknown())`).
- Tailwind v4: all tokens in `src/styles.css`; lint bans arbitrary values / hardcoded colors / unknown classes as errors — add a named `@utility` instead (e.g. `transition-card`, `shadow-soft`). Living reference `/design` (`src/routes/design.tsx`); keep `DESIGN.md` in sync with token/component changes. GitBook-inspired: warm stone neutrals, one orange (`--brand`) for emphasis only, black (`--primary`) for actions, pill buttons, hairline borders, 16px cards / 24px panels. Fonts vendored in `public/fonts/` (General Sans + Geist Mono). Marketing surfaces use `Reveal` (disabled under `prefers-reduced-motion`); app forms skip it.
- shadcn `base-nova` in `src/components/ui` (`components.json` aliases `ui` → `#/components/ui`). Content surfaces (`.prose-preview`, `.grid-cols-editor`) live in `@layer components` in `src/styles.css`; resets in `@layer base`.
- Domain language in `GLOSSARY.md`; product surface map in `README.md`; design rules in `DESIGN.md`.
- ADRs (`docs/adr/`) are foundations-only (stack, auth, storage, schema-shape); routine changes skip them.
