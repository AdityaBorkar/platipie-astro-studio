// Workspace identity + Astro page inventory for the app shell. Server-only.
import { execFileSync } from "node:child_process";
import { promises as fs } from "node:fs";
import type { Dirent } from "node:fs";
import path from "node:path";

import { getProjectRoot } from "./config.ts";

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
	// repo-relative path, e.g. src/pages/about/index.astro
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

async function readProjectName(root: string): Promise<string> {
	try {
		const raw = await fs.readFile(path.join(root, "package.json"), "utf8");
		const parsed = JSON.parse(raw) as { name?: unknown };
		if (typeof parsed.name === "string" && parsed.name.trim()) return parsed.name.trim();
	} catch {
		// Fall back to the directory name.
	}
	return path.basename(root);
}

function readBranch(root: string): string {
	try {
		const branch = execFileSync("git", ["-C", root, "rev-parse", "--abbrev-ref", "HEAD"], {
			encoding: "utf8",
			stdio: ["ignore", "pipe", "ignore"],
			timeout: 1500,
		}).trim();
		return branch === "HEAD" ? "detached" : branch || "unknown";
	} catch {
		return "unknown";
	}
}

function humanize(value: string): string {
	return value.replaceAll(/[-_]+/gu, " ").replaceAll(/\b\w/gu, (char) => char.toUpperCase());
}

function routeSegmentsFor(relativePath: string): string[] {
	const withoutExt = relativePath.replace(/\.(astro|js|md|mdx|ts)$/u, "");
	const segments = withoutExt.split("/").filter(Boolean);
	if (segments.at(-1) === "index") segments.pop();
	return segments.map((segment) => {
		const catchAll = /^\[\.\.\.([^\]]+)\]$/u.exec(segment);
		if (catchAll) return `*${catchAll[1]}`;
		const optionalCatchAll = /^\[\[\.\.\.([^\]]+)\]\]$/u.exec(segment);
		if (optionalCatchAll) return `*${optionalCatchAll[1]}`;
		const dynamic = /^\[([^\]]+)\]$/u.exec(segment);
		if (dynamic) return `:${dynamic[1]}`;
		return segment;
	});
}

/** 404/500 and endpoint files (API routes, robots.txt, sitemap.xml, …). */
function isUtilityPage(relativeFromPages: string, stem: string): boolean {
	if (stem === "404" || stem === "500") return true;
	if (stem.includes(".")) return true;
	return relativeFromPages.split("/").includes("api");
}

const EMAIL_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx"]);

const ASTRO_CONFIG_NAMES = [
	"astro.config.cjs",
	"astro.config.js",
	"astro.config.mjs",
	"astro.config.mts",
	"astro.config.ts",
] as const;

async function isAstroProject(root: string): Promise<boolean> {
	for (const name of ASTRO_CONFIG_NAMES) {
		try {
			const stat = await fs.stat(path.join(root, name));
			if (stat.isFile()) return true;
		} catch {
			// Try the next candidate.
		}
	}
	return false;
}

/** Count react-email templates under `<root>/src/emails` (optional upstream). */
async function countEmailFiles(dirAbs: string): Promise<number> {
	let entries: Dirent[];
	try {
		entries = await fs.readdir(dirAbs, { withFileTypes: true });
	} catch {
		return 0;
	}
	let count = 0;
	for (const entry of entries) {
		if (entry.name.startsWith(".")) continue;
		const abs = path.join(dirAbs, entry.name);
		if (entry.isDirectory()) {
			count += await countEmailFiles(abs);
			continue;
		}
		if (entry.isFile() && EMAIL_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
			count += 1;
		}
	}
	return count;
}

function titleFor(segments: string[], dynamic: boolean): string {
	const last = segments.at(-1);
	if (!last) return "Home";
	if (last === "404") return "404 Not Found";
	if (last === "500") return "500 Server Error";
	if (dynamic) {
		const parent = segments
			.toReversed()
			.find((segment) => !segment.startsWith(":") && !segment.startsWith("*"));
		return parent ? `${humanize(parent)} detail` : "Detail";
	}
	return humanize(last);
}

async function walkPages(root: string, dirAbs: string, out: SitePage[]): Promise<void> {
	let entries: Dirent[];
	try {
		entries = await fs.readdir(dirAbs, { withFileTypes: true });
	} catch {
		return;
	}
	for (const entry of entries.toSorted((a, b) => a.name.localeCompare(b.name))) {
		if (entry.name.startsWith("_") || entry.name.startsWith(".")) continue;
		const abs = path.join(dirAbs, entry.name);
		if (entry.isDirectory()) {
			await walkPages(root, abs, out);
			continue;
		}
		if (!entry.isFile()) continue;
		const ext = path.extname(entry.name).toLowerCase() as ".astro" | ".js" | ".md" | ".mdx" | ".ts";
		const type = PAGE_EXTENSIONS.get(ext);
		if (!type) continue;
		const stem = path.basename(entry.name, ext);
		const relativeFromPages = path
			.relative(path.join(root, "src/pages"), abs)
			.replaceAll("\\", "/");
		const utility = isUtilityPage(relativeFromPages, stem);
		// `.ts`/`.js` files are endpoints, so only keep the utility ones.
		if ((type === "ts" || type === "js") && !utility) continue;
		const segments = routeSegmentsFor(relativeFromPages);
		const dynamic = segments.some((segment) => segment.startsWith(":") || segment.startsWith("*"));
		const stat = await fs.stat(abs).catch(() => null);
		if (!stat) continue;
		out.push({
			kind: utility ? "utility" : dynamic ? "dynamic" : "static",
			mtime: stat.mtimeMs,
			path: `src/pages/${relativeFromPages}`,
			route: `/${segments.join("/")}`.replace(/\/$/u, "") || "/",
			title: titleFor(segments, dynamic),
			type,
		});
	}
}

export async function listSitePages(): Promise<SitePage[]> {
	const root = getProjectRoot();
	const pages: SitePage[] = [];
	await walkPages(root, path.join(root, "src/pages"), pages);
	return pages.toSorted((a, b) => a.route.localeCompare(b.route));
}

export async function getWorkspace(): Promise<Workspace> {
	const root = getProjectRoot();
	const reachable = await fs
		.stat(root)
		.then((stat) => stat.isDirectory())
		.catch(() => false);
	return {
		branch: reachable ? readBranch(root) : "unknown",
		emailCount: reachable ? await countEmailFiles(path.join(root, "src/emails")) : 0,
		isAstro: reachable ? await isAstroProject(root) : false,
		pages: reachable ? await listSitePages() : [],
		project: await readProjectName(root),
		reachable,
	};
}
