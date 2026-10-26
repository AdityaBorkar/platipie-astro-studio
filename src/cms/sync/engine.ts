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
	// globalThis prevents HMR double-start.
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
	const started = (async (): Promise<WatcherHandle> => {
		state.current = key;
		// Single-project server: starting one root stops the others.
		const stale: WatcherHandle[] = [];
		for (const other of Array.from(state.handles.keys())) {
			if (other === key) continue;
			const handle = state.handles.get(other);
			state.handles.delete(other);
			if (handle) stale.push(handle);
		}
		// Each handle owns an independent watcher, so parallel close is safe.
		await Promise.all(stale.map((handle) => handle.close()));
		const handle = await startWatcher(key);
		if (state.current !== key) {
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

export async function stopAllSyncEngines(): Promise<void> {
	const state = getState();
	state.current = null;
	for (const key of [...state.handles.keys(), ...state.pending.keys()]) {
		await stopSyncEngine(key);
	}
}

export async function restartSyncEngine(root: string = getProjectRoot()): Promise<WatcherHandle> {
	const key = normalizeSyncRoot(root);
	await stopAllSyncEngines();
	return startSyncEngine(key);
}

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
