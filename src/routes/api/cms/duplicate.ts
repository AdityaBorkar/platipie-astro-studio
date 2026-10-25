import { createFileRoute } from "@tanstack/react-router";

import { fail, ok, readJson } from "#cms/api-helpers.ts";
import { duplicateEntry } from "#cms/save.ts";

export const Route = createFileRoute("/api/cms/duplicate")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				try {
					const body = await readJson<{ path: string }>(request);
					if (!body.path) return ok({ code: "VALIDATION", message: "path required" }, 400);
					return ok(await duplicateEntry(body.path), 201);
				} catch (e) {
					return fail(e);
				}
			},
		},
	},
});
