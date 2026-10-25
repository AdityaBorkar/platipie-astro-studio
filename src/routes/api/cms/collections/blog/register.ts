import { createFileRoute } from "@tanstack/react-router";

import { fail, ok, readJson } from "#cms/api-helpers.ts";
import { blogRegistrationStatus, registerBlogCollection } from "#cms/blog-register.ts";

export const Route = createFileRoute("/api/cms/collections/blog/register")({
	server: {
		handlers: {
			GET: async () => {
				try {
					return ok(await blogRegistrationStatus());
				} catch (e) {
					return fail(e);
				}
			},
			POST: async ({ request }) => {
				try {
					const body = await readJson<{ widenGlobs?: boolean }>(request).catch(
						() => ({}) as { widenGlobs?: boolean },
					);
					return ok(await registerBlogCollection({ widenGlobs: body.widenGlobs }));
				} catch (e) {
					return fail(e);
				}
			},
		},
	},
});
