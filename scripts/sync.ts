// Usage: bun scripts/sync.ts [--once] [--scope=<scope>] [--root=<path>] [--db=<path>]
//   --once runs one sync then exits (default: watch); --scope needs --once.
import { parseSyncArgs, runSyncCommand } from "#/cms/sync/command.ts";
import { SYNC_SCOPES } from "#/cms/sync/index.ts";

function usage(): void {
	console.log(`platipie-astro-studio sync — SQLite read-model + FS watcher
Usage:
  bun scripts/sync.ts [options]

Options:
  --once               run one sync then exit (default: watch)
  --scope=<scope>      sync only one scope with --once (${SYNC_SCOPES.join("|")})
  --root=<path>        override PROJECT_PATH for this run
  --db=<path>          override the SQLite file (CMS_DB_PATH)
  --help               show this help`);
}

function hasFlag(name: string): boolean {
	return process.argv.slice(2).includes(`--${name}`);
}

if (hasFlag("help")) {
	usage();
	process.exit(0);
}

const controller = new AbortController();
process.once("SIGINT", () => controller.abort());
process.once("SIGTERM", () => controller.abort());

let code = 1;
try {
	code = await runSyncCommand(parseSyncArgs(process.argv.slice(2)), controller.signal);
} catch (error) {
	console.error((error as Error).message ?? error);
}
process.exit(code);
