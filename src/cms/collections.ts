import { existsSync, promises as fs } from "node:fs";
import path from "node:path";

import { getProjectRoot, resolveRepoPath } from "./config.ts";
import { parseFileContent } from "./frontmatter.ts";
import { mapChunked } from "./fs-walk.ts";
import type { CollectionId } from "./schemas.ts";
import { listSitePages } from "./workspace.ts";

export interface CollectionMeta {
	id: CollectionId;
	label: string;
	source: string;
	kind: "md" | "json" | "mdx" | "ts";
}

export const COLLECTIONS: CollectionMeta[] = [
	{ id: "projects", kind: "md", label: "Projects", source: "cms/projects" },
	{ id: "blog", kind: "md", label: "Blog", source: "cms/blog" },
	{ id: "clients", kind: "json", label: "Clients", source: "cms/clients.json" },
	{ id: "mockups", kind: "json", label: "Mockups", source: "cms/mockups.json" },
	{ id: "testimonials", kind: "json", label: "Testimonials", source: "cms/testimonials.json" },
	{ id: "legal", kind: "mdx", label: "Legal", source: "src/pages/legal" },
	{ id: "settings", kind: "ts", label: "Settings", source: "cms/constants.ts" },
];

export interface EntrySummary {
	id: string;
	collection: CollectionId;
	path: string;
	title?: string;
	mtime: number;
}

function isTemplateName(name: string): boolean {
	// Covers "-template.md." oddity.
	return name.startsWith("-template");
}

async function listMdDir(dirRel: string, collection: CollectionId): Promise<EntrySummary[]> {
	const dir = resolveRepoPath(dirRel);
	let names: string[];
	try {
		names = await fs.readdir(dir);
	} catch (e) {
		// Only a missing dir is empty; EACCES/ENOSPC must surface.
		if ((e as NodeJS.ErrnoException)?.code === "ENOENT") return [];
		throw e;
	}
	const candidates = names
		.toSorted()
		.filter((name) => !isTemplateName(name) && (name.endsWith(".md") || name.endsWith(".mdx")));
	// Bounded parallelism: 5k-file dirs must not exhaust fds (see fs-walk mapChunked).
	const rows = await mapChunked(candidates, async (name): Promise<EntrySummary | null> => {
		const abs = path.join(dir, name);
		let st: { mtimeMs: number; isFile(): boolean };
		try {
			st = await fs.stat(abs);
			if (!st.isFile()) return null;
		} catch (e) {
			if ((e as NodeJS.ErrnoException)?.code === "ENOENT") return null;
			console.warn(`[collections] stat failed for ${abs}: ${(e as Error).message}`);
			return null;
		}
		const id = name.replace(/\.(md|mdx)$/u, "");
		let title: string | undefined;
		try {
			const text = await fs.readFile(abs, "utf8");
			const parsed = parseFileContent(text);
			title = typeof parsed.frontmatter.title === "string" ? parsed.frontmatter.title : id;
		} catch {
			title = id;
		}
		return { collection, id, mtime: st.mtimeMs, path: `${dirRel}/${name}`, title };
	});
	return rows.filter((row): row is EntrySummary => row !== null);
}

async function listJsonRows(fileRel: string, collection: CollectionId): Promise<EntrySummary[]> {
	const abs = resolveRepoPath(fileRel);
	try {
		const text = await fs.readFile(abs, "utf8");
		const arr = JSON.parse(text);
		if (!Array.isArray(arr)) return [];
		const st = await fs.stat(abs);
		return arr.map((row: unknown, i: number) => {
			const r = (row ?? {}) as Record<string, unknown>;
			const id = typeof r.id === "string" ? r.id : String(i);
			return { collection, id, mtime: st.mtimeMs, path: `${fileRel}#${id}`, title: id };
		});
	} catch (e) {
		// Only a missing file is empty; corrupt JSON / EACCES must surface.
		if ((e as NodeJS.ErrnoException)?.code === "ENOENT") return [];
		throw e;
	}
}

async function listLegal(): Promise<EntrySummary[]> {
	// Maps over the single listSitePages enumerator instead of re-walking legal/.
	const sitePages = await listSitePages(getProjectRoot()).catch(() => []);
	return sitePages
		.filter((page) => page.path.startsWith("src/pages/legal/") && page.path.endsWith(".mdx"))
		.map((page) => ({
			collection: "legal" as const,
			id: path.basename(page.path, ".mdx"),
			mtime: page.mtime,
			path: page.path,
			title: path.basename(page.path),
		}))
		.toSorted((a, b) => a.id.localeCompare(b.id));
}

async function listSettings(): Promise<EntrySummary[]> {
	try {
		const st = await fs.stat(resolveRepoPath("cms/constants.ts"));
		return [
			{
				collection: "settings",
				id: "constants",
				mtime: st.mtimeMs,
				path: "cms/constants.ts",
				title: "Site constants",
			},
		];
	} catch (e) {
		if ((e as NodeJS.ErrnoException)?.code === "ENOENT") return [];
		throw e;
	}
}

export function listEntries(collection: CollectionId): Promise<EntrySummary[]> {
	const meta = COLLECTIONS.find((entry) => entry.id === collection);
	if (!meta) return Promise.resolve([]);
	switch (meta.kind) {
		case "json":
			return listJsonRows(meta.source, collection);
		case "md":
			return listMdDir(meta.source, collection);
		case "mdx":
			return listLegal();
		case "ts":
			return listSettings();
	}
}

export async function collectionCounts(): Promise<Record<CollectionId, number>> {
	const ids = COLLECTIONS.map((meta) => meta.id);
	const counts = await mapChunked(ids, async (id) => [id, (await listEntries(id)).length] as const);
	return Object.fromEntries(counts) as Record<CollectionId, number>;
}

export interface DriftWarning {
	code: string;
	message: string;
	hint?: string;
}

export async function driftWarnings(): Promise<DriftWarning[]> {
	const out: DriftWarning[] = [];
	const root = getProjectRoot();
	try {
		const t = await fs.readFile(resolveRepoPath("cms/testimonials.json"), "utf8");
		const arr = JSON.parse(t);
		if (
			Array.isArray(arr) &&
			arr.some((r) => r && typeof r === "object" && "project" in (r as object))
		) {
			out.push({
				code: "testimonials-project-drift",
				hint: "Preserved via passthrough; consider updating Astro schema.",
				message: "testimonials.json has `project` key missing from Zod schema",
			});
		}
	} catch (e) {
		if ((e as NodeJS.ErrnoException)?.code !== "ENOENT")
			console.warn(`[drift] testimonials check: ${(e as Error).message}`);
	}
	try {
		const names = await fs.readdir(resolveRepoPath("cms/projects")).catch((e: unknown) => {
			if ((e as NodeJS.ErrnoException)?.code === "ENOENT") return [] as string[];
			throw e;
		});
		const odd = names.filter((n) => n.startsWith("-template"));
		if (odd.length > 0) {
			out.push({
				code: "template-oddity",
				hint: "Offered as “Project template” on create; rename to remove trailing dot in the Astro repo.",
				message: `Found template file(s): ${odd.join(", ")} — hidden from lists`,
			});
		}
	} catch (e) {
		if ((e as NodeJS.ErrnoException)?.code !== "ENOENT") throw e;
	}
	try {
		const candidates = ["src/pages/blog", "src/pages/writings", "src/pages/craft"];
		const missing = candidates.filter((c) => !existsSync(path.join(root, c)));
		if (missing.length >= 2) {
			out.push({
				code: "blog-route-missing",
				hint: "Route creation stays in the Astro repo. Previews fall back to local render.",
				message:
					"No blog/writings/craft route renders cms/blog/ (NAV links have no matching pages)",
			});
		}
	} catch (e) {
		console.warn(`[drift] blog-route check: ${(e as Error).message}`);
	}
	return out;
}

export async function recentEdits(limit = 20): Promise<EntrySummary[]> {
	const lists = await Promise.all(
		(["projects", "blog", "legal"] as CollectionId[]).map((id) => listEntries(id)),
	);
	return lists
		.flat()
		.toSorted((a, b) => b.mtime - a.mtime)
		.slice(0, limit);
}
