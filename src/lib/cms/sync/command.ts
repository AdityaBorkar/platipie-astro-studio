// Shared sync CLI implementation: `scripts/sync.ts` and the `platipie-cms
// sync` subcommand both run through here, so flags and behaviour stay
// identical whichever entry point is used. Server-only.
import { getProjectRoot } from "../config.ts";
import { closeDb, getDbPath } from "../db/index.ts";
import { startSyncEngine, stopAllSyncEngines } from "./engine.ts";
import { SYNC_SCOPES, fullSync, getSyncStatus, syncScope } from "./index.ts";
import type { SyncScope } from "./index.ts";
import { startMachineStats } from "./machine-stats.ts";

export interface SyncCommandOptions {
	db?: string;
	machineStats?: string;
	once?: boolean;
	root?: string;
	scope?: string;
}

async function printSyncStatus(root: string): Promise<void> {
	const status = await getSyncStatus();
	console.log(`root: ${root}`);
	console.log(`db:   ${getDbPath()}`);
	for (const entry of status) {
		const when = entry.lastSync ? new Date(entry.lastSync).toISOString() : "never";
		console.log(`  ${entry.scope.padEnd(10)} rows=${entry.fileCount} lastSync=${when}`);
	}
}

/**
 * Run the sync command. Returns the process exit code (0 = ok, 1 = failed).
 * Throws on invalid `--scope` / `--machine-stats` values so entry points can
 * print the message and exit 1, exactly like the original `scripts/sync.ts`.
 * Watch mode never returns; it exits the process on SIGINT/SIGTERM.
 */
export async function runSyncCommand(options: SyncCommandOptions = {}): Promise<number> {
	const scopeArg = options.scope ?? null;
	if (scopeArg !== null && !(SYNC_SCOPES as readonly string[]).includes(scopeArg)) {
		throw new Error(`Unknown scope: ${scopeArg} (expected one of ${SYNC_SCOPES.join(", ")})`);
	}
	if (options.root) process.env.PROJECT_PATH = options.root;
	if (options.db) process.env.CMS_DB_PATH = options.db;
	const root = getProjectRoot();

	let stopStats: (() => void) | null = null;
	if (options.machineStats !== undefined) {
		const seconds = Number(options.machineStats);
		if (!Number.isFinite(seconds) || seconds <= 0) {
			throw new Error(
				`Invalid --machine-stats value: ${options.machineStats} (expected seconds > 0)`,
			);
		}
		stopStats = startMachineStats(seconds, root);
	}

	try {
		if (options.once) {
			if (scopeArg) {
				const count = await syncScope(scopeArg as SyncScope, root);
				console.log(`[sync] scope ${scopeArg}: ${count} rows → ${getDbPath()}`);
			} else {
				const result = await fullSync(root);
				console.log(`[sync] full sync of ${result.root} → ${getDbPath()}`);
				for (const entry of result.scopes)
					console.log(`  ${entry.scope.padEnd(10)} rows=${entry.fileCount}`);
			}
			await printSyncStatus(root);
			return 0;
		}
		if (scopeArg) console.log("[sync] --scope is only used with --once; watching all scopes");
		await startSyncEngine(root);
		await printSyncStatus(root);
		console.log("[sync] watching for changes (Ctrl+C to stop)");
		const shutdown = async (): Promise<void> => {
			console.log("\n[sync] stopping…");
			await stopAllSyncEngines();
			if (stopStats) stopStats();
			closeDb();
			process.exit(0);
		};
		process.on("SIGINT", () => void shutdown());
		process.on("SIGTERM", () => void shutdown());
		await new Promise(() => {});
		return 0;
	} catch (error) {
		console.error("[sync] failed:", (error as Error).message ?? error);
		return 1;
	} finally {
		if (stopStats) stopStats();
		closeDb();
	}
}
