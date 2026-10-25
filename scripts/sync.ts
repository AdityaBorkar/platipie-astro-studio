// Sync CLI: builds the SQLite read-model and keeps it fresh via the FS watcher.
//
// Usage:
//   bun scripts/sync.ts [--once] [--scope=<scope>] [--machine-stats=<seconds>]
//                         [--root=<astro-root>] [--db=<sqlite-path>] [--help]
//
//   --once               run one full sync (or one scope) then exit
//   --scope=<scope>      assets|content|components|layouts|templates|pages|emails|astro
//   --machine-stats=N    print CPU / memory / disk usage every N seconds
//   --root=<path>        override ASTRO_ROOT for this run
//   --db=<path>          override CMS_DB_PATH for this run
import { closeDb } from "../src/lib/cms/db/index.ts";
import { SYNC_SCOPES, fullSync, getSyncStatus, syncScope } from "../src/lib/cms/sync/index.ts";
import type { SyncScope } from "../src/lib/cms/sync/index.ts";
import { startMachineStats } from "../src/lib/cms/sync/machine-stats.ts";
import { startWatcher } from "../src/lib/cms/sync/watcher.ts";

function usage(): void {
	console.log(`platipie-cms sync — SQLite read-model + FS watcher
Usage:
  bun scripts/sync.ts [options]

Options:
  --once               run one sync then exit (default: watch)
  --scope=<scope>      sync only one scope with --once (${SYNC_SCOPES.join("|")})
  --machine-stats=N    print CPU / memory / disk usage every N seconds
  --root=<path>        override ASTRO_ROOT for this run
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

const scopeArg = flagValue("scope");
if (scopeArg && !(SYNC_SCOPES as readonly string[]).includes(scopeArg)) {
	console.error(`Unknown scope: ${scopeArg} (expected one of ${SYNC_SCOPES.join(", ")})`);
	process.exit(1);
}

const rootArg = flagValue("root");
if (rootArg) process.env.ASTRO_ROOT = rootArg;
const dbArg = flagValue("db");
if (dbArg) process.env.CMS_DB_PATH = dbArg;

const { getAstroRoot } = await import("../src/lib/cms/config.ts");
const root = getAstroRoot();
const { getDbPath } = await import("../src/lib/cms/db/index.ts");

async function printStatus(): Promise<void> {
	const status = await getSyncStatus();
	console.log(`root: ${root}`);
	console.log(`db:   ${getDbPath()}`);
	for (const entry of status) {
		const when = entry.lastSync ? new Date(entry.lastSync).toISOString() : "never";
		console.log(`  ${entry.scope.padEnd(10)} rows=${entry.fileCount} lastSync=${when}`);
	}
}

if (hasFlag("help")) {
	usage();
	process.exit(0);
}

const statsArg = flagValue("machine-stats");
let stopStats: (() => void) | null = null;
if (statsArg !== null) {
	const seconds = Number(statsArg);
	if (!Number.isFinite(seconds) || seconds <= 0) {
		console.error(`Invalid --machine-stats value: ${statsArg} (expected seconds > 0)`);
		process.exit(1);
	}
	stopStats = startMachineStats(seconds, root);
}

let failed = false;
try {
	if (hasFlag("once")) {
		if (scopeArg) {
			const count = await syncScope(scopeArg as SyncScope, root);
			console.log(`[sync] scope ${scopeArg}: ${count} rows → ${getDbPath()}`);
		} else {
			const result = await fullSync(root);
			console.log(`[sync] full sync of ${result.root} → ${getDbPath()}`);
			for (const entry of result.scopes)
				console.log(`  ${entry.scope.padEnd(10)} rows=${entry.fileCount}`);
		}
		await printStatus();
	} else {
		if (scopeArg) console.log(`[sync] --scope is only used with --once; watching all scopes`);
		const watcher = await startWatcher(root);
		await printStatus();
		console.log("[sync] watching for changes (Ctrl+C to stop)");
		const shutdown = async () => {
			console.log("\n[sync] stopping…");
			await watcher.close();
			if (stopStats) stopStats();
			closeDb();
			process.exit(0);
		};
		process.on("SIGINT", () => void shutdown());
		process.on("SIGTERM", () => void shutdown());
		await new Promise(() => {});
	}
} catch (error) {
	failed = true;
	console.error("[sync] failed:", (error as Error).message ?? error);
} finally {
	if (stopStats) stopStats();
	closeDb();
}
if (failed) process.exit(1);
