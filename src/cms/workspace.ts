import { promises as fs } from "node:fs";
import path from "node:path";

import { isAstroProject, readGitBranch, readProjectName } from "./astro-project.ts";
import { getProjectRoot } from "./config.ts";
import { walkDir } from "./fs-walk.ts";
import type { WalkEntry } from "./fs-walk.ts";
import { routeFor, titleFor } from "./route-utils.ts";

const PAGE_EXTENSIONS = new Map([
	[".astro", "astro"],
	[".js", "js"],
	[".md", "md"],
	[".mdx", "mdx"],
	[".ts", "ts"],
] as const);

export type SitePageKind = "dynamic" | "static" | "utility";

export interface SitePage {
	kind: SitePageKind;
	mtime: number;
	path: string;
	route: string;
	title: string;
	type: "astro" | "js" | "md" | "mdx" | "ts";
}

export interface Workspace {
	branch: string;
	emailCount: number;
	isAstro: boolean;
	pages: SitePage[];
	project: string;
	reachable: boolean;
}

function isUtilityPage(relativeFromPages: string, stem: string): boolean {
	if (stem === "404" || stem === "500") return true;
	if (stem.includes(".")) return true;
	return relativeFromPages.split("/").includes("api");
}

const EMAIL_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx"]);

// Single source for email file enumeration; the sync scanner maps over this.
export async function listEmailFiles(root: string = getProjectRoot()): Promise<WalkEntry[]> {
	const entries = await walkDir(path.join(root, "src/emails"), "src/emails");
	return entries.filter((entry) => EMAIL_EXTENSIONS.has(path.extname(entry.rel).toLowerCase()));
}

async function walkPages(root: string, dirAbs: string, out: SitePage[]): Promise<void> {
	const baseRel = path.relative(root, dirAbs).replaceAll("\\", "/");
	const entries = await walkDir(dirAbs, baseRel);
	for (const entry of entries.toSorted((a, b) => a.rel.localeCompare(b.rel))) {
		const ext = path.extname(entry.rel).toLowerCase() as ".astro" | ".js" | ".md" | ".mdx" | ".ts";
		const type = PAGE_EXTENSIONS.get(ext);
		if (!type) continue;
		const stem = path.basename(entry.rel, ext);
		const relativeFromPages = path
			.relative(path.join(root, "src/pages"), entry.abs)
			.replaceAll("\\", "/");
		const utility = isUtilityPage(relativeFromPages, stem);
		// `.ts`/`.js` files are endpoints, so only keep the utility ones.
		if ((type === "ts" || type === "js") && !utility) continue;
		const { dynamic, route } = routeFor(relativeFromPages);
		const segments = route === "/" ? [] : route.slice(1).split("/");
		out.push({
			kind: utility ? "utility" : dynamic ? "dynamic" : "static",
			mtime: entry.mtime,
			path: `src/pages/${relativeFromPages}`,
			route,
			title: titleFor(segments, dynamic),
			type,
		});
	}
}

// Single source for site page enumeration; the sync scanner maps over this.
export async function listSitePages(root: string = getProjectRoot()): Promise<SitePage[]> {
	const pages: SitePage[] = [];
	await walkPages(root, path.join(root, "src/pages"), pages);
	return pages.toSorted((a, b) => a.route.localeCompare(b.route));
}

export async function getWorkspace(root: string = getProjectRoot()): Promise<Workspace> {
	const resolved = path.resolve(root);
	const reachable = await fs
		.stat(resolved)
		.then((stat) => stat.isDirectory())
		.catch(() => false);
	return {
		branch: reachable ? readGitBranch(resolved) : "unknown",
		emailCount: reachable ? (await listEmailFiles(resolved)).length : 0,
		isAstro: reachable ? await isAstroProject(resolved) : false,
		pages: reachable ? await listSitePages(resolved) : [],
		project: await readProjectName(resolved),
		reachable,
	};
}
