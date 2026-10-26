// Filesystem project discovery for the workspace switcher. Server-only.
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import { isAstroProject, readGitBranch, readProjectName } from "./astro-project.ts";
import { getProjectRoot } from "./config.ts";
import { cmsError } from "./errors.ts";
import { getLegacyDataDir, getProjectsFilePath, migrateLegacyFileSync } from "./paths.ts";
import {
	isSyncDisabled,
	restartSyncEngine,
	stopAllSyncEngines,
	stopSyncEngine,
} from "./sync/engine.ts";
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

/** XDG data dir (`CMS_DATA_DIR`/`XDG_DATA_HOME`); `projects.json` sits beside `cms.db`. */
function projectsFilePath(): string {
	return getProjectsFilePath();
}

async function readRememberedRoots(): Promise<string[]> {
	migrateLegacyFileSync(projectsFilePath());
	for (const file of [projectsFilePath(), path.join(getLegacyDataDir(), "projects.json")]) {
		try {
			const raw = await fs.readFile(file, "utf8");
			const parsed = JSON.parse(raw) as { roots?: unknown };
			if (!Array.isArray(parsed.roots)) return [];
			return parsed.roots
				.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
				.map((entry) => path.resolve(entry));
		} catch {
			// Try the next candidate.
		}
	}
	return [];
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
				readGitBranch(root),
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
	// Opening a project starts its sync engine (stopping the previous one).
	// A sync failure must never fail the switch itself — the UI shows staleness.
	if (isSyncDisabled()) {
		await stopAllSyncEngines();
	} else {
		try {
			await restartSyncEngine(resolved);
		} catch (error) {
			console.error(
				`[sync-engine] failed to start for ${resolved}:`,
				error instanceof Error ? error.message : error,
			);
		}
	}
	return getWorkspace();
}

/** Stop the sync engine for `root` (project closed). Server-only. */
export function closeProjectSync(root: string = getProjectRoot()): Promise<boolean> {
	return stopSyncEngine(root);
}
