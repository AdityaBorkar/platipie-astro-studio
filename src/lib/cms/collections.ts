// §5 + §8 — collections discovery, counts, drift. Server-only.
import { existsSync, promises as fs } from "node:fs";
import path from "node:path";

import { getAstroRoot, resolveRepoPath } from "./config.ts";
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
	let names: string[] = [];
	try {
		names = await fs.readdir(dir);
	} catch {
		return [];
	}
	const out: EntrySummary[] = [];
	for (const name of names.toSorted()) {
		if (isTemplateName(name)) continue;
		if (!(name.endsWith(".md") || name.endsWith(".mdx"))) continue;
		const abs = path.join(dir, name);
		let st: { mtimeMs: number; isFile(): boolean };
		try {
			st = await fs.stat(abs);
			if (!st.isFile()) continue;
		} catch {
			continue;
		}
		const id = name.replace(/\.(md|mdx)$/u, "");
		let title: string | undefined;
		try {
			const text = await fs.readFile(abs, "utf8");
			const parsed = parseFileContent(text);
			if (typeof parsed.frontmatter.title === "string") title = parsed.frontmatter.title;
			else title = id;
		} catch {
			title = id;
		}
		out.push({ collection, id, mtime: st.mtimeMs, path: `${dirRel}/${name}`, title });
	}
	return out;
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

export async function listEntries(collection: CollectionId): Promise<EntrySummary[]> {
	switch (collection) {
		case "projects":
			return listMdDir("cms/projects", collection);
		case "blog":
			return listMdDir("cms/blog", collection);
		case "clients":
			return listJsonRows("cms/clients.json", collection);
		case "mockups":
			return listJsonRows("cms/mockups.json", collection);
		case "testimonials":
			return listJsonRows("cms/testimonials.json", collection);
		case "legal":
			return listLegal();
		case "settings":
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
}

export async function collectionCounts(): Promise<Record<CollectionId, number>> {
	const entries = await Promise.all([
		listEntries("projects"),
		listEntries("blog"),
		listEntries("clients"),
		listEntries("mockups"),
		listEntries("testimonials"),
		listEntries("legal"),
		listEntries("settings"),
	]);
	return {
		blog: entries[1].length,
		clients: entries[2].length,
		legal: entries[5].length,
		mockups: entries[3].length,
		projects: entries[0].length,
		settings: entries[6].length,
		testimonials: entries[4].length,
	};
}

export interface DriftWarning {
	code: string;
	message: string;
	hint?: string;
}

export async function driftWarnings(): Promise<DriftWarning[]> {
	const out: DriftWarning[] = [];
	const root = getAstroRoot();
	// 1. Unregistered blog.
	try {
		const cfgPath = existsSync(path.join(root, "src/content.config.ts"))
			? path.join(root, "src/content.config.ts")
			: path.join(root, "content.config.ts");
		const text = await fs.readFile(cfgPath, "utf8").catch(() => "");
		if (!/(const|let|var)\s+blog\b/u.test(text) || !text.includes("cms/blog")) {
			out.push({
				code: "blog-unregistered",
				hint: "Use Settings → Register blog collection (§5.1).",
				message: "Blog collection is not registered in content.config.ts",
			});
		}
		// Projects additive extension present?
		if (!text.includes("excerpt") || !text.includes("schemaType")) {
			out.push({
				code: "projects-extension-missing",
				hint: "Register blog collection also extends projects additively.",
				message: "Projects schema lacks WP-parity additive fields",
			});
		}
	} catch {
		/* ignore */
	}
	// 2. Testimonials `project` drift.
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
	// 3. -template oddity.
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
	// 4. Missing blog routes.
	try {
		const candidates = ["src/pages/blog", "src/pages/writings", "src/pages/craft"];
		const missing = candidates.filter((c) => !existsSync(path.join(root, c)));
		if (missing.length >= 2) {
			out.push({
				code: "blog-route-missing",
				hint: "CMS registers data layer only; route creation stays in the Astro repo. Previews fall back to local render.",
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
	const all: EntrySummary[] = [];
	for (const c of ["projects", "blog", "legal"] as CollectionId[]) {
		all.push(...(await listEntries(c)));
	}
	return all.toSorted((a, b) => b.mtime - a.mtime).slice(0, limit);
}
