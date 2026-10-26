# AGENTS.md

## Stack

Bun + TanStack Start (React 19, SSR, Nitro `bun` preset) + Tailwind v4 + Zod v4 + oRPC + drizzle over `bun:sqlite` + oxlint/oxfmt + tsrs. No tests (`bun test` finds nothing), no CI.

## Commands

```bash
bun install
bun run dev              # vite dev on 127.0.0.1:4000, HTTPS self-signed via @vitejs/plugin-basic-ssl
bun run cms              # cli/index.ts — loads cwd Astro project if present, else project-selector UI
bun run build            # vite build, output .output/ (not dist/)
bun run verify           # format && lint && types && build (full pre-push gate)
bun run check:format     # oxfmt — formats in place, there is no --check mode
bun run check:lint       # oxlint
bun run check:tailwind   # NOT part of verify — run separately when touching classes
bun run check:types      # tsrs (Bun typechecker, not tsc)
bun run gen:routes       # tsr generate -> src/routeTree.gen.ts
bun run sync             # FS-watcher sync engine (same as `bun scripts/sync.ts`)
bun run sync:once        # one full SQLite rebuild, no watcher
```

- Always `bun`/`bunx`, never `npm`/`npx`. (`bunfig.toml`: `ignore-scripts=true`, `exact=true`, `minimumReleaseAge=3d`.)
- Pre-commit hook runs `bun fmt --staged`, which matches no `package.json` script — commits fail at the hook until fixed; run `bun run check:format` manually.
- Commits use commitlint conventional types: `build|chore|ci|docs|feat|fix|perf|refactor|revert|test|wip`.

## Architecture

- API is oRPC, not per-endpoint files: procedures live in `src/lib/cms/orpc/router.ts`; `/api/cms/*` is served through the OpenAPI handler (`src/routes/api/cms.$.ts`), typed RPC at `/api/rpc/*` (`src/routes/api/rpc.$.ts`). Only `src/routes/api/cms/media.ts` is a plain file route (binary streaming + multipart upload aren't JSON procedures).
- Files under `PROJECT_PATH` (falls back to cwd) are the source of truth. SQLite (`$XDG_DATA_HOME/platipie-cms-dev/cms.db` or `CMS_DB_PATH`, schema `src/lib/cms/db/schema.ts`, DDL inline in `db/index.ts`) is only the sync read-model — never treat it as canonical. Dev server starts the watcher eagerly (`vite.config.ts`); production boots lazily on first API request.
- Server-only: all of `src/lib/cms/` (PROJECT_PATH jail in `config.ts`, AI keys, uploader). Import it via `#cms/*` alias, app code via `#/*` (`~/*` also maps to `src/*`); never import `#cms/*` from client components. Client env only via `src/env.ts` (`VITE_` prefix, T3 `createEnv`).
- `src/routeTree.gen.ts` is generated (`*.gen.ts` gitignored) — never edit by hand.

## Env and safety

- `cp .env.example .env`; `HOST` defaults to `127.0.0.1`, `PORT` to `4000`. Binds localhost by default, no auth in V1 (backups + danger-zone confirms).
- AI is off unless **both** `AI_API_KEY` and `AI_BASE_URL` are set; the key never leaves the server / is never logged.
- Gotchas: filename-is-slug (editing slug renames the file); soft deletes go to `.cms-trash/` with `TRASH_TTL_DAYS` expiry; 10 MB upload cap with image-MIME allowlist; 1 MB read-only guard (`LARGE_FILE_BYTES`).

## Conventions

- `verbatimModuleSyntax` — `import type` for type-only. `noUnusedLocals`/`noUnusedParameters` fail typecheck. `sort-keys: asc` (minKeys 2; off in `src/components/ui/**`).
- oxfmt: tabs, `printWidth` 100, import groups `builtin`+`bun` / `external` / `internal` / `parent`+`sibling` / `style` / `unknown`, Tailwind class sorting via `src/styles.css` (`cn` fn). oxlint: `correctness`/`pedantic`/`perf`/`suspicious` as error; `http(s)://` and `npm:`/`jsr:` imports banned; no inline suppressions — exceptions live in `.oxlintrc.json` `overrides` only (`react/no-danger` off in `src/routes/edit.$collection.$id.tsx`, `no-await-in-loop` off for sequential FS I/O in `src/lib/cms/**` + `scripts/**`).
- ES2023 lib/target (`toSorted`/`toReversed` used throughout). Zod v4: `z.record` takes key+value (`z.record(z.string(), z.unknown())`).
- Tailwind v4: all tokens in `src/styles.css`; lint bans arbitrary values / hardcoded colors / unknown classes as errors — add a named `@utility` instead (e.g. `transition-card`, `shadow-soft`). Living reference `/design` (`src/routes/design.tsx`); keep `DESIGN.md` in sync with token/component changes. GitBook-inspired: warm stone neutrals, one orange (`--brand`) for emphasis only, black (`--primary`) for actions, pill buttons, hairline borders, 16px cards / 24px panels. Fonts vendored in `public/fonts/` (General Sans + Geist Mono). Marketing surfaces use `Reveal` (disabled under `prefers-reduced-motion`); app forms skip it.
- shadcn `base-nova` in `src/components/ui` (`components.json` aliases `ui` → `#/components/ui`). Content surfaces (`.prose-preview`, `.grid-cols-editor`) live in `@layer components` in `src/styles.css`; resets in `@layer base`.
- Domain language in `GLOSSARY.md`; product surface map in `README.md`; design rules in `DESIGN.md`.
