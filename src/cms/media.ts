import { promises as fs } from "node:fs";
import path from "node:path";

import {
	MEDIA_TYPES,
	ALLOWED_IMAGE_MIME,
	IMAGE_EXTS,
	MAX_UPLOAD_BYTES,
	getProjectRoot,
	resolveRepoPath,
} from "./config.ts";
import { CmsError } from "./errors.ts";
import { walkDir } from "./fs-walk.ts";

export interface MediaItem {
	path: string;
	url: string;
	size: number;
	mtime: number;
}

// Servable images + videos, derived from MEDIA_TYPES so the picker never
// drifts from what the media route will serve.
const LISTABLE_EXTS = new Set(
	Object.entries(MEDIA_TYPES)
		.filter(([, mime]) => mime.startsWith("image/") || mime.startsWith("video/"))
		.map(([ext]) => ext),
);

// Reverse map derived from MEDIA_TYPES (single source; no hand duplication).
const MIME_TO_EXT = new Map<string, string>(
	Object.entries(MEDIA_TYPES).filter(([, mime]) => ALLOWED_IMAGE_MIME.has(mime)),
);

async function walkMedia(absDir: string, repoPrefix: string, out: MediaItem[]): Promise<void> {
	const entries = await walkDir(absDir, repoPrefix);
	for (const entry of entries) {
		if (!LISTABLE_EXTS.has(path.extname(entry.rel).toLowerCase())) continue;
		out.push({
			mtime: entry.mtime,
			path: entry.rel,
			size: entry.size,
			url: `/${entry.rel}`.replace(/^\/(assets|public)\//u, "/"),
		});
	}
}

export async function listMedia(): Promise<MediaItem[]> {
	const root = getProjectRoot();
	const out: MediaItem[] = [];
	await walkMedia(path.join(root, "assets"), "assets", out);
	await walkMedia(path.join(root, "public"), "public", out);
	// Dedupe for overlapping callers/symlinks so picker keys stay stable.
	const unique = new Map(out.map((item) => [item.path, item]));
	return [...unique.values()].toSorted((a, b) => a.path.localeCompare(b.path));
}

export function sanitizeFilename(name: string): string {
	const base = path.basename(name);
	return (
		base
			.toLowerCase()
			.replaceAll(/\s+/gu, "-")
			.replaceAll(/[^a-z0-9._-]/gu, "")
			.replaceAll(/-+/gu, "-")
			.slice(0, 120) || "upload"
	);
}

export function extForMime(mime: string, filename: string): string {
	const fromName = path.extname(filename).toLowerCase();
	if (IMAGE_EXTS.has(fromName)) return fromName;
	return MIME_TO_EXT.get(mime) ?? ".png";
}

/** Magic-number sniff of raster bytes; null when unrecognized. */
function sniffRasterMime(bytes: Uint8Array): string | null {
	if (
		bytes.length >= 8 &&
		bytes[0] === 0x89 &&
		bytes[1] === 0x50 &&
		bytes[2] === 0x4e &&
		bytes[3] === 0x47
	)
		return "image/png";
	if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
		return "image/jpeg";
	if (bytes.length >= 6 && new TextDecoder().decode(bytes.slice(0, 6)).startsWith("GIF8"))
		return "image/gif";
	if (
		bytes.length >= 12 &&
		new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" &&
		new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP"
	)
		return "image/webp";
	if (
		bytes.length >= 12 &&
		new TextDecoder().decode(bytes.slice(4, 8)) === "ftyp" &&
		new TextDecoder().decode(bytes.slice(8, 12)).includes("avif")
	)
		return "image/avif";
	return null;
}

/** SVG has no magic number: accept `<svg` or an XML prolog wrapping `<svg`. */
function sniffSvg(bytes: Uint8Array): boolean {
	const head = new TextDecoder().decode(bytes.slice(0, 1024)).trimStart().toLowerCase();
	return head.startsWith("<svg") || (head.startsWith("<?xml") && head.includes("<svg"));
}

export async function saveUpload(opts: {
	bytes: Uint8Array;
	filename: string;
	mime: string;
	slug?: string;
	dest?: "assets" | "public";
}): Promise<{ path: string; size: number }> {
	if (opts.bytes.length > MAX_UPLOAD_BYTES) {
		throw new CmsError("VALIDATION", `Upload exceeds ${MAX_UPLOAD_BYTES / 1024 / 1024} MB cap`, {
			status: 413,
		});
	}
	const ext = extForMime(opts.mime, opts.filename);
	if (!ALLOWED_IMAGE_MIME.has(opts.mime)) {
		// Allow svg by extension fallback only when the bytes sniff as svg/xml.
		if (!(ext === ".svg" && opts.mime.includes("svg") && sniffSvg(opts.bytes))) {
			throw new CmsError("VALIDATION", `MIME not allowed: ${opts.mime}`, { status: 400 });
		}
	} else if (ext === ".svg") {
		// Claimed svg MIME must still sniff as svg — blocks `*/*svg*` bypasses
		// that smuggle HTML/script payloads under an svg extension.
		if (!sniffSvg(opts.bytes)) {
			throw new CmsError("VALIDATION", "Upload does not look like SVG", { status: 400 });
		}
	} else {
		const sniffed = sniffRasterMime(opts.bytes);
		if (sniffed !== null && sniffed !== opts.mime) {
			throw new CmsError("VALIDATION", `Upload bytes look like ${sniffed}, not ${opts.mime}`, {
				status: 400,
			});
		}
	}
	const date = new Date().toISOString().slice(0, 10);
	const slugPart =
		(opts.slug ?? "upload")
			.toLowerCase()
			.replaceAll(/[^a-z0-9]+/gu, "-")
			.replaceAll(/^-+|-+$/gu, "")
			.slice(0, 40) || "upload";
	const clean = sanitizeFilename(opts.filename);
	const dest = opts.dest ?? "assets";
	const repoRel =
		dest === "public" ? `public/${clean}` : `assets/images/${slugPart}-${date}-${clean}`;
	const abs = resolveRepoPath(repoRel);
	await fs.mkdir(path.dirname(abs), { recursive: true });
	await fs.writeFile(abs, opts.bytes);
	return { path: repoRel, size: opts.bytes.length };
}
