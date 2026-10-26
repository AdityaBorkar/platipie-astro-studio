// Usage: bun scripts/sync.ts [--once] [--scope=<scope>] [--machine-stats=N] [--root=<path>] [--db=<path>]
//   --once runs one sync then exits (default: watch); --scope needs --once.
//   --machine-stats=N prints CPU/mem/disk every N seconds.
import { runSyncCommand } from "#/cms/sync/command.ts";
import { SYNC_SCOPES } from "#/cms/sync/index.ts";

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
