// Filesystem project discovery for the workspace switcher. Server-only.
import { execFileSync } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import { getProjectRoot } from "./config.ts";
import { cmsError } from "./errors.ts";
import { getWorkspace } from "./workspace.ts";
import type { Workspace } from "./workspace.ts";

export interface ProjectInfo {
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

const ASTRO_CONFIG_NAMES = [
	"astro.config.mjs",
	"astro.config.mts",
	"astro.config.ts",
	"astro.config.js",
	"astro.config.cjs",
] as const;

const FAVICON_CANDIDATES = [
	{ file: "public/favicon.svg", mime: "image/svg+xml" },
	{ file: "public/favicon.ico", mime: "image/x-icon" },
	{ file: "public/favicon.png", mime: "image/png" },
	{ file: "public/icon.svg", mime: "image/svg+xml" },
	{ file: "public/icon.png", mime: "image/png" },
	{ file: "src/assets/favicon.svg", mime: "image/svg+xml" },
] as const;

const MAX_FAVICON_BYTES = 256 * 1024;
const MAX_BROWSE_ENTRIES = 300;
const PROJECTS_FILE = "projects.json";

/** `.data/projects.json` (or alongside `CMS_DB_PATH`) remembers user-added roots. */
function projectsFilePath(): string {
	const dbPath = process.env.CMS_DB_PATH?.trim();
	const dir = dbPath ? path.dirname(path.resolve(dbPath)) : path.resolve(process.cwd(), ".data");
	return path.join(dir, PROJECTS_FILE);
}

async function readRememberedRoots(): Promise<string[]> {
	try {
		const raw = await fs.readFile(projectsFilePath(), "utf8");
		const parsed = JSON.parse(raw) as { roots?: unknown };
		if (!Array.isArray(parsed.roots)) return [];
		return parsed.roots
			.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
			.map((entry) => path.resolve(entry));
	} catch {
		return [];
	}
}

async function rememberRoot(root: string): Promise<void> {
	const roots = new Set(await readRememberedRoots());
	const resolved = path.resolve(root);
	if (roots.has(resolved)) return;
	roots.add(resolved);
	const file = projectsFilePath();
	await fs.mkdir(path.dirname(file), { recursive: true });
	const tmp = `${file}.tmp-${Date.now()}`;
	await fs.writeFile(tmp, `${JSON.stringify({ roots: [...roots].toSorted() }, null, 2)}\n`, "utf8");
	await fs.rename(tmp, file);
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

function displayPathFor(root: string): string {
	const home = os.homedir();
	if (root === home) return "~";
	if (root.startsWith(`${home}/`)) return `~${root.slice(home.length)}`;
	return root;
}

async function readFavicon(root: string): Promise<string | null> {
	for (const candidate of FAVICON_CANDIDATES) {
		try {
			const abs = path.join(root, candidate.file);
			const stat = await fs.stat(abs);
			if (!stat.isFile() || stat.size > MAX_FAVICON_BYTES) continue;
			const bytes = await fs.readFile(abs);
			return `data:${candidate.mime};base64,${bytes.toString("base64")}`;
		} catch {
			// Try the next candidate.
		}
	}
	return null;
}

export async function isAstroProject(root: string): Promise<boolean> {
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

export async function listProjects(): Promise<ProjectInfo[]> {
	const current = path.resolve(getProjectRoot());
	const parent = path.dirname(current);
	const [names, remembered] = await Promise.all([
		fs.readdir(parent).catch(() => [] as string[]),
		readRememberedRoots(),
	]);
	const roots = new Set<string>(remembered);
	for (const name of names.toSorted()) {
		if (name.startsWith(".")) continue;
		const abs = path.resolve(parent, name);
		try {
			const stat = await fs.stat(abs);
			if (!stat.isDirectory()) continue;
		} catch {
			continue;
		}
		roots.add(abs);
	}
	roots.add(current);

	const projects = await Promise.all(
		[...roots].map(async (root) => {
			// Only Astro projects are offered in the switcher.
			if (!(await isAstroProject(root))) return null;
			const [name, branch, favicon] = await Promise.all([
				readProjectName(root),
				readBranch(root),
				readFavicon(root),
			]);
			return {
				branch,
				current: root === current,
				displayPath: displayPathFor(root),
				favicon,
				name,
				root,
			} satisfies ProjectInfo;
		}),
	);
	return projects
		.filter((project): project is ProjectInfo => project !== null)
		.toSorted((a, b) => Number(b.current) - Number(a.current) || a.name.localeCompare(b.name));
}

/** Folder-picker view: directories under `input` plus quick places. */
export async function browseDirectory(input?: string): Promise<BrowseView> {
	const home = os.homedir();
	const target = path.resolve(input?.trim() || home);
	const stat = await fs.stat(target).catch(() => null);
	if (!stat || !stat.isDirectory()) {
		throw cmsError("NOT_FOUND", `Not a folder: ${target}`, 404);
	}

	const names = await fs.readdir(target).catch(() => {
		throw cmsError("IO", `Cannot read folder: ${target}`, 400);
	});
	const folders: string[] = [];
	for (const name of names.toSorted()) {
		if (name.startsWith(".") || name === "node_modules") continue;
		const abs = path.join(target, name);
		const entryStat = await fs.stat(abs).catch(() => null);
		if (entryStat?.isDirectory()) folders.push(name);
	}

	const entries = await Promise.all(
		folders.slice(0, MAX_BROWSE_ENTRIES).map(async (name) => {
			const abs = path.join(target, name);
			return {
				isAstro: await isAstroProject(abs),
				name,
				path: abs,
			} satisfies BrowseFolder;
		}),
	);
	const parent = path.dirname(target);
	const places: BrowsePlace[] = [
		{ label: "Home", path: home },
		{ label: "Current project", path: getProjectRoot() },
	];
	return {
		displayPath: displayPathFor(target),
		entries,
		isAstro: await isAstroProject(target),
		name: path.basename(target) || target,
		parent: parent === target ? null : parent,
		path: target,
		places,
		truncated: folders.length > MAX_BROWSE_ENTRIES,
	};
}

export async function selectProject(root: string): Promise<Workspace> {
	const resolved = path.resolve(root);
	const stat = await fs.stat(resolved).catch(() => null);
	if (!stat || !stat.isDirectory()) throw cmsError("VALIDATION", `Not a directory: ${root}`, 400);
	if (!(await isAstroProject(resolved))) {
		throw cmsError("VALIDATION", "Not an Astro project (astro.config.* missing)", 400);
	}
	// Single-user local server: point the PROJECT_PATH jail at the new workspace.
	process.env.PROJECT_PATH = resolved;
	await rememberRoot(resolved);
	return getWorkspace();
}
