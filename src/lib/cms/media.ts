// §10 — media: list assets/images/** + public/**, upload with caps/sanitize.
import { promises as fs } from "node:fs";
import path from "node:path";

import { ALLOWED_IMAGE_MIME, MAX_UPLOAD_BYTES, getProjectRoot, resolveRepoPath } from "./config.ts";
import { CmsError } from "./errors.ts";

const IMAGE_EXT = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".avif", ".ico"]);

export interface MediaItem {
	path: string;
	url: string;
	size: number;
	mtime: number;
}

async function walkImages(absDir: string, repoPrefix: string, out: MediaItem[]): Promise<void> {
	let names: string[];
	try {
		names = await fs.readdir(absDir);
	} catch {
		return;
	}
	for (const name of names) {
		const abs = path.join(absDir, name);
		const st = await fs.stat(abs).catch(() => null);
		if (!st) continue;
		if (st.isDirectory()) {
			await walkImages(abs, `${repoPrefix}/${name}`, out);
		} else if (IMAGE_EXT.has(path.extname(name).toLowerCase())) {
			out.push({
				mtime: st.mtimeMs,
				path: `${repoPrefix}/${name}`,
				size: st.size,
				url: `/${repoPrefix}/${name}`.replace(/^\/(assets|public)\//u, "/"),
			});
		}
	}
}

export async function listMedia(): Promise<MediaItem[]> {
	const root = getProjectRoot();
	const out: MediaItem[] = [];
	await walkImages(path.join(root, "assets/images"), "assets/images", out);
	await walkImages(path.join(root, "assets"), "assets", out).catch(() => {});
	await walkImages(path.join(root, "public"), "public", out);
	// `assets/` overlaps `assets/images/`, and callers may list public twice; one
	// path must map to one item so React keys and pickers stay stable.
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
	if (IMAGE_EXT.has(fromName)) return fromName;
	const map: Record<string, string> = {
		"image/avif": ".avif",
		"image/gif": ".gif",
		"image/jpeg": ".jpg",
		"image/png": ".png",
		"image/svg+xml": ".svg",
		"image/webp": ".webp",
	};
	return map[mime] ?? ".png";
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
			status: 400,
		});
	}
	if (!ALLOWED_IMAGE_MIME.has(opts.mime)) {
		// Allow by extension fallback for svg without mime.
		const ext = path.extname(opts.filename).toLowerCase();
		if (!(ext === ".svg" && opts.mime.includes("svg"))) {
			throw new CmsError("VALIDATION", `MIME not allowed: ${opts.mime}`, { status: 400 });
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
