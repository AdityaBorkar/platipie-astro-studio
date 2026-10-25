// §4 + §13 — runtime config + ASTRO_ROOT jail. Server-only.
import { existsSync } from "node:fs";
import path from "node:path";

import { cmsError } from "./errors.ts";

export const DEFAULT_PORT = 4000;
export const DEFAULT_TRASH_TTL_DAYS = 30;
// 10 MB default (§13)
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
// 1 MB read-only guard
export const LARGE_FILE_BYTES = 1024 * 1024;
export const ALLOWED_IMAGE_MIME = new Set([
	"image/png",
	"image/jpeg",
	"image/webp",
	"image/gif",
	"image/svg+xml",
	"image/avif",
]);

function defaultAstroRoot(): string {
	const sibling = "/home/aditya/repo/AdityaBorkar";
	if (existsSync(sibling)) return sibling;
	return process.cwd();
}

export function getAstroRoot(): string {
	const raw = process.env.ASTRO_ROOT?.trim() || defaultAstroRoot();
	return path.resolve(raw);
}

export function getPort(): number {
	const p = Number(process.env.PORT ?? DEFAULT_PORT);
	return Number.isFinite(p) && p > 0 ? p : DEFAULT_PORT;
}

export function getTrashTtlDays(): number {
	const v = Number(process.env.TRASH_TTL_DAYS ?? DEFAULT_TRASH_TTL_DAYS);
	return Number.isFinite(v) && v > 0 ? v : DEFAULT_TRASH_TTL_DAYS;
}

export function getAstroUrl(): string | null {
	const u = process.env.ASTRO_URL?.trim();
	return u ? u.replace(/\/$/u, "") : null;
}

export function isAiEnabled(): boolean {
	return Boolean(process.env.AI_API_KEY?.trim() && process.env.AI_BASE_URL?.trim());
}

export function getAiConfig(): { baseUrl: string; apiKey: string; model: string } | null {
	const baseUrl = process.env.AI_BASE_URL?.trim();
	const apiKey = process.env.AI_API_KEY?.trim();
	if (!baseUrl || !apiKey) return null;
	return {
		apiKey,
		baseUrl: baseUrl.replace(/\/$/u, ""),
		model: process.env.AI_MODEL?.trim() || "gpt-4o-mini",
	};
}

/** Resolve a repo-relative path under ASTRO_ROOT. Rejects traversal outside jail. */
export function resolveRepoPath(repoRel: string): string {
	const root = getAstroRoot();
	const cleaned = repoRel.replace(/^\/+/u, "");
	if (cleaned === "" || cleaned === ".") throw cmsError("IO", "Empty path", 400);
	const abs = path.resolve(root, cleaned);
	const rel = path.relative(root, abs);
	if (rel.startsWith("..") || path.isAbsolute(rel)) {
		throw cmsError("IO", `Path traversal rejected: ${repoRel}`, 400);
	}
	return abs;
}

/** Repo-relative form of an absolute path (throws if outside jail). */
export function toRepoRel(abs: string): string {
	const root = getAstroRoot();
	const rel = path.relative(root, path.resolve(abs));
	if (rel.startsWith("..") || path.isAbsolute(rel)) {
		throw cmsError("IO", `Path outside ASTRO_ROOT: ${abs}`, 400);
	}
	return rel.replaceAll("\\", "/");
}

export function envStatus() {
	const astroRoot = getAstroRoot();
	return {
		aiEnabled: isAiEnabled(),
		astroRoot,
		astroRootReachable: existsSync(astroRoot),
		astroUrl: getAstroUrl(),
		port: getPort(),
		trashTtlDays: getTrashTtlDays(),
	};
}
