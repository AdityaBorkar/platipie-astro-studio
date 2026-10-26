// §4 + §13 — runtime config + project jail. Server-only.
import { existsSync } from "node:fs";
import path from "node:path";

import { cmsError } from "./errors.ts";

export const DEFAULT_HOST = "127.0.0.1";
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

/** Canonical image extensions shared by media listing + sync scanners. */
export const IMAGE_EXTS = new Set([
	".png",
	".jpg",
	".jpeg",
	".webp",
	".gif",
	".svg",
	".avif",
	".ico",
]);

export function getProjectRoot(): string {
	const raw = process.env.PROJECT_PATH?.trim() || process.cwd();
	return path.resolve(raw);
}

export function getHost(): string {
	const host = (process.env.HOST ?? DEFAULT_HOST).trim();
	if (!host) return DEFAULT_HOST;
	return host;
}

/** Parse and validate a port string. Throws on anything outside 1-65535. */
export function parsePortStrict(raw: string): number {
	const port = Number(raw);
	if (!Number.isInteger(port) || port <= 0 || port > 65_535)
		throw new Error(`Invalid port: ${raw}`);
	return port;
}

/**
 * Resolve the listen port: explicit CLI flag wins, otherwise `PORT` env,
 * otherwise `DEFAULT_PORT`. Throws on an invalid `PORT` value so
 * misconfiguration fails loudly instead of silently falling back.
 */
export function resolvePort(cliPort?: number): number {
	if (cliPort !== undefined) return cliPort;
	const raw = process.env.PORT ?? String(DEFAULT_PORT);
	return parsePortStrict(raw);
}

/**
 * Safe port for status UI: falls back to DEFAULT_PORT instead of throwing.
 * Dual policy — `resolvePort` throws for CLI startup (fail loudly on
 * misconfiguration), while this wrapper stays total for `envStatus`.
 */
export function getPort(): number {
	try {
		return resolvePort();
	} catch {
		return DEFAULT_PORT;
	}
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

/** Resolve a repo-relative path under the project root. Rejects traversal outside jail. */
export function resolveRepoPath(repoRel: string): string {
	const root = getProjectRoot();
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
	const root = getProjectRoot();
	const rel = path.relative(root, path.resolve(abs));
	if (rel.startsWith("..") || path.isAbsolute(rel)) {
		throw cmsError("IO", `Path outside project: ${abs}`, 400);
	}
	return rel.replaceAll("\\", "/");
}

export function envStatus() {
	const projectRoot = getProjectRoot();
	return {
		aiEnabled: isAiEnabled(),
		astroUrl: getAstroUrl(),
		port: getPort(),
		projectReachable: existsSync(projectRoot),
		trashTtlDays: getTrashTtlDays(),
	};
}
