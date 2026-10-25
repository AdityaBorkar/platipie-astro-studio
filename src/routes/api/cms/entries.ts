import { createFileRoute } from "@tanstack/react-router";

import { fail, ok, queryParam, readJson } from "#cms/api-helpers.ts";
import { listEntries } from "#cms/collections.ts";
import { createEntry } from "#cms/save.ts";
import type { CollectionId } from "#cms/schemas.ts";

export const Route = createFileRoute("/api/cms/entries")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				try {
					const collection = (queryParam(request, "collection") ?? "") as CollectionId;
					if (!collection) return ok({ error: "collection required" }, 400);
					const q = queryParam(request, "q") ?? "";
					let entries = await listEntries(collection);
					if (q) {
						const needle = q.toLowerCase();
						entries = entries.filter(
							(e) =>
								e.id.toLowerCase().includes(needle) ||
								(e.title ?? "").toLowerCase().includes(needle) ||
								e.path.toLowerCase().includes(needle),
						);
					}
					return ok({ collection, entries });
				} catch (e) {
					return fail(e);
				}
			},
			POST: async ({ request }) => {
				try {
					const body = await readJson<{
						collection: "projects" | "blog";
						slug: string;
						fromTemplate?: boolean;
						frontmatter?: Record<string, unknown>;
						body?: string;
						ext?: ".md" | ".mdx";
					}>(request);
					if (!body.collection || !body.slug)
						return ok({ code: "VALIDATION", message: "collection + slug required" }, 400);
					const res = await createEntry(body.collection, body.slug, {
						body: body.body,
						ext: body.ext,
						fromTemplate: body.fromTemplate,
						frontmatter: body.frontmatter,
					});
					return ok(res, 201);
				} catch (e) {
					return fail(e);
				}
			},
		},
	},
});
