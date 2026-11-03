import { getProjectRoot, setProjectRoot } from "../config.ts";
import { closeDb } from "../db/index.ts";
import { getDbPath as resolveDbPath, setDbPathOverride } from "../paths.ts";
import { startSyncEngine, stopAllSyncEngines } from "./engine.ts";
import { SYNC_SCOPES, fullSync, getSyncStatus, syncScope } from "./index.ts";
import type { SyncScope } from "./index.ts";

export interface SyncCommandOptions {
	db?: string;
	/** Removed flag: accepted for CLI compat, ignored. */
	machineStats?: string;
	once?: boolean;
	root?: string;
	scope?: string;
}

// Single arg parser for the sync CLIs. cli/index.ts owns its own commander
// setup; scripts/sync.ts uses this so the two cannot drift.
export function parseSyncArgs(argv: string[]): SyncCommandOptions {
	const options: SyncCommandOptions = {};
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === "--once") options.once = true;
		else if (arg.startsWith("--scope=")) options.scope = arg.slice("--scope=".length) || undefined;
		else if (arg === "--scope") options.scope = argv[++i] ?? undefined;
		else if (arg.startsWith("--root=")) options.root = arg.slice("--root=".length) || undefined;
		else if (arg === "--root") options.root = argv[++i] ?? undefined;
		else if (arg.startsWith("--db=")) options.db = arg.slice("--db=".length) || undefined;
		else if (arg === "--db") options.db = argv[++i] ?? undefined;
	}
	return options;
}

async function printSyncStatus(root: string): Promise<void> {
	const status = await getSyncStatus();
	console.log(`root: ${root}`);
	console.log(`db:   ${resolveDbPath()}`);
	for (const entry of status) {
		const when = entry.lastSync ? new Date(entry.lastSync).toISOString() : "never";
		console.log(`  ${entry.scope.padEnd(10)} rows=${entry.fileCount} lastSync=${when}`);
	}
}

function waitForAbort(signal: AbortSignal): Promise<void> {
	if (signal.aborted) return Promise.resolve();
	return new Promise<void>((resolve) => {
		signal.addEventListener("abort", () => resolve(), { once: true });
	});
}

export async function runSyncCommand(
	options: SyncCommandOptions = {},
	signal?: AbortSignal,
): Promise<number> {
	const scopeArg = options.scope ?? null;
	if (scopeArg !== null && !(SYNC_SCOPES as readonly string[]).includes(scopeArg)) {
		throw new Error(`Unknown scope: ${scopeArg} (expected one of ${SYNC_SCOPES.join(", ")})`);
	}
	if (options.machineStats !== undefined) {
		console.warn("[sync] --machine-stats was removed; ignoring.");
	}
	// Thread root/dbPath explicitly via scoped overrides (restored in finally).
	setProjectRoot(options.root ?? null);
	setDbPathOverride(options.db ?? null);
	const root = getProjectRoot();

	try {
		if (options.once) {
			if (scopeArg) {
				const count = await syncScope(scopeArg as SyncScope, root);
				console.log(`[sync] scope ${scopeArg}: ${count} rows → ${resolveDbPath()}`);
			} else {
				const result = await fullSync(root);
				console.log(`[sync] full sync of ${result.root} → ${resolveDbPath()}`);
				for (const entry of result.scopes)
					console.log(`  ${entry.scope.padEnd(10)} rows=${entry.fileCount}`);
			}
			await printSyncStatus(root);
			return 0;
		}
		if (scopeArg) {
			throw new Error("--scope requires --once (scoped watch is not supported).");
		}
		await startSyncEngine(root);
		await printSyncStatus(root);
		console.log("[sync] watching for changes (Ctrl+C to stop)");
		if (signal) {
			// Abort-driven shutdown: the only shutdown path besides the engine's
			// own SIGINT/SIGTERM hooks. finally { closeDb() } below is reachable.
			await waitForAbort(signal);
			await stopAllSyncEngines();
			return 0;
		}
		// Legacy callers without a signal (older CLI): block until the process is
		// killed; the engine shutdown hooks stop the watchers.
		await new Promise(() => {});
		return 0;
	} catch (error) {
		console.error("[sync] failed:", (error as Error).message ?? error);
		return 1;
	} finally {
		setProjectRoot(null);
		setDbPathOverride(null);
		closeDb();
	}
}
