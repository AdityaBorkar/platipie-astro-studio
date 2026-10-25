import { createFileRoute } from "@tanstack/react-router";

import { fail, ok, queryParam, readJson } from "#cms/api-helpers.ts";
import { CmsError } from "#cms/errors.ts";
import { readPageSeo, readSchemaOptions, writePageSeo } from "#cms/page-seo.ts";
import type { PageSeoPatch } from "#cms/page-seo.ts";
import { syncScope } from "#cms/sync/index.ts";

export const Route = createFileRoute("/api/cms/page")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				try {
					const pagePath = queryParam(request, "path");
					if (!pagePath) return ok({ code: "VALIDATION", message: "path required" }, 400);
					const [page, options] = await Promise.all([readPageSeo(pagePath), readSchemaOptions()]);
					return ok({ ...page, options });
				} catch (e) {
					return fail(e);
				}
			},
			PUT: async ({ request }) => {
				try {
					const body = await readJson<{
						force?: boolean;
						mtime: number;
						path?: string;
						schema?: string[];
						seo?: PageSeoPatch;
					}>(request);
					if (!body.path) {
						throw new CmsError("VALIDATION", "path required", { status: 400 });
					}
					const patch: PageSeoPatch = { ...body.seo };
					if (body.schema !== undefined) patch.schema = body.schema;
					const res = await writePageSeo(body.path, patch, body.mtime, { force: body.force });
					// The source is already written; a mirror failure must not mask it.
					await syncScope("pages").catch(() => {});
					return ok(res);
				} catch (e) {
					return fail(e);
				}
			},
		},
	},
});
