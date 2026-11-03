import { useRouterState } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { fetchJson, useCachedFetch } from "#/hooks/use-cached-fetch";

export interface WorkspacePayload {
	branch: string;
	emailCount: number;
	isAstro?: boolean;
	pages: {
		kind: "dynamic" | "static" | "utility";
		path: string;
		route: string;
		title: string;
		type: string;
	}[];
	project: string;
	reachable: boolean;
}

export interface CollectionSummary {
	count: number;
	id: string;
	label: string;
	source: string;
}

export interface SyncScopeStatus {
	fileCount: number;
	lastSync: number | null;
	scope: string;
}

export interface ProjectEntry {
	branch: string;
	current: boolean;
	displayPath: string;
	favicon: string | null;
	name: string;
	root: string;
}

export interface BrowseFolder {
	isAstro: boolean;
	name: string;
	path: string;
}

export interface BrowsePlace {
	label: string;
	path: string;
}

export interface BrowseView {
	displayPath: string;
	entries: BrowseFolder[];
	isAstro: boolean;
	name: string;
	parent: string | null;
	path: string;
	places: BrowsePlace[];
	truncated: boolean;
}

/** Latest stamp across scopes; stale when any scope has no stamp. Never null-gated. */
export function overallLastSync(status: SyncScopeStatus[] | null): {
	lastSync: number | null;
	stale: boolean;
} {
	if (!status || status.length === 0) return { lastSync: null, stale: false };
	let lastSync: number | null = null;
	let stale = false;
	for (const entry of status) {
		if (entry.lastSync === null) {
			stale = true;
			continue;
		}
		if (lastSync === null || entry.lastSync > lastSync) lastSync = entry.lastSync;
	}
	return { lastSync, stale };
}

function fetchWorkspace(signal?: AbortSignal): Promise<WorkspacePayload> {
	return fetchJson<WorkspacePayload>("/api/cms/workspace", { signal });
}

function fetchCollections(signal?: AbortSignal): Promise<{ collections?: CollectionSummary[] }> {
	return fetchJson<{ collections?: CollectionSummary[] }>("/api/cms/collections", { signal });
}

function fetchSyncStatus(signal?: AbortSignal): Promise<{ status?: SyncScopeStatus[] }> {
	return fetchJson<{ status?: SyncScopeStatus[] }>("/api/cms/sync", { signal });
}

export function useWorkspace(): { error: string | null; workspace: WorkspacePayload | null } {
	const query = useCachedFetch("/api/cms/workspace", fetchWorkspace, {
		errorMessage: "Could not refresh workspace",
	});
	return { error: query.error, workspace: query.data };
}

export function useCollections(): { collections: CollectionSummary[]; error: string | null } {
	const query = useCachedFetch("/api/cms/collections", fetchCollections, {
		errorMessage: "Could not refresh collections",
	});
	return { collections: query.data?.collections ?? [], error: query.error };
}

export function useSyncStatus(): {
	resync: () => void;
	status: SyncScopeStatus[] | null;
	syncError: boolean;
	syncing: boolean;
} {
	const statusQuery = useCachedFetch("/api/cms/sync", fetchSyncStatus, {
		errorMessage: "Could not refresh sync status",
	});
	const [syncing, setSyncing] = useState(false);
	const refresh = statusQuery.refresh;

	const resync = useCallback(() => {
		setSyncing(true);
		void (async () => {
			try {
				await fetchJson("/api/cms/sync", {
					body: JSON.stringify({}),
					headers: { "Content-Type": "application/json" },
					method: "POST",
				});
				toast.success("Inventory re-synced");
				refresh();
			} catch (error: unknown) {
				toast.error(error instanceof Error ? error.message : "Re-sync failed");
			} finally {
				setSyncing(false);
			}
		})();
	}, [refresh]);

	return {
		resync,
		status: statusQuery.data?.status ?? null,
		syncError: statusQuery.error !== null,
		syncing,
	};
}

/** Current location hash (`""` or `"#section"`) straight from the router. No hashchange listener. */
export function useHash(): string {
	const hash = useRouterState({ select: (state) => state.location.hash });
	if (!hash) return "";
	return hash.startsWith("#") ? hash : `#${hash}`;
}
