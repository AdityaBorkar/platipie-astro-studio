import { createFileRoute } from "@tanstack/react-router";

import { clientIp, fail, ok, readJson } from "#cms/api-helpers.ts";
import { aiSuggest } from "#cms/seo.ts";

export const Route = createFileRoute("/api/cms/seo/ai")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				try {
					const body = await readJson<{
						action: "titles" | "excerpt" | "keywords";
						frontmatter?: Record<string, unknown>;
						body?: string;
					}>(request);
					if (!body.action) return ok({ code: "VALIDATION", message: "action required" }, 400);
					const res = await aiSuggest(
						body.action,
						body.frontmatter ?? {},
						body.body ?? "",
						clientIp(request),
					);
					return ok(res);
				} catch (e) {
					return fail(e);
				}
			},
		},
	},
});
