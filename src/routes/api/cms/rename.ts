import { createFileRoute } from "@tanstack/react-router";

import { fail, ok, readJson } from "#cms/api-helpers.ts";
import { renameEntry } from "#cms/save.ts";

export const Route = createFileRoute("/api/cms/rename")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				try {
					const body = await readJson<{ path: string; newSlug: string }>(request);
					if (!body.path || !body.newSlug)
						return ok({ code: "VALIDATION", message: "path + newSlug required" }, 400);
					return ok(await renameEntry(body.path, body.newSlug));
				} catch (e) {
					return fail(e);
				}
			},
		},
	},
});
