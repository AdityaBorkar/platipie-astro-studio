# AGENTS.md

## Stack

Bun + TanStack Start (React 19, SSR) + Vite + Nitro (`bun` preset) + Tailwind v4 + Zod v4 + oxlint/oxfmt + tsrs. No tests, no CI.

## Commands

```bash
bun install
bun run dev              # vite dev on 127.0.0.1:4000, HTTPS self-signed via @vitejs/plugin-basic-ssl
bun run check:format     # oxfmt — writes in place (oxfmt defaults to --write, despite the name)
bun run check:lint       # oxlint
bun run check:types      # tsrs (Bun typechecker, not tsc)
bun run check:tailwind   # bunx tailwind-lint
bun run gen:routes       # tsr generate -> src/routeTree.gen.ts
bun run build            # vite build, output .output/ (not dist/)
bun run verify           # format && lint && types && build (full pre-push gate)
bun run verify:spec      # SPEC §14 acceptance against ASTRO_ROOT (bun scripts/verify.ts)
```

- Always `bun run <script>`, not `npm`/`npx`.
- `src/routeTree.gen.ts` is generated (`*.gen.ts` gitignored) — never edit by hand. `tsr.config.json` target is `react`.
- `verify` is the full pre-push gate; `verify:spec` is the SPEC §14 functional check.

## Paths and env

- Path aliases: `#/*` → `./src/*`, `#cms/*` → `./src/lib/cms/*`, `~/*` → `./src/*` (`package.json` `imports` + `tsconfig` `paths`). Prefer `#cms/*` inside server libs.
- Runtime config in `src/lib/cms/config.ts` (`ASTRO_ROOT` jail, `ASTRO_URL`, BYOK `AI_*`, `PORT` 4000, `TRASH_TTL_DAYS`). Client env via `src/env.ts` (T3 `createEnv` + zod, `VITE_` prefix).
- Binds localhost by default, no auth in V1 (documented risk given TS-editing power — backups + danger-zone confirms).

## Conventions

- `verbatimModuleSyntax` on — `import type` for type-only. Strict `noUnusedLocals`/`noUnusedParameters` — unused vars fail typecheck. `sort-keys` asc — keep object keys sorted.
- oxfmt: tabs, `printWidth` 100; sorts imports (`builtin`+`bun` / `external` / `internal` / `parent`+`sibling` / `style` / `unknown`) and Tailwind classes via `src/styles.css`. oxlint: `correctness`/`pedantic`/`perf`/`suspicious` as error; no inline suppressions — all exceptions in `.oxlintrc.json` `overrides` (e.g. `react/no-danger` off for the sanitized markdown preview in `edit.$collection.$id.tsx`; `no-await-in-loop` off for sequential FS I/O in `src/lib/cms/**` + `scripts/**`). `bunfig.toml`: `ignore-scripts=true`, `exact=true`, `minimumReleaseAge=3d` (use `bun install --minimum-release-age 0` only to unblock fresh resolves of brand-new publishes).
- ES2023 lib/target (lint-mandated `toSorted`/`toReversed` need ES2023 types; Bun runtime supports them).
- Zod v4: `z.record` takes key+value (`z.record(z.string(), z.unknown())`).
- shadcn `base-nova` in `src/components/ui` (`components.json` aliases `ui` → `#/components/ui`). Tokens in `src/styles.css`; content surfaces (`.prose-preview`, `.grid-cols-editor`) live in `@layer components` there. Theme state + pre-paint script in `src/hooks/use-theme.ts` + `src/routes/__root.tsx`. Put resets in `@layer base`.
- Domain language in `GLOSSARY.md`; CMS behavior in `SPEC.md` §§1–15, task map in `TASKS.md`.
