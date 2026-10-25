import { createFileRoute } from "@tanstack/react-router";

import { fail, ok, readJson } from "#cms/api-helpers.ts";
import { listTrash, purgeExpiredTrash, restoreTrash } from "#cms/save.ts";

export const Route = createFileRoute("/api/cms/restore")({
	server: {
		handlers: {
			GET: async () => {
				try {
					const items = await listTrash();
					const purged = await purgeExpiredTrash().catch(() => ({ purged: 0 }));
					return ok({ purged: purged.purged, trash: items });
				} catch (e) {
					return fail(e);
				}
			},
			POST: async ({ request }) => {
				try {
					const body = await readJson<{ trashPath: string }>(request);
					if (!body.trashPath)
						return ok({ code: "VALIDATION", message: "trashPath required" }, 400);
					return ok(await restoreTrash(body.trashPath));
				} catch (e) {
					return fail(e);
				}
			},
		},
	},
});
