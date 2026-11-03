import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";

export const APP_DATA_DIR_NAME = "platipie-cms-dev";
const DB_FILE_NAME = "cms.db";
const PROJECTS_FILE_NAME = "projects.json";

let dbPathOverride: string | null = null;

// Explicit override for the SQLite file (sync CLI). Prefer this over mutating
// process.env so one-shot runs stay scoped and testable.
// Not safe for concurrent roots: the override is process-global. The server is
// single-project, so concurrent roots never happen outside the CLI one-shot.
export function setDbPathOverride(target: string | null): void {
	dbPathOverride = target ? path.resolve(target) : null;
}

export function getDataDir(): string {
	const fromEnv = process.env.CMS_DATA_DIR?.trim();
	if (fromEnv) return path.resolve(fromEnv);
	const xdg = process.env.XDG_DATA_HOME?.trim();
	if (xdg) return path.join(path.resolve(xdg), APP_DATA_DIR_NAME);
	const home = os.homedir();
	if (process.platform === "darwin") {
		return path.join(home, "Library", "Application Support", APP_DATA_DIR_NAME);
	}
	if (process.platform === "win32") {
		const local = process.env.LOCALAPPDATA?.trim();
		if (local) return path.join(path.resolve(local), APP_DATA_DIR_NAME);
	}
	return path.join(home, ".local", "share", APP_DATA_DIR_NAME);
}

export function getDbPath(): string {
	if (dbPathOverride) return dbPathOverride;
	const fromEnv = process.env.CMS_DB_PATH?.trim();
	if (fromEnv) return path.resolve(fromEnv);
	return path.join(getDataDir(), DB_FILE_NAME);
}

export function getProjectsFilePath(): string {
	// The projects registry lives with the data dir, NOT next to the --db
	// override: a one-shot `--db=/tmp/x.db` run must not relocate (or orphan)
	// the remembered-roots registry. CMS_DB_PATH still relocates it, since the
	// data dir follows XDG/CMS_DATA_DIR while the db env var is explicit.
	if (dbPathOverride) return path.join(getDataDir(), PROJECTS_FILE_NAME);
	return path.join(path.dirname(getDbPath()), PROJECTS_FILE_NAME);
}

/** Pre-XDG location, kept as a one-time migration source (never written to). */
export function getLegacyDataDir(): string {
	return path.resolve(process.cwd(), ".data");
}

export function migrateLegacyFileSync(target: string): void {
	const legacy = path.join(getLegacyDataDir(), path.basename(target));
	if (path.resolve(target) === path.resolve(legacy)) return;
	if (existsSync(target) || !existsSync(legacy)) return;
	try {
		mkdirSync(path.dirname(target), { recursive: true });
		copyFileSync(legacy, target);
	} catch {
		// Best effort — the caller proceeds with a fresh file.
	}
}
