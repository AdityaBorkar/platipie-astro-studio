// Sync engine lifecycle: one supervised FS watcher per open project.
// Server-only. `scripts/sync.ts`, the `platipie-cms sync` CLI subcommand, and
// the CMS server share this module so every entry point runs the exact same
// engine: opening a project starts its engine, closing the project (or the
// server) stops it.
//
// The server hosts a single project at a time (`PROJECT_PATH`), so starting
// an engine for one root stops the engines of the others. State lives on
// `globalThis` so Vite HMR re-imports never double-start watchers.
import path from "node:path";

import { getProjectRoot } from "../config.ts";
import { startWatcher } from "./watcher.ts";
import type { WatcherHandle } from "./watcher.ts";

const GLOBAL_KEY = "__platipie_sync_engine__";

interface EngineState {
	current: string | null;
	handles: Map<string, WatcherHandle>;
	hooksRegistered: boolean;
	pending: Map<string, Promise<WatcherHandle>>;
}

function getState(): EngineState {
	const store = globalThis as unknown as Record<string, EngineState | undefined>;
	let state = store[GLOBAL_KEY];
	if (!state) {
		state = { current: null, handles: new Map(), hooksRegistered: false, pending: new Map() };
		store[GLOBAL_KEY] = state;
	}
	return state;
}

function shutdownSyncEngines(): void {
	void stopAllSyncEngines().catch((error: unknown) => {
		console.error("[sync-engine] shutdown failed:", error instanceof Error ? error.message : error);
	});
}

/** `CMS_SYNC=0/false/no/off` disables automatic engine startup (CLI `--no-sync`). */
export function isSyncDisabled(): boolean {
	const raw = (process.env.CMS_SYNC ?? "").trim().toLowerCase();
	return raw === "0" || raw === "false" || raw === "no" || raw === "off";
}

/** Canonical key for a project root (resolves `.`/`..` against cwd). */
export function normalizeSyncRoot(root: string = getProjectRoot()): string {
	return path.resolve(root);
}

/** Roots with a live (or starting) engine, sorted. */
export function getActiveSyncRoots(): string[] {
	const state = getState();
	const roots = new Set<string>();
	for (const key of state.handles.keys()) roots.add(key);
	for (const key of state.pending.keys()) roots.add(key);
	return Array.from(roots).toSorted();
}

/** Whether `root` already has a live or starting engine. */
export function isSyncActive(root: string = getProjectRoot()): boolean {
	const key = normalizeSyncRoot(root);
	const state = getState();
	return state.handles.has(key) || state.pending.has(key);
}

/** Stop every engine on process exit/signals (registered once per process). */
export function registerSyncShutdownHooks(): void {
	const state = getState();
	if (state.hooksRegistered) return;
	state.hooksRegistered = true;
	process.once("SIGINT", shutdownSyncEngines);
	process.once("SIGTERM", shutdownSyncEngines);
	process.once("exit", shutdownSyncEngines);
}

/**
 * Start the engine for `root` (full sync + FS watch). Idempotent: returns the
 * live handle when already running and dedupes concurrent starts. Starting one
 * project stops the live engines of the others (single-project server model).
 * A start that is superseded by a newer root closes itself on resolve.
 */
export async function startSyncEngine(root: string = getProjectRoot()): Promise<WatcherHandle> {
	const key = normalizeSyncRoot(root);
	const state = getState();
	registerSyncShutdownHooks();
	const live = state.handles.get(key);
	if (live) return live;
	const inflight = state.pending.get(key);
	if (inflight) return inflight;
	const started = (async (): Promise<WatcherHandle> => {
		state.current = key;
		for (const other of Array.from(state.handles.keys())) {
			if (other === key) continue;
			const handle = state.handles.get(other);
			state.handles.delete(other);
			if (handle) await handle.close();
		}
		const handle = await startWatcher(key);
		if (state.current !== key) {
			// Superseded while the initial sync was running — never publish.
			await handle.close();
			return handle;
		}
		state.handles.set(key, handle);
		console.log(`[sync-engine] started for ${key}`);
		return handle;
	})();
	state.pending.set(key, started);
	try {
		return await started;
	} finally {
		state.pending.delete(key);
	}
}

/** Stop the engine for `root`. Never awaits another root's pending start. */
export async function stopSyncEngine(root: string = getProjectRoot()): Promise<boolean> {
	const key = normalizeSyncRoot(root);
	const state = getState();
	if (state.current === key) state.current = null;
	const live = state.handles.get(key);
	state.handles.delete(key);
	let stopped = state.pending.has(key);
	if (live) {
		await live.close();
		stopped = true;
	}
	if (stopped) console.log(`[sync-engine] stopped ${key}`);
	return stopped;
}

/** Stop every engine (server shutdown). */
export async function stopAllSyncEngines(): Promise<void> {
	const state = getState();
	state.current = null;
	for (const key of [...state.handles.keys(), ...state.pending.keys()]) {
		await stopSyncEngine(key);
	}
}

/** Switch the server to `root`: stop all other engines, start this one. */
export async function restartSyncEngine(root: string = getProjectRoot()): Promise<WatcherHandle> {
	const key = normalizeSyncRoot(root);
	await stopAllSyncEngines();
	return startSyncEngine(key);
}

/**
 * Best-effort background start for the current project. Safe to call on every
 * request (deduped via handles/pending); never throws, never blocks.
 */
export function ensureServerSync(): void {
	if (isSyncDisabled()) return;
	let key: string;
	try {
		key = normalizeSyncRoot();
	} catch {
		return;
	}
	const state = getState();
	if (state.handles.has(key) || state.pending.has(key)) return;
	registerSyncShutdownHooks();
	void startSyncEngine(key).catch((error: unknown) => {
		console.error(
			"[sync-engine] background start failed:",
			error instanceof Error ? error.message : error,
		);
	});
}
