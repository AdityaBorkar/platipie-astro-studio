import { createFileRoute } from "@tanstack/react-router";

import { fail, ok } from "#cms/api-helpers.ts";
import { getWorkspace } from "#cms/workspace.ts";

export const Route = createFileRoute("/api/cms/workspace")({
	server: {
		handlers: {
			GET: async () => {
				try {
					return ok(await getWorkspace());
				} catch (e) {
					return fail(e);
				}
			},
		},
	},
});
