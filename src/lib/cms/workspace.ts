// Workspace identity + Astro page inventory for the app shell. Server-only.
import { execFileSync } from "node:child_process";
import { promises as fs } from "node:fs";
import type { Dirent } from "node:fs";
import path from "node:path";

import { getAstroRoot } from "./config.ts";

const PAGE_EXTENSIONS = new Map([
	[".astro", "astro"],
	[".md", "md"],
	[".mdx", "mdx"],
] as const);

export interface SitePage {
	dynamic: boolean;
	mtime: number;
	// repo-relative path, e.g. src/pages/about/index.astro
	path: string;
	route: string;
	title: string;
	type: "astro" | "md" | "mdx";
}

export interface Workspace {
	branch: string;
	pages: SitePage[];
	project: string;
	reachable: boolean;
	root: string;
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
	const withoutExt = relativePath.replace(/\.(astro|md|mdx)$/u, "");
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

function titleFor(segments: string[], dynamic: boolean): string {
	const last = segments.at(-1);
	if (!last) return "Home";
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
		const ext = path.extname(entry.name).toLowerCase() as ".astro" | ".md" | ".mdx";
		const type = PAGE_EXTENSIONS.get(ext);
		if (!type) continue;
		const stem = path.basename(entry.name, ext);
		if (stem === "404" || stem === "500") continue;
		const relativeFromPages = path
			.relative(path.join(root, "src/pages"), abs)
			.replaceAll("\\", "/");
		const segments = routeSegmentsFor(relativeFromPages);
		const dynamic = segments.some((segment) => segment.startsWith(":") || segment.startsWith("*"));
		const stat = await fs.stat(abs).catch(() => null);
		if (!stat) continue;
		out.push({
			dynamic,
			mtime: stat.mtimeMs,
			path: `src/pages/${relativeFromPages}`,
			route: `/${segments.join("/")}`.replace(/\/$/u, "") || "/",
			title: titleFor(segments, dynamic),
			type,
		});
	}
}

export async function listSitePages(): Promise<SitePage[]> {
	const root = getAstroRoot();
	const pages: SitePage[] = [];
	await walkPages(root, path.join(root, "src/pages"), pages);
	return pages.toSorted((a, b) => a.route.localeCompare(b.route));
}

export async function getWorkspace(): Promise<Workspace> {
	const root = getAstroRoot();
	const reachable = await fs
		.stat(root)
		.then((stat) => stat.isDirectory())
		.catch(() => false);
	return {
		branch: reachable ? readBranch(root) : "unknown",
		pages: reachable ? await listSitePages() : [],
		project: await readProjectName(root),
		reachable,
		root,
	};
}
