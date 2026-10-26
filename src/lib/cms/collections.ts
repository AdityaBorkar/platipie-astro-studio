// §5 + §8 — collections discovery, counts, drift. Server-only.
import { existsSync, promises as fs } from "node:fs";
import path from "node:path";

import { getProjectRoot, resolveRepoPath } from "./config.ts";
import { parseFileContent } from "./frontmatter.ts";
import type { CollectionId } from "./schemas.ts";

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
	// repo-relative path
	path: string;
	title?: string;
	mtime: number;
}

function isTemplateName(name: string): boolean {
	// Exclude `-template*` from lists (§5). Covers `-template.md.` oddity too.
	return name.startsWith("-template");
}

async function listMdDir(dirRel: string, collection: CollectionId): Promise<EntrySummary[]> {
	const dir = resolveRepoPath(dirRel);
	let names: string[];
	try {
		names = await fs.readdir(dir);
	} catch {
		return [];
	}
	const candidates = names
		.toSorted()
		.filter((name) => !isTemplateName(name) && (name.endsWith(".md") || name.endsWith(".mdx")));
	// Collections are small, so stat+read every candidate concurrently.
	// Promise.all preserves input order, keeping the sorted-by-name order.
	const rows = await Promise.all(
		candidates.map(async (name): Promise<EntrySummary | null> => {
			const abs = path.join(dir, name);
			let st: { mtimeMs: number; isFile(): boolean };
			try {
				st = await fs.stat(abs);
				if (!st.isFile()) return null;
			} catch {
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
		}),
	);
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
	} catch {
		return [];
	}
}

async function listLegal(): Promise<EntrySummary[]> {
	const dir = resolveRepoPath("src/pages/legal");
	let names: string[] = [];
	try {
		names = await fs.readdir(dir);
	} catch {
		return [];
	}
	const out: EntrySummary[] = [];
	for (const name of names.toSorted()) {
		if (!name.endsWith(".mdx")) continue;
		const abs = path.join(dir, name);
		try {
			const st = await fs.stat(abs);
			if (!st.isFile()) continue;
			out.push({
				collection: "legal",
				id: name.replace(/\.mdx$/u, ""),
				mtime: st.mtimeMs,
				path: `src/pages/legal/${name}`,
				title: name,
			});
		} catch {
			continue;
		}
	}
	return out;
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
	} catch {
		return [];
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
			// Only `legal` uses mdx today, and it skips frontmatter parsing.
			return listLegal();
		case "ts":
			// Only `settings` uses ts today (single constants file, not a dir).
			return listSettings();
	}
}

export async function collectionCounts(): Promise<Record<CollectionId, number>> {
	const ids = COLLECTIONS.map((meta) => meta.id);
	const counts = await Promise.all(
		ids.map(async (id) => [id, (await listEntries(id)).length] as const),
	);
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
	// 1. Testimonials `project` drift.
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
	} catch {
		/* ignore */
	}
	// 2. -template oddity.
	try {
		const names = await fs.readdir(resolveRepoPath("cms/projects")).catch(() => [] as string[]);
		const odd = names.filter((n) => n.startsWith("-template"));
		if (odd.length > 0) {
			out.push({
				code: "template-oddity",
				hint: "Offered as “Project template” on create; rename to remove trailing dot in the Astro repo.",
				message: `Found template file(s): ${odd.join(", ")} — hidden from lists`,
			});
		}
	} catch {
		/* ignore */
	}
	// 3. Missing blog routes.
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
	} catch {
		/* ignore */
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
