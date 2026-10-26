import { execFileSync } from "node:child_process";
import { promises as fs, readFileSync, statSync } from "node:fs";
import path from "node:path";

export const ASTRO_CONFIG_NAMES = [
	"astro.config.cjs",
	"astro.config.js",
	"astro.config.mjs",
	"astro.config.mts",
	"astro.config.ts",
] as const;

export function isDirectorySync(dir: string): boolean {
	try {
		return statSync(dir).isDirectory();
	} catch {
		return false;
	}
}

export function isAstroProjectSync(root: string): boolean {
	for (const name of ASTRO_CONFIG_NAMES) {
		try {
			const stat = statSync(path.join(root, name));
			if (stat.isFile()) return true;
		} catch {
			/* ignore */
		}
	}
	return false;
}

export async function isAstroProject(root: string): Promise<boolean> {
	for (const name of ASTRO_CONFIG_NAMES) {
		try {
			const stat = await fs.stat(path.join(root, name));
			if (stat.isFile()) return true;
		} catch {
			/* ignore */
		}
	}
	return false;
}

export async function readProjectName(root: string): Promise<string> {
	try {
		const raw = await fs.readFile(path.join(root, "package.json"), "utf8");
		const parsed = JSON.parse(raw) as { name?: unknown };
		if (typeof parsed.name === "string" && parsed.name.trim()) return parsed.name.trim();
	} catch {
		/* ignore */
	}
	return path.basename(root);
}

export function readPackageVersionSync(root: string): string {
	try {
		const raw = readFileSync(path.join(root, "package.json"), "utf8");
		const parsed = JSON.parse(raw) as { version?: unknown };
		if (typeof parsed.version === "string" && parsed.version.trim().length > 0)
			return parsed.version.trim();
	} catch {
		/* ignore */
	}
	return "unknown";
}

export function readGitBranch(root: string): string {
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
