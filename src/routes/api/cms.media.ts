import path from "node:path";

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { MEDIA_TYPES, MAX_UPLOAD_BYTES, resolveRepoPath } from "#/cms/config.ts";
import { jsonError } from "#/cms/errors.ts";
import { listMedia, saveUpload } from "#/cms/media.ts";

const destSchema = z.enum(["assets", "public"]);

function parseRange(header: string | null, size: number): { end: number; start: number } | null {
	if (!header) return null;
	const match = /^bytes=(\d*)-(\d*)$/u.exec(header.trim());
	if (!match) return null;
	if (match[1] === "" && match[2] === "") return null;
	if (match[1] === "") {
		// Suffix range: last N bytes.
		const suffix = Number(match[2]);
		if (!Number.isSafeInteger(suffix) || suffix <= 0) return null;
		const start = Math.max(0, size - suffix);
		return { end: size - 1, start };
	}
	const start = Number(match[1]);
	if (!Number.isSafeInteger(start) || start < 0) return null;
	if (match[2] === "") {
		if (start >= size) return null;
		return { end: size - 1, start };
	}
	const end = Number(match[2]);
	if (!Number.isSafeInteger(end) || end < start) return null;
	if (start >= size) return null;
	return { end: Math.min(end, size - 1), start };
}

function isUnsatisfiableRange(header: string | null, size: number): boolean {
	if (!header) return false;
	const match = /^bytes=(\d*)-(\d*)$/u.exec(header.trim());
	if (!match || match[1] === "") return false;
	const start = Number(match[1]);
	if (!Number.isSafeInteger(start) || start < 0) return false;
	if (match[2] === "") return start >= size;
	const end = Number(match[2]);
	if (!Number.isSafeInteger(end) || end < start) return false;
	return start >= size;
}

export const Route = createFileRoute("/api/cms/media")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				try {
					const mediaPath = new URL(request.url).searchParams.get("path");
					if (mediaPath) {
						const allowedRoot = mediaPath.startsWith("assets/") || mediaPath.startsWith("public/");
						const hasTraversal = mediaPath.split("/").includes("..");
						const contentType = MEDIA_TYPES[path.extname(mediaPath).toLowerCase()];
						if (!allowedRoot || hasTraversal || !contentType) {
							return Response.json(
								{ code: "VALIDATION", message: "not a media file" },
								{ status: 400 },
							);
						}
						const abs = resolveRepoPath(mediaPath);
						const file = Bun.file(abs);
						if (!(await file.exists())) {
							return Response.json({ code: "NOT_FOUND", message: "not found" }, { status: 404 });
						}
						const size = file.size;
						const headers: Record<string, string> = {
							"Accept-Ranges": "bytes",
							"Cache-Control": "private, max-age=60",
							"Content-Length": String(size),
							"Content-Type": contentType,
							"X-Content-Type-Options": "nosniff",
						};
						// Stream from disk (no readFile buffering) so video
						// responses never load the whole file into memory.
						const range = parseRange(request.headers.get("range"), size);
						if (range) {
							headers["Content-Length"] = String(range.end - range.start + 1);
							headers["Content-Range"] = `bytes ${range.start}-${range.end}/${size}`;
							return new Response(file.slice(range.start, range.end + 1), {
								headers,
								status: 206,
							});
						}
						// Malformed Range headers are ignored per RFC 7233 (→ 200);
						// only a syntactically valid but unsatisfiable range → 416.
						if (isUnsatisfiableRange(request.headers.get("range"), size)) {
							return new Response("Range Not Satisfiable", {
								headers: { "Content-Range": `bytes */${size}` },
								status: 416,
							});
						}
						return new Response(file, { headers });
					}
					return Response.json({ media: await listMedia() });
				} catch (e) {
					return jsonError(e);
				}
			},
			POST: async ({ request }) => {
				try {
					// Pre-check before formData() buffers the whole body: chunked
					// encoding has no Content-Length, so the post-check in
					// saveUpload stays as backstop.
					const declared = Number(request.headers.get("content-length"));
					if (Number.isFinite(declared) && declared > MAX_UPLOAD_BYTES) {
						return Response.json(
							{
								code: "VALIDATION",
								message: `Upload exceeds ${MAX_UPLOAD_BYTES / 1024 / 1024} MB cap`,
							},
							{ status: 413 },
						);
					}
					const form = await request.formData();
					const file = form.get("file");
					const slug = (form.get("slug") as string | null) ?? undefined;
					const dest = destSchema.safeParse(form.get("dest") ?? "assets");
					if (!dest.success)
						return Response.json(
							{ code: "VALIDATION", message: "dest must be assets or public" },
							{ status: 400 },
						);
					if (!(file instanceof File))
						return Response.json(
							{ code: "VALIDATION", message: "file required (multipart)" },
							{ status: 400 },
						);
					const buf = new Uint8Array(await file.arrayBuffer());
					const res = await saveUpload({
						bytes: buf,
						dest: dest.data,
						filename: file.name,
						mime: file.type || "application/octet-stream",
						slug,
					});
					return Response.json(res, { status: 201 });
				} catch (e) {
					return jsonError(e);
				}
			},
		},
	},
});
