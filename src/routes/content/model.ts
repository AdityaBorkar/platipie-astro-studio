import { toast } from "sonner";

import { fetchJson } from "#/hooks/use-cached-fetch";
import { cmsKeys } from "../cms-keys";

export interface CollectionSummary {
	count: number;
	id: string;
	label: string;
	source: string;
}

export interface RecentEntry {
	collection: string;
	id: string;
	mtime: number;
	path: string;
	title?: string;
}

export interface CollectionsResponse {
	collections: CollectionSummary[];
	counts: Record<string, number>;
	drift: { code: string; hint?: string; message: string }[];
	env: {
		aiEnabled: boolean;
		astroUrl: string | null;
		port: number;
		projectReachable: boolean;
		trashTtlDays: number;
	};
	recent: RecentEntry[];
}

export interface ContentIndex extends CollectionsResponse {
	entries: Record<string, RecentEntry[]>;
}

export interface LoadedEntry {
	body: string;
	frontmatter: Record<string, unknown>;
	hasFrontmatter: boolean;
	mtime: number;
	readOnly?: boolean;
	readOnlyReason?: string;
	ref: { collection: string; path: string };
}

export interface CollectionGroup {
	collection: CollectionSummary;
	entries: RecentEntry[];
}

export function fmStr(fm: Record<string, unknown> | undefined, key: string): string | null {
	if (!fm) return null;
	const value = fm[key];
	return typeof value === "string" && value.trim().length > 0 ? value : null;
}

export function entryExt(repoPath: string): string {
	const file = repoPath.split("#")[0] ?? "";
	const dot = file.lastIndexOf(".");
	return dot >= 0 ? file.slice(dot) : "";
}

export function entryKind(ext: string): string {
	if (ext === ".md" || ext === ".mdx") return "markdown";
	if (ext === ".json") return "json";
	if (ext === ".ts") return "ts";
	return ext.replace(/^\./u, "") || "file";
}

export function isPlainRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function rowForIndex(body: string, index: number): Record<string, unknown> | null {
	try {
		const parsed: unknown = JSON.parse(body);
		if (!Array.isArray(parsed)) return null;
		const candidate = parsed[index];
		return isPlainRecord(candidate) ? candidate : null;
	} catch {
		return null;
	}
}

export function formatValue(value: unknown): string {
	if (value === null || value === undefined) return "—";
	if (typeof value === "string") return value.trim().length > 0 ? value : "—";
	if (typeof value === "number" || typeof value === "boolean") return String(value);
	if (Array.isArray(value)) {
		if (value.length === 0) return "—";
		const scalar = value.every(
			(item) => typeof item === "string" || typeof item === "number" || typeof item === "boolean",
		);
		return scalar ? value.join(", ") : (JSON.stringify(value, null, 2) ?? "—");
	}
	if (typeof value === "object") return JSON.stringify(value, null, 2) ?? "—";
	return String(value);
}

function matchesNeedle(entry: RecentEntry, needle: string): boolean {
	return (
		entry.id.toLowerCase().includes(needle) ||
		(entry.title ?? "").toLowerCase().includes(needle) ||
		entry.path.toLowerCase().includes(needle)
	);
}

export function buildGroups(data: ContentIndex, needle: string): CollectionGroup[] {
	return data.collections
		.map((collection) => {
			const entries = data.entries[collection.id] ?? [];
			// Intent: a needle matching the collection label/source reveals ALL of
			// that collection's entries unfiltered, so users can browse the whole
			// collection once found. Entry-level filtering applies only when the
			// collection itself does not match.
			const collectionMatches =
				collection.label.toLowerCase().includes(needle) ||
				collection.source.toLowerCase().includes(needle);
			const visible =
				!needle || collectionMatches
					? entries
					: entries.filter((entry) => matchesNeedle(entry, needle));
			return { collection, entries: visible };
		})
		.filter((group) => !needle || group.entries.length > 0);
}

export function firstEntry(data: ContentIndex, collectionId?: string): RecentEntry | null {
	if (collectionId) {
		const entry = data.entries[collectionId]?.[0];
		if (entry) return entry;
	}
	for (const collection of data.collections) {
		const entry = data.entries[collection.id]?.[0];
		if (entry) return entry;
	}
	return null;
}

// Follow-up: prefer the single ?expand=entries query once the backend stabilizes it;
// until then, fan out per collection and surface partial failures instead of
// silently swallowing them.
export async function fetchContentIndex(): Promise<ContentIndex> {
	try {
		const expanded = await fetchJson<ContentIndex>(cmsKeys.contentIndex);
		if (expanded && typeof expanded.entries === "object" && expanded.entries !== null) {
			return expanded;
		}
	} catch {
		// Fall through to the per-collection fan-out below.
	}
	const base = await fetchJson<CollectionsResponse>(cmsKeys.collections);
	const settled = await Promise.allSettled(
		base.collections.map(async (collection) => {
			const json = await fetchJson<{ entries?: RecentEntry[] }>(cmsKeys.entries(collection.id));
			return { entries: json.entries ?? [], id: collection.id };
		}),
	);
	const entries: Record<string, RecentEntry[]> = {};
	const failed: string[] = [];
	for (let index = 0; index < settled.length; index += 1) {
		const result = settled[index];
		const id = base.collections[index]?.id ?? "unknown";
		if (result?.status === "fulfilled") {
			entries[result.value.id] = result.value.entries;
		} else {
			const message =
				result && result.reason instanceof Error ? result.reason.message : String(result);
			entries[id] = [];
			failed.push(`${id} (${message})`);
		}
	}
	if (failed.length > 0) {
		toast.warning(`Some collections failed to load: ${failed.join("; ")}`);
	}
	return { ...base, entries };
}
