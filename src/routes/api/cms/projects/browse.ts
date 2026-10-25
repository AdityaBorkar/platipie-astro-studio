import { createFileRoute } from "@tanstack/react-router";

import { fail, ok, queryParam } from "#cms/api-helpers.ts";
import { browseDirectory } from "#cms/projects.ts";

export const Route = createFileRoute("/api/cms/projects/browse")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				try {
					return ok(await browseDirectory(queryParam(request, "path") ?? undefined));
				} catch (e) {
					return fail(e);
				}
			},
		},
	},
});
