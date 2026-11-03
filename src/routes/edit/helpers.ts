import { fetchJson } from "#/hooks/use-cached-fetch";
import { cmsKeys } from "../cms-keys";

export type Frontmatter = Record<string, unknown>;

export interface MediaItem {
	path: string;
}

export interface EntryRef {
	fp: string;
	rowFrag: string | null;
}

export function parseEntryRef(filePath: string): EntryRef {
	const hashAt = filePath.indexOf("#");
	if (hashAt < 0) return { fp: filePath, rowFrag: null };
	return { fp: filePath.slice(0, hashAt), rowFrag: filePath.slice(hashAt + 1) || null };
}

export function slugStem(fp: string): string {
	return (
		fp
			.split("/")
			.pop()
			?.replace(/\.(md|mdx|json|ts)$/u, "") ?? ""
	);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function asStringList(value: unknown): string[] {
	if (!Array.isArray(value)) return [];
	return value.filter((entry): entry is string => typeof entry === "string");
}

export function asStringMap(value: unknown): Record<string, unknown> {
	return isRecord(value) ? value : {};
}

export interface SaveEntryResponse {
	diff?: string;
	mtime: number;
	path: string;
	warnings?: string[];
}

export interface SaveEntryInput {
	body: string;
	collection?: string;
	force: boolean;
	fp: string;
	frontmatter: Frontmatter;
	mtime: number;
}

export function putEntry(input: SaveEntryInput): Promise<SaveEntryResponse> {
	return fetchJson<SaveEntryResponse>(cmsKeys.entryBase, {
		body: JSON.stringify({
			force: input.force,
			payload: { body: input.body, frontmatter: input.frontmatter, mtime: input.mtime },
			ref: { collection: input.collection, path: input.fp },
		}),
		headers: { "Content-Type": "application/json" },
		method: "PUT",
	});
}

export async function fetchEntryDiff(fp: string): Promise<string> {
	const json = await fetchJson<{ diff?: string }>(cmsKeys.diff(fp));
	return json.diff ?? "";
}

export async function duplicateEntry(fp: string): Promise<string> {
	const json = await fetchJson<{ path: string }>(cmsKeys.duplicate, {
		body: JSON.stringify({ path: fp }),
		headers: { "Content-Type": "application/json" },
		method: "POST",
	});
	return json.path;
}

export async function renameEntry(path: string, newSlug: string): Promise<string> {
	const json = await fetchJson<{ path: string }>(cmsKeys.rename, {
		body: JSON.stringify({ newSlug, path }),
		headers: { "Content-Type": "application/json" },
		method: "POST",
	});
	return json.path;
}

export async function deleteEntry(path: string, rowId?: string): Promise<string> {
	const json = await fetchJson<{ trashPath: string }>(cmsKeys.entryBase, {
		body: JSON.stringify({ path, rowId: rowId ?? undefined }),
		headers: { "Content-Type": "application/json" },
		method: "DELETE",
	});
	return json.trashPath;
}

export interface AiSuggestResponse {
	suggestions: string[];
}

export function requestAiSuggest(
	action: "excerpt" | "titles",
	body: string,
	frontmatter: Frontmatter,
): Promise<AiSuggestResponse> {
	return fetchJson<AiSuggestResponse>(cmsKeys.seoAi, {
		body: JSON.stringify({ action, body, frontmatter }),
		headers: { "Content-Type": "application/json" },
		method: "POST",
	});
}
