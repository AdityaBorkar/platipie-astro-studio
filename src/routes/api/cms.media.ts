import { promises as fs } from "node:fs";
import path from "node:path";

import { createFileRoute } from "@tanstack/react-router";

import { fail, ok, queryParam } from "#/cms/api-helpers.ts";
import { resolveRepoPath } from "#/cms/config.ts";
import { listMedia, saveUpload } from "#/cms/media.ts";

const CONTENT_TYPES: Record<string, string> = {
	".avif": "image/avif",
	".gif": "image/gif",
	".ico": "image/x-icon",
	".jpeg": "image/jpeg",
	".jpg": "image/jpeg",
	".png": "image/png",
	".svg": "image/svg+xml",
	".webp": "image/webp",
};

export const Route = createFileRoute("/api/cms/media")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				try {
					const mediaPath = queryParam(request, "path");
					if (mediaPath) {
						const allowedRoot = mediaPath.startsWith("assets/") || mediaPath.startsWith("public/");
						const hasTraversal = mediaPath.split("/").includes("..");
						const contentType = CONTENT_TYPES[path.extname(mediaPath).toLowerCase()];
						if (!allowedRoot || hasTraversal || !contentType) {
							return ok({ code: "VALIDATION", message: "not a media file" }, 400);
						}
						const bytes = new Uint8Array(await fs.readFile(resolveRepoPath(mediaPath)));
						return new Response(bytes, {
							headers: {
								"Cache-Control": "private, max-age=60",
								"Content-Type": contentType,
								"X-Content-Type-Options": "nosniff",
							},
						});
					}
					return ok({ media: await listMedia() });
				} catch (e) {
					return fail(e);
				}
			},
			POST: async ({ request }) => {
				try {
					const form = await request.formData();
					const file = form.get("file");
					const slug = (form.get("slug") as string | null) ?? undefined;
					const dest = ((form.get("dest") as string | null) ?? "assets") as "assets" | "public";
					if (!(file instanceof File))
						return ok({ code: "VALIDATION", message: "file required (multipart)" }, 400);
					const buf = new Uint8Array(await file.arrayBuffer());
					const res = await saveUpload({
						bytes: buf,
						dest,
						filename: file.name,
						mime: file.type || "application/octet-stream",
						slug,
					});
					return ok(res, 201);
				} catch (e) {
					return fail(e);
				}
			},
		},
	},
});
