// Sync CLI: builds the SQLite read-model and keeps it fresh via the FS watcher.
//
// Usage:
//   bun scripts/sync.ts [--once] [--scope=<scope>] [--machine-stats=<seconds>]
//                         [--root=<path>] [--db=<sqlite-path>] [--help]
//
//   --once               run one full sync (or one scope) then exit
//   --scope=<scope>      assets|content|components|layouts|templates|pages|emails|astro
//   --machine-stats=N    print CPU / memory / disk usage every N seconds
//   --root=<path>        override PROJECT_PATH for this run
//   --db=<path>          override the SQLite file (CMS_DB_PATH)
//   --help               show this help
//
// Thin wrapper: the implementation lives in
// `src/lib/cms/sync/command.ts` so the `platipie-cms sync` CLI subcommand
// shares the exact same engine and flags.
import { runSyncCommand } from "#cms/sync/command.ts";
import { SYNC_SCOPES } from "#cms/sync/index.ts";

function usage(): void {
	console.log(`platipie-cms sync — SQLite read-model + FS watcher
Usage:
  bun scripts/sync.ts [options]

Options:
  --once               run one sync then exit (default: watch)
  --scope=<scope>      sync only one scope with --once (${SYNC_SCOPES.join("|")})
  --machine-stats=N    print CPU / memory / disk usage every N seconds
  --root=<path>        override PROJECT_PATH for this run
  --db=<path>          override the SQLite file (CMS_DB_PATH)
  --help               show this help`);
}

function flagValue(name: string): string | null {
	const prefix = `--${name}=`;
	for (const arg of process.argv.slice(2)) {
		if (arg.startsWith(prefix)) return arg.slice(prefix.length);
	}
	return null;
}

function hasFlag(name: string): boolean {
	return process.argv.slice(2).includes(`--${name}`);
}

if (hasFlag("help")) {
	usage();
	process.exit(0);
}

let code = 1;
try {
	code = await runSyncCommand({
		db: flagValue("db") ?? undefined,
		machineStats: flagValue("machine-stats") ?? undefined,
		once: hasFlag("once"),
		root: flagValue("root") ?? undefined,
		scope: flagValue("scope") ?? undefined,
	});
} catch (error) {
	console.error((error as Error).message ?? error);
}
process.exit(code);
