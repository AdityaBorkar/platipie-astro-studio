import path from "node:path";

import { createFileRoute } from "@tanstack/react-router";

import { fail, ok, queryParam } from "#cms/api-helpers.ts";
import { loadEntry } from "#cms/save.ts";
import { scoreEntry } from "#cms/seo.ts";

export const Route = createFileRoute("/api/cms/seo")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				try {
					const p = queryParam(request, "path");
					if (!p) return ok({ code: "VALIDATION", message: "path required" }, 400);
					const entry = await loadEntry(p);
					const slug = path.parse(p).name;
					return ok(scoreEntry(entry.frontmatter, entry.body, slug));
				} catch (e) {
					return fail(e);
				}
			},
		},
	},
});
