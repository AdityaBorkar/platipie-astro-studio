import path from "node:path";

import { getProjectRoot } from "../config.ts";
import { startWatcher } from "./watcher.ts";
import type { WatcherHandle } from "./watcher.ts";

const GLOBAL_KEY = "__platipie_sync_engine__";

interface EngineState {
	handles: Map<string, WatcherHandle>;
	hooksRegistered: boolean;
	pending: Map<string, Promise<WatcherHandle>>;
}

function getState(): EngineState {
	// globalThis prevents HMR double-start.
	const store = globalThis as unknown as Record<string, EngineState | undefined>;
	let state = store[GLOBAL_KEY];
	if (!state) {
		state = { handles: new Map(), hooksRegistered: false, pending: new Map() };
		store[GLOBAL_KEY] = state;
	}
	return state;
}

function shutdownSyncEngines(): void {
	void stopAllSyncEngines().catch((error: unknown) => {
		console.error("[sync-engine] shutdown failed:", error instanceof Error ? error.message : error);
	});
}

export function isSyncDisabled(): boolean {
	const raw = (process.env.CMS_SYNC ?? "").trim().toLowerCase();
	return raw === "0" || raw === "false" || raw === "no" || raw === "off";
}

export function normalizeSyncRoot(root: string = getProjectRoot()): string {
	return path.resolve(root);
}

export function getActiveSyncRoots(): string[] {
	const state = getState();
	const roots = new Set<string>();
	for (const key of state.handles.keys()) roots.add(key);
	for (const key of state.pending.keys()) roots.add(key);
	return Array.from(roots).toSorted();
}

export function isSyncActive(root: string = getProjectRoot()): boolean {
	const key = normalizeSyncRoot(root);
	const state = getState();
	return state.handles.has(key) || state.pending.has(key);
}

export function registerSyncShutdownHooks(): void {
	const state = getState();
	if (state.hooksRegistered) return;
	state.hooksRegistered = true;
	process.once("SIGINT", shutdownSyncEngines);
	process.once("SIGTERM", shutdownSyncEngines);
	process.once("exit", shutdownSyncEngines);
}

export async function startSyncEngine(root: string = getProjectRoot()): Promise<WatcherHandle> {
	const key = normalizeSyncRoot(root);
	const state = getState();
	registerSyncShutdownHooks();
	const live = state.handles.get(key);
	if (live) return live;
	const inflight = state.pending.get(key);
	if (inflight) return inflight;
	// Generation token: if stopSyncEngine cancels the pending entry while
	// startWatcher is still in flight, the post-await check below closes the
	// orphan instead of publishing it into handles.
	let started!: Promise<WatcherHandle>;
	started = (async (): Promise<WatcherHandle> => {
		// No eviction: the engine supports many roots. Single-project policy
		// lives in selectProject, which stops the others before starting one.
		const handle = await startWatcher(key);
		if (state.pending.get(key) !== started) {
			await handle.close().catch(() => {});
			throw new Error(`[sync-engine] start for ${key} was cancelled`);
		}
		state.handles.set(key, handle);
		console.log(`[sync-engine] started for ${key}`);
		return handle;
	})();
	state.pending.set(key, started);
	try {
		return await started;
	} finally {
		if (state.pending.get(key) === started) state.pending.delete(key);
	}
}

export async function stopSyncEngine(root: string = getProjectRoot()): Promise<boolean> {
	const key = normalizeSyncRoot(root);
	const state = getState();
	const live = state.handles.get(key);
	state.handles.delete(key);
	// Cancel a pending start first so the post-await generation check in
	// startSyncEngine closes the orphan instead of publishing it.
	const inflight = state.pending.get(key);
	if (inflight) state.pending.delete(key);
	let stopped = inflight !== undefined;
	if (live) {
		await live.close();
		stopped = true;
	}
	if (inflight) {
		try {
			const orphan = await inflight;
			await orphan.close();
		} catch {
			// Cancelled starts reject; already-closed handles are no-ops.
		}
		stopped = true;
	}
	if (stopped) console.log(`[sync-engine] stopped ${key}`);
	return stopped;
}

export async function stopAllSyncEngines(): Promise<void> {
	const state = getState();
	for (const key of [...state.handles.keys(), ...state.pending.keys()]) {
		await stopSyncEngine(key);
	}
}

export async function restartSyncEngine(root: string = getProjectRoot()): Promise<WatcherHandle> {
	const key = normalizeSyncRoot(root);
	await stopSyncEngine(key);
	return startSyncEngine(key);
}

// Explicit startup entry point for the dev server plugin. Request handlers
// never boot the watcher implicitly — see orpc/handler.ts.
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
