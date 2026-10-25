import { createFileRoute } from "@tanstack/react-router";

import { fail, ok } from "#cms/api-helpers.ts";
import { listMedia, saveUpload } from "#cms/media.ts";

export const Route = createFileRoute("/api/cms/media")({
	server: {
		handlers: {
			GET: async () => {
				try {
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
