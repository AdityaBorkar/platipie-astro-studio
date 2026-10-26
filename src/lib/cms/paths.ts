// XDG data paths for CMS server state (SQLite read-model + remembered projects).
// Server-only. `CMS_DB_PATH` still overrides the DB file; `CMS_DATA_DIR`
// overrides the directory; otherwise XDG (`XDG_DATA_HOME`) with per-OS fallbacks.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";

export const APP_DATA_DIR_NAME = "platipie-cms-dev";
const DB_FILE_NAME = "cms.db";
const PROJECTS_FILE_NAME = "projects.json";

/** Directory holding `cms.db` + `projects.json` (overridable via `CMS_DATA_DIR`). */
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

/** SQLite file for the sync read-model (`CMS_DB_PATH` wins when set). */
export function getDbPath(): string {
	const fromEnv = process.env.CMS_DB_PATH?.trim();
	if (fromEnv) return path.resolve(fromEnv);
	return path.join(getDataDir(), DB_FILE_NAME);
}

/** `projects.json` lives alongside the DB file (legacy: `<cwd>/.data`). */
export function getProjectsFilePath(): string {
	return path.join(path.dirname(getDbPath()), PROJECTS_FILE_NAME);
}

/** Pre-XDG location, kept as a one-time migration source (never written to). */
export function getLegacyDataDir(): string {
	return path.resolve(process.cwd(), ".data");
}

/**
 * One-time best-effort migration: copy `basename(target)` from the legacy
 * `<cwd>/.data` dir when the target is missing. No-op when they coincide.
 */
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
